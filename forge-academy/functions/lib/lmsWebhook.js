import { getFirestore, FieldValue } from "firebase-admin/firestore";

function normalizeSecret(value) {
  return String(value ?? "").trim();
}

async function getLmsSettings() {
  const snap = await getFirestore().doc("systemSettings/default").get();
  const lms = snap.exists ? snap.data()?.lms ?? {} : {};
  return lms;
}

/**
 * Accept LMS completion webhook payloads:
 * { studentId, courseId, externalCourseId?, completedDate, score? }
 */
export async function handleLmsCompletionWebhook(body, secretHeader) {
  const settings = await getLmsSettings();
  if (!settings.enabled) {
    return { ok: false, status: 403, message: "LMS integration is disabled." };
  }

  const expectedSecret = normalizeSecret(settings.webhookSecret);
  if (expectedSecret && normalizeSecret(secretHeader) !== expectedSecret) {
    return { ok: false, status: 401, message: "Invalid webhook secret." };
  }

  const studentId = normalizeSecret(body.studentId);
  const courseId = normalizeSecret(body.courseId);
  const externalCourseId = normalizeSecret(body.externalCourseId);
  const completedDate = normalizeSecret(body.completedDate);
  const score = body.score == null || body.score === "" ? null : Number(body.score);

  if (!studentId || !completedDate) {
    return { ok: false, status: 400, message: "studentId and completedDate are required." };
  }

  const id = `${studentId}_${courseId || externalCourseId || "record"}`;
  await getFirestore()
    .doc(`lmsCompletions/${id}`)
    .set(
      {
        studentId,
        courseId,
        externalCourseId,
        completedDate,
        score,
        source: "webhook",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  if (settings.autoSyncEligibility) {
    await syncEligibilityForStudent(studentId, courseId || externalCourseId);
  }

  return { ok: true, status: 200, id };
}

async function syncEligibilityForStudent(studentId, courseId) {
  if (!courseId) return;
  const db = getFirestore();
  const [eligibilitySnap, classesSnap] = await Promise.all([
    db.collection("testEligibility").where("studentId", "==", studentId).get(),
    db.collection("classes").get(),
  ]);

  const classCourseMap = new Map(classesSnap.docs.map((doc) => [doc.id, doc.data()?.courseId ?? ""]));

  const batch = db.batch();
  let count = 0;
  for (const doc of eligibilitySnap.docs) {
    const data = doc.data();
    if (data.lmsMet) continue;
    const classCourseId = classCourseMap.get(data.classId);
    if (classCourseId !== courseId) continue;
    batch.update(doc.ref, { lmsMet: true, updatedAt: FieldValue.serverTimestamp() });
    count += 1;
  }

  if (count > 0) await batch.commit();
}

/** Queue grade passback — API mode posts to configured LMS URL when present. */
export async function processLmsGradePassback(logId) {
  const db = getFirestore();
  const logRef = db.doc(`lmsGradePassbackLog/${logId}`);
  const logSnap = await logRef.get();
  if (!logSnap.exists) return { skipped: true };

  const settings = await getLmsSettings();
  if (!settings.enabled || settings.gradePassbackMode !== "api") {
    return { skipped: true, reason: "API passback not enabled." };
  }

  const apiBaseUrl = normalizeSecret(settings.apiBaseUrl);
  if (!apiBaseUrl) {
    await logRef.set({ status: "failed", error: "Missing API base URL." }, { merge: true });
    return { ok: false };
  }

  const payload = logSnap.data();
  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/grade-passback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(settings.webhookSecret ? { "X-LMS-Secret": settings.webhookSecret } : {}),
      },
      body: JSON.stringify({
        studentId: payload.studentId,
        testResultId: logId,
        score: payload.score,
        passFail: payload.passFail,
      }),
    });

    if (!response.ok) {
      throw new Error(`LMS API responded with ${response.status}`);
    }

    await logRef.set({ status: "sent", sentAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  } catch (error) {
    await logRef.set(
      {
        status: "failed",
        error: error instanceof Error ? error.message : "Grade passback failed.",
      },
      { merge: true },
    );
    return { ok: false };
  }
}

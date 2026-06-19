import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  recalculateTestResult,
  writeAuditLog,
} from "./testGrading.js";

const db = () => getFirestore();
const ADMIN_ROLES = new Set(["academy_admin", "super_admin", "creator"]);
const GRADER_ROLES = new Set(["academy_admin", "super_admin", "instructor"]);

async function getUser(uid) {
  const snap = await db().doc(`users/${uid}`).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function assertGrader(uid) {
  const user = await getUser(uid);
  if (!user || !GRADER_ROLES.has(user.role)) {
    throw new HttpsError("permission-denied", "Grader access is required.");
  }
  return user;
}

async function assertAdmin(uid) {
  const user = await getUser(uid);
  if (!user || !ADMIN_ROLES.has(user.role)) {
    throw new HttpsError("permission-denied", "Admin access is required.");
  }
  return user;
}

export async function gradeManualQueueItem(uid, input) {
  await assertGrader(uid);
  const { queueItemId, pointsAwarded, graderNotes = "" } = input ?? {};
  if (!queueItemId) throw new HttpsError("invalid-argument", "queueItemId is required.");

  const ref = db().doc(`manualGradingQueue/${queueItemId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Queue item not found.");
  const item = snap.data();

  await ref.set(
    {
      pointsAwarded: Number(pointsAwarded ?? 0),
      graderNotes,
      status: "graded",
      gradedBy: uid,
      gradedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const resultId =
    item.classId && item.studentId
      ? `${item.classId}_${item.studentId}_${item.testId}`
      : null;

  if (resultId) {
    await recalculateTestResult(resultId);
  }

  await writeAuditLog({
    action: "manual_grade_entered",
    entityType: "manualGradingQueue",
    entityId: queueItemId,
    userId: uid,
    details: { pointsAwarded: Number(pointsAwarded ?? 0) },
  });

  return { ok: true };
}

export async function overrideTestScore(uid, input) {
  await assertAdmin(uid);
  const { testResultId, newScore, reason, overriddenByName = "" } = input ?? {};
  if (!testResultId || newScore == null || !reason?.trim()) {
    throw new HttpsError("invalid-argument", "testResultId, newScore, and reason are required.");
  }

  const resultRef = db().doc(`testResults/${testResultId}`);
  const snap = await resultRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Test result not found.");
  const prior = snap.data();
  const previousScore = Number(prior.percentage ?? prior.score ?? 0);
  const passingScore = Number(prior.passingScore ?? 70);
  const passFail = Number(newScore) >= passingScore ? "pass" : "fail";

  const overrideRef = await db().collection("scoreOverrides").add({
    testResultId,
    previousScore,
    newScore: Number(newScore),
    reason: reason.trim(),
    overriddenBy: uid,
    overriddenByName: overriddenByName.trim(),
    createdAt: FieldValue.serverTimestamp(),
  });

  await resultRef.set(
    {
      score: Number(newScore),
      percentage: Number(newScore),
      passFail,
      passed: passFail === "pass",
      status: passFail,
      overrideId: overrideRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeAuditLog({
    action: "score_overridden",
    entityType: "testResult",
    entityId: testResultId,
    userId: uid,
    details: { previousScore, newScore: Number(newScore), reason: reason.trim() },
  });

  return { ok: true, passFail };
}

export async function completeRemediation(uid, input) {
  await assertGrader(uid);
  const { remediationId, notes = "" } = input ?? {};
  if (!remediationId) throw new HttpsError("invalid-argument", "remediationId is required.");

  await db().doc(`remediationAssignments/${remediationId}`).set(
    {
      status: "completed",
      notes,
      completedBy: uid,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeAuditLog({
    action: "remediation_completed",
    entityType: "remediationAssignment",
    entityId: remediationId,
    userId: uid,
  });

  return { ok: true };
}

export async function requestRetest(uid, input) {
  const user = await getUser(uid);
  if (!user?.studentId) throw new HttpsError("permission-denied", "Student account required.");

  const { testId, classId = "", priorTestResultId, reason = "" } = input ?? {};
  if (!testId || !priorTestResultId) {
    throw new HttpsError("invalid-argument", "testId and priorTestResultId are required.");
  }

  const priorSnap = await db().doc(`testResults/${priorTestResultId}`).get();
  if (!priorSnap.exists) throw new HttpsError("not-found", "Prior result not found.");

  const ref = await db().collection("retestRequests").add({
    studentId: user.studentId,
    testId,
    classId,
    priorAttemptId: priorSnap.data().testAttemptId ?? "",
    priorTestResultId,
    attemptNumber: Number(priorSnap.data().attemptNumber ?? 1) + 1,
    reason,
    remediationRequired: true,
    remediationCompleted: false,
    status: "requested",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog({
    action: "retest_requested",
    entityType: "retestRequest",
    entityId: ref.id,
    userId: uid,
  });

  return { retestRequestId: ref.id };
}

export async function reviewRetestRequest(uid, input) {
  await assertAdmin(uid);
  const { retestRequestId, decision, denialReason = "" } = input ?? {};
  if (!retestRequestId || !["approved", "denied", "scheduled"].includes(decision)) {
    throw new HttpsError("invalid-argument", "retestRequestId and valid decision are required.");
  }

  await db().doc(`retestRequests/${retestRequestId}`).set(
    {
      status: decision,
      approvedBy: uid,
      approvedAt: FieldValue.serverTimestamp(),
      denialReason,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeAuditLog({
    action: decision === "approved" ? "retest_approved" : "retest_denied",
    entityType: "retestRequest",
    entityId: retestRequestId,
    userId: uid,
  });

  return { ok: true };
}

export async function reviewCertificateRelease(uid, input) {
  await assertAdmin(uid);
  const { queueItemId, decision, reviewNotes = "" } = input ?? {};
  if (!queueItemId || !["approved_for_release", "held", "denied"].includes(decision)) {
    throw new HttpsError("invalid-argument", "queueItemId and valid decision are required.");
  }

  const queueRef = db().doc(`certificateReleaseQueue/${queueItemId}`);
  const queueSnap = await queueRef.get();
  if (!queueSnap.exists) throw new HttpsError("not-found", "Queue item not found.");
  const queueItem = queueSnap.data();
  const now = FieldValue.serverTimestamp();

  await queueRef.set(
    {
      status: decision,
      reviewNotes,
      reviewedBy: uid,
      reviewedAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  if (decision === "approved_for_release" && queueItem.certificateId) {
    const certRef = db().doc(`certificates/${queueItem.certificateId}`);
    const certSnap = await certRef.get();
    if (certSnap.exists) {
      const cert = certSnap.data();
      await certRef.set({ status: "issued", releasedAt: now, updatedAt: now }, { merge: true });
      await db().doc(`publicCertificateLookup/${cert.validationCode}`).set(
        {
          certificateId: queueItem.certificateId,
          certificateNumber: cert.certificateNumber,
          studentName: cert.studentName,
          courseId: cert.courseId ?? "",
          courseName: cert.courseName,
          courseNumber: cert.courseNumber,
          templateId: cert.templateId ?? "",
          completionDate: cert.completionDate,
          hours: cert.hours,
          location: cert.location ?? "",
          status: "issued",
          updatedAt: now,
        },
        { merge: true },
      );
      await db().doc(`transcriptEntries/${queueItem.completionId}`).set(
        {
          completedDate: cert.completionDate,
          result: "Pass",
          certificateNumber: cert.certificateNumber,
          status: "released",
          releasedAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
      await db().doc(`completions/${queueItem.completionId}`).set(
        {
          status: "issued",
          certificateId: queueItem.certificateId,
          updatedAt: now,
        },
        { merge: true },
      );
      await queueRef.set({ status: "released", releasedAt: now }, { merge: true });
    }
  }

  await db().collection("certificateApprovals").add({
    queueItemId,
    certificateId: queueItem.certificateId ?? "",
    studentId: queueItem.studentId,
    classId: queueItem.classId,
    decision,
    reviewNotes,
    reviewedBy: uid,
    createdAt: now,
  });

  await writeAuditLog({
    action:
      decision === "approved_for_release"
        ? "certificate_released"
        : decision === "held"
          ? "certificate_held"
          : "certificate_denied",
    entityType: "certificateReleaseQueue",
    entityId: queueItemId,
    userId: uid,
  });

  return { ok: true };
}

export async function recordStateCertificationTest(uid, input) {
  await assertAdmin(uid);
  const { studentId, certificationType, examDate, score, passFail, attemptNumber = 1, documentationUrl = "" } =
    input ?? {};
  if (!studentId || !certificationType || !examDate) {
    throw new HttpsError("invalid-argument", "studentId, certificationType, and examDate are required.");
  }

  const ref = await db().collection("stateCertificationTests").add({
    studentId,
    certificationType,
    examDate,
    score: score == null ? null : Number(score),
    passFail: passFail || "pending",
    attemptNumber: Number(attemptNumber),
    documentationUrl,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog({
    action: "state_certification_recorded",
    entityType: "stateCertificationTest",
    entityId: ref.id,
    userId: uid,
    details: { studentId, certificationType, passFail: passFail || "pending" },
  });

  return { id: ref.id };
}

export async function submitChallengeTestRequest(uid, input) {
  const user = await getUser(uid);
  const isAdmin = user && ADMIN_ROLES.has(user.role);

  const {
    studentId: inputStudentId,
    studentName = "",
    requestType = "prior_experience",
    certificationTarget = "",
    documentationUrl = "",
    justification = "",
    testId = "",
  } = input ?? {};

  const studentId = isAdmin ? inputStudentId : user?.studentId;
  if (!studentId) {
    throw new HttpsError("permission-denied", "A linked student record is required.");
  }
  if (!certificationTarget?.trim() || !justification?.trim()) {
    throw new HttpsError("invalid-argument", "certificationTarget and justification are required.");
  }
  if (!["reciprocity", "prior_experience", "direct_certification"].includes(requestType)) {
    throw new HttpsError("invalid-argument", "Invalid requestType.");
  }

  let resolvedName = studentName;
  if (!resolvedName) {
    const studentSnap = await db().doc(`students/${studentId}`).get();
    if (studentSnap.exists) {
      const student = studentSnap.data();
      resolvedName = `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim();
    }
  }

  const ref = await db().collection("challengeTestRequests").add({
    studentId,
    studentName: resolvedName,
    requestType,
    certificationTarget: certificationTarget.trim(),
    documentationUrl: documentationUrl.trim(),
    justification: justification.trim(),
    testId,
    status: "requested",
    outcome: "",
    reviewNotes: "",
    reviewedBy: "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog({
    action: "challenge_test_requested",
    entityType: "challengeTestRequest",
    entityId: ref.id,
    userId: uid,
    details: { requestType, certificationTarget: certificationTarget.trim() },
  });

  return { id: ref.id };
}

export async function reviewChallengeTestRequest(uid, input) {
  await assertAdmin(uid);
  const { requestId, decision, reviewNotes = "", outcome = "" } = input ?? {};
  if (!requestId || !["approved", "denied", "completed"].includes(decision)) {
    throw new HttpsError("invalid-argument", "requestId and valid decision are required.");
  }

  await db().doc(`challengeTestRequests/${requestId}`).set(
    {
      status: decision,
      reviewNotes,
      outcome,
      reviewedBy: uid,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeAuditLog({
    action:
      decision === "approved"
        ? "challenge_test_approved"
        : decision === "completed"
          ? "challenge_test_completed"
          : "challenge_test_denied",
    entityType: "challengeTestRequest",
    entityId: requestId,
    userId: uid,
  });

  return { ok: true };
}

export async function getTestingDashboardMetrics(uid) {
  await assertAdmin(uid);
  const [
    manualPending,
    retestPending,
    remediationPending,
    certPending,
    certHeld,
    reviewAlerts,
    activeSessionsSnap,
    testResultsSnap,
    proctorAssignmentsSnap,
  ] = await Promise.all([
    db().collection("manualGradingQueue").where("status", "==", "pending").get(),
    db().collection("retestRequests").where("status", "==", "requested").get(),
    db().collection("remediationAssignments").where("status", "in", ["assigned", "in_progress"]).get(),
    db().collection("certificateReleaseQueue").where("status", "==", "pending_admin_review").get(),
    db().collection("certificateReleaseQueue").where("status", "==", "held").get(),
    db().collection("examReviewQueue").where("status", "==", "pending_review").get(),
    db().collection("testSessions").where("status", "in", ["in_progress", "paused"]).get(),
    db().collection("testResults").get(),
    db().collection("proctorAssignments").get(),
  ]);

  const activeSessions = activeSessionsSnap.docs.map((item) => item.data());
  const studentsTesting = new Set(activeSessions.map((item) => item.studentId).filter(Boolean)).size;
  const gradedResults = testResultsSnap.docs
    .map((item) => item.data())
    .filter((item) => item.passFail === "pass" || item.passFail === "fail");
  const passCount = gradedResults.filter((item) => item.passFail === "pass").length;
  const failCount = gradedResults.filter((item) => item.passFail === "fail").length;
  const gradedTotal = gradedResults.length;
  const averageScore =
    gradedTotal > 0
      ? Math.round(
          gradedResults.reduce((sum, item) => sum + Number(item.percentage ?? item.score ?? 0), 0) /
            gradedTotal,
        )
      : 0;

  const today = new Date().toISOString().slice(0, 10);
  const activeProctors = proctorAssignmentsSnap.docs.filter((item) => {
    const data = item.data();
    return data.assignmentDate === today || data.status === "active";
  }).length;

  const challengePending = (
    await db().collection("challengeTestRequests").where("status", "==", "requested").get()
  ).size;

  return {
    manualGradingPending: manualPending.size,
    retestsPendingApproval: retestPending.size,
    remediationPending: remediationPending.size,
    certificatesPendingRelease: certPending.size,
    certificatesHeld: certHeld.size,
    questionReviewAlerts: reviewAlerts.size,
    activeExams: activeSessions.length,
    studentsTesting,
    passRate: gradedTotal ? Math.round((passCount / gradedTotal) * 100) : 0,
    failureRate: gradedTotal ? Math.round((failCount / gradedTotal) * 100) : 0,
    averageScore,
    activeProctors,
    challengeTestsPending: challengePending,
    gradedResultsTotal: gradedTotal,
  };
}

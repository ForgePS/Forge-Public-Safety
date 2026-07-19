import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { resolveAcademyId } from "./academyTenancy.js";
import { getHubSettings } from "./hubClient.js";
import { pullRosterFromRms } from "./rmsWebhook.js";

function normalize(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Receive normalized commands from Integration Hub.
 * @param {Record<string, unknown>} body
 * @param {string} secretHeader
 * @param {string} bearerHeader
 */
export async function handleHubAcademyCommand(body, secretHeader, bearerHeader) {
  const settings = await getHubSettings();
  // Accept any of the Hub-related secrets saved in RMS Integration settings.
  const accepted = [
    settings.hubSecret,
    settings.hubBearerToken,
    settings.outboundSecret,
    settings.webhookSecret,
  ]
    .map((value) => normalize(value))
    .filter(Boolean);
  const bearer = normalize(bearerHeader).replace(/^Bearer\s+/i, "");
  const secret = normalize(secretHeader);

  if (accepted.length) {
    const ok = accepted.includes(secret) || accepted.includes(bearer);
    if (!ok) {
      return { ok: false, status: 401, message: "Invalid hub credentials." };
    }
  }

  const type = normalize(body?.type);
  if (type === "upsert_student") {
    const result = await upsertStudentFromHub(body);
    return { ok: true, status: 200, ...result };
  }

  if (type === "retarget_person") {
    const result = await retargetPersonFromHub(body);
    return { ok: true, status: 200, ...result };
  }

  if (type === "pull_roster") {
    const result = await pullRosterFromRms();
    return { ok: true, status: 200, action: "pull_roster", ...result };
  }

  return { ok: false, status: 400, message: `Unsupported command type: ${type || "(missing)"}` };
}

async function upsertStudentFromHub(command) {
  const db = getFirestore();
  const person = command.person && typeof command.person === "object" ? command.person : {};
  const forgePersonId = normalize(command.forgePersonId || person.forgePersonId || person.personId);
  const rmsPersonId = normalize(person.rmsPersonId);
  const email = normalizeEmail(person.email);
  const firstName = normalize(person.firstName);
  const lastName = normalize(person.lastName);

  if (!forgePersonId) {
    throw new Error("forgePersonId is required. Resolve identity via Hub before Academy upsert.");
  }
  if (!firstName || !lastName) {
    throw new Error("firstName and lastName are required.");
  }

  const existing = await findStudent(db, { forgePersonId, rmsPersonId, email });
  const now = FieldValue.serverTimestamp();
  const active = person.active !== false && person.status !== "inactive";
  const payload = {
    firstName,
    lastName,
    email,
    phone: normalize(person.phone),
    rank: normalize(person.rank),
    departmentId: normalize(person.departmentId || person.academyDepartmentId),
    departmentName: normalize(person.departmentName),
    rmsPersonId: rmsPersonId || null,
    forgePersonId: forgePersonId || null,
    forgeDepartmentId: normalize(command.forgeDepartmentId || person.forgeDepartmentId) || null,
    status: active ? "active" : "inactive",
    sourceRmsSync: true,
    sourceHubSync: true,
    hubCorrelationId: normalize(command.correlationId) || null,
    updatedAt: now,
  };

  if (existing) {
    await existing.ref.set(payload, { merge: true });
    if (forgePersonId && !existing.data()?.forgeAcademyStudentId) {
      // Dual-write forgeAcademyStudentId onto student for hub map completeness.
      await existing.ref.set({ forgeAcademyStudentId: existing.id }, { merge: true });
    }
    return { action: "updated", studentId: existing.id, forgePersonId };
  }

  const rmsSettingsSnap = await db.doc("systemSettings/default").get();
  const rms = rmsSettingsSnap.exists ? rmsSettingsSnap.data()?.rms ?? {} : {};
  if (rms.autoCreateStudents === false) {
    return { action: "skipped", forgePersonId };
  }

  const academyId = resolveAcademyId(rms.defaultAcademyId);
  const femaSid = normalize(person.femaSid) || (rmsPersonId ? `RMS-${rmsPersonId}` : `HUB-${forgePersonId || "unknown"}`);
  const ref = await db.collection("students").add({
    ...payload,
    forgeAcademyStudentId: "",
    dateOfBirth: normalize(person.dateOfBirth) || "1900-01-01",
    femaSid,
    employmentStatus: normalize(person.employmentStatus) || "career",
    emsLicense: normalize(person.emsLevel || person.ems),
    notes: "Imported via Forge Integration Hub.",
    academyId,
    createdAt: now,
  });
  await ref.set({ forgeAcademyStudentId: ref.id }, { merge: true });
  return { action: "created", studentId: ref.id, forgePersonId };
}

/**
 * After Hub identity merge: point loser-linked Academy students at survivor personId.
 * @param {Record<string, unknown>} command
 */
async function retargetPersonFromHub(command) {
  const db = getFirestore();
  const survivorPersonId = normalize(command.survivorPersonId || command.forgePersonId);
  const loserPersonId = normalize(command.loserPersonId);
  if (!survivorPersonId || !loserPersonId) {
    throw new Error("survivorPersonId and loserPersonId are required.");
  }

  const snap = await db.collection("students").where("forgePersonId", "==", loserPersonId).limit(50).get();
  const batch = db.batch();
  let updated = 0;
  for (const docSnap of snap.docs) {
    batch.set(
      docSnap.ref,
      {
        forgePersonId: survivorPersonId,
        mergedFromForgePersonId: loserPersonId,
        hubMergeId: normalize(command.mergeId) || null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    updated += 1;
  }
  if (updated) await batch.commit();
  return { action: "retargeted", survivorPersonId, loserPersonId, updated };
}

async function findStudent(db, { forgePersonId, rmsPersonId, email }) {
  if (forgePersonId) {
    const byForge = await db.collection("students").where("forgePersonId", "==", forgePersonId).limit(1).get();
    if (!byForge.empty) return byForge.docs[0];
  }
  if (rmsPersonId) {
    const byRms = await db.collection("students").where("rmsPersonId", "==", rmsPersonId).limit(1).get();
    if (!byRms.empty) return byRms.docs[0];
  }
  if (email) {
    const byEmail = await db.collection("students").where("email", "==", email).limit(1).get();
    if (!byEmail.empty) return byEmail.docs[0];
  }
  return null;
}

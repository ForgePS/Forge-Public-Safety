import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { writeAuditLog } from "./auditLogs.js";

const submissionsRef = collection(db, "moduleSubmissions");

function mapSubmission(id, data) {
  if (!data || typeof data !== "object") return null;
  return { id, ...data };
}

/** @param {string} moduleDefinitionId */
export async function listModuleSubmissions(moduleDefinitionId) {
  const snap = await getDocs(
    query(submissionsRef, where("moduleDefinitionId", "==", moduleDefinitionId), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((item) => mapSubmission(item.id, item.data())).filter(Boolean);
}

/** @param {string} submissionId */
export async function getModuleSubmission(submissionId) {
  const snap = await getDoc(doc(submissionsRef, submissionId));
  return snap.exists() ? mapSubmission(snap.id, snap.data()) : null;
}

/**
 * @param {{
 *   moduleDefinitionId: string,
 *   moduleKind: string,
 *   values: Record<string, unknown>,
 *   subjectLabel?: string,
 *   notes?: string,
 * }} input
 * @param {string} userId
 */
export async function createModuleSubmission(input, userId) {
  if (!input.moduleDefinitionId) throw new Error("Module definition is required.");

  const docRef = await addDoc(submissionsRef, {
    moduleDefinitionId: input.moduleDefinitionId,
    moduleKind: input.moduleKind ?? "custom",
    values: input.values ?? {},
    subjectLabel: input.subjectLabel?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    status: "submitted",
    submittedBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "module_submission_created",
    entityType: "moduleSubmission",
    entityId: docRef.id,
    userId,
    details: { moduleDefinitionId: input.moduleDefinitionId, moduleKind: input.moduleKind },
  });

  return docRef.id;
}

import { collection, doc, getDoc, getDocs, addDoc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "./firebase.js";
import { writeAuditLog } from "./auditLogs.js";

/**
 * @typedef {import('@forgeps/ai-builder/rms').defaultModuleDefinition} ModuleDefinition
 */

const modulesRef = collection(db, "moduleDefinitions");

function mapModule(id, data) {
  if (!data || typeof data !== "object") return null;
  return { id, ...data };
}

/** @returns {Promise<ModuleDefinition[]>} */
export async function listModuleDefinitions() {
  const snap = await getDocs(query(modulesRef, orderBy("name")));
  return snap.docs.map((item) => mapModule(item.id, item.data())).filter(Boolean);
}

/** @param {string} id */
export async function getModuleDefinition(id) {
  const snap = await getDoc(doc(modulesRef, id));
  return snap.exists() ? mapModule(snap.id, snap.data()) : null;
}

/** @param {Record<string, unknown>} input @param {string} userId */
export async function createModuleDefinition(input, userId) {
  const docRef = await addDoc(modulesRef, {
    ...input,
    product: input.product ?? "rms",
    status: input.status ?? "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
  });
  await writeAuditLog({
    action: "module_definition_created",
    entityType: "moduleDefinition",
    entityId: docRef.id,
    userId,
    details: { name: input.name, kind: input.kind },
  });
  return docRef.id;
}

/** @param {string} id @param {Record<string, unknown>} input @param {string} userId */
export async function updateModuleDefinition(id, input, userId) {
  await updateDoc(doc(modulesRef, id), { ...input, updatedAt: serverTimestamp(), updatedBy: userId });
  await writeAuditLog({
    action: "module_definition_updated",
    entityType: "moduleDefinition",
    entityId: id,
    userId,
    details: { name: input.name, kind: input.kind, status: input.status },
  });
}

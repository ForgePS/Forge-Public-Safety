import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { writeAuditLog } from "./auditLogs.js";

export const DEFAULT_QUESTION_POOL_NAMES = [
  "SCBA",
  "Ladders",
  "Fire Attack",
  "Search",
  "Ventilation",
  "Safety",
  "HazMat PPE",
  "Pump Operations",
  "Water Supply",
];

/**
 * @typedef {Object} QuestionPoolRecord
 * @property {string} id
 * @property {string} questionBankId
 * @property {string} courseId
 * @property {string} poolName
 * @property {string} description
 * @property {boolean} active
 * @property {number} questionCount
 */

const poolsRef = collection(db, "questionPools");

function mapPool(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    questionBankId: data.questionBankId ?? "",
    courseId: data.courseId ?? "",
    poolName: data.poolName ?? "",
    description: data.description ?? "",
    active: data.active !== false,
    questionCount: Number(data.questionCount ?? 0),
  };
}

/** @returns {Promise<QuestionPoolRecord[]>} */
export async function listQuestionPools() {
  const snap = await getDocs(query(poolsRef));
  return snap.docs.map((item) => mapPool(item.id, item.data())).filter(Boolean);
}

/** @param {string} questionBankId */
export async function listQuestionPoolsByBank(questionBankId) {
  if (!questionBankId) return [];
  const snap = await getDocs(query(poolsRef, where("questionBankId", "==", questionBankId)));
  return snap.docs
    .map((item) => mapPool(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.poolName.localeCompare(b.poolName));
}

/** @param {string} poolId */
export async function getQuestionPool(poolId) {
  const snap = await getDoc(doc(db, "questionPools", poolId));
  if (!snap.exists()) return null;
  return mapPool(snap.id, snap.data());
}

/** @param {string} questionBankId @param {string} poolName */
export async function findQuestionPoolByName(questionBankId, poolName) {
  const snap = await getDocs(
    query(
      poolsRef,
      where("questionBankId", "==", questionBankId),
      where("poolName", "==", poolName.trim()),
    ),
  );
  const row = snap.docs[0];
  return row ? mapPool(row.id, row.data()) : null;
}

/**
 * @param {Omit<QuestionPoolRecord, 'id' | 'questionCount'>} input
 * @param {string} userId
 */
export async function createQuestionPool(input, userId) {
  if (!input.poolName?.trim()) throw new Error("Pool name is required.");
  if (!input.questionBankId) throw new Error("Question bank is required.");

  const docRef = await addDoc(poolsRef, {
    questionBankId: input.questionBankId,
    courseId: input.courseId ?? "",
    poolName: input.poolName.trim(),
    description: input.description?.trim() ?? "",
    active: input.active !== false,
    questionCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "question_pool_created",
    entityType: "questionPool",
    entityId: docRef.id,
    details: { poolName: input.poolName.trim(), questionBankId: input.questionBankId },
    userId,
  });

  return docRef.id;
}

/** @param {string} poolId @param {Partial<QuestionPoolRecord>} input @param {string} userId */
export async function updateQuestionPool(poolId, input, userId) {
  await updateDoc(doc(db, "questionPools", poolId), {
    ...(input.poolName != null ? { poolName: input.poolName.trim() } : {}),
    ...(input.description != null ? { description: input.description.trim() } : {}),
    ...(input.active != null ? { active: Boolean(input.active) } : {}),
    updatedAt: serverTimestamp(),
  });
  await writeAuditLog({
    action: "question_pool_updated",
    entityType: "questionPool",
    entityId: poolId,
    userId,
  });
}

/** @param {string} poolId @param {number} delta */
export async function adjustQuestionPoolCount(poolId, delta) {
  const pool = await getQuestionPool(poolId);
  if (!pool) return;
  await updateDoc(doc(db, "questionPools", poolId), {
    questionCount: Math.max(0, pool.questionCount + delta),
    updatedAt: serverTimestamp(),
  });
}

/** @param {string} questionBankId @param {string} courseId @param {string} userId */
export async function seedDefaultQuestionPools(questionBankId, courseId, userId) {
  const existing = await listQuestionPoolsByBank(questionBankId);
  const existingNames = new Set(existing.map((item) => item.poolName.toLowerCase()));
  let created = 0;
  for (const poolName of DEFAULT_QUESTION_POOL_NAMES) {
    if (existingNames.has(poolName.toLowerCase())) continue;
    await createQuestionPool({ questionBankId, courseId, poolName, description: "", active: true }, userId);
    created += 1;
  }
  return created;
}

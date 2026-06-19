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

export const QUESTION_BANK_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

/**
 * @typedef {Object} QuestionBankRecord
 * @property {string} id
 * @property {string} name
 * @property {string} bankName
 * @property {string} courseId
 * @property {string} courseName
 * @property {string} description
 * @property {boolean} active
 * @property {string} createdBy
 * @property {number} questionCount
 * @property {string} status
 * @property {Array<{ id: string, text: string, choices: string[], correctIndex: number }>} questions
 */

const banksRef = collection(db, "questionBanks");

function mapBank(id, data) {
  if (!data || typeof data !== "object") return null;
  const legacyQuestions = Array.isArray(data.questions) ? data.questions : [];
  return {
    id,
    name: data.bankName ?? data.name ?? "",
    bankName: data.bankName ?? data.name ?? "",
    courseId: data.courseId ?? "",
    courseName: data.courseName ?? "",
    description: data.description ?? "",
    active: data.active !== false && (data.status ?? QUESTION_BANK_STATUSES.ACTIVE) !== QUESTION_BANK_STATUSES.INACTIVE,
    createdBy: data.createdBy ?? "",
    questionCount: Number(data.questionCount ?? legacyQuestions.length),
    status: data.status ?? QUESTION_BANK_STATUSES.ACTIVE,
    questions: legacyQuestions,
  };
}

/** @returns {Promise<QuestionBankRecord[]>} */
export async function listQuestionBanks() {
  const snap = await getDocs(query(banksRef));
  return snap.docs
    .map((item) => mapBank(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {string} courseId */
export async function listQuestionBanksByCourse(courseId) {
  if (!courseId) return [];
  const snap = await getDocs(query(banksRef, where("courseId", "==", courseId)));
  return snap.docs.map((item) => mapBank(item.id, item.data())).filter(Boolean);
}

/** @param {string} bankId */
export async function getQuestionBank(bankId) {
  const snap = await getDoc(doc(db, "questionBanks", bankId));
  if (!snap.exists()) return null;
  return mapBank(snap.id, snap.data());
}

/** @param {string} courseId @param {string} bankName */
export async function findQuestionBankByName(courseId, bankName) {
  const snap = await getDocs(query(banksRef, where("courseId", "==", courseId)));
  const match = snap.docs.find((item) => {
    const data = item.data();
    const name = (data.bankName ?? data.name ?? "").trim().toLowerCase();
    return name === bankName.trim().toLowerCase();
  });
  return match ? mapBank(match.id, match.data()) : null;
}

/**
 * @param {Omit<QuestionBankRecord, 'id' | 'questionCount'> & { questions?: QuestionBankRecord['questions'] }} input
 * @param {string} userId
 */
export async function createQuestionBank(input, userId = "") {
  if (!input.name?.trim() && !input.bankName?.trim()) throw new Error("Question bank name is required.");
  const bankName = (input.bankName ?? input.name).trim();

  const docRef = await addDoc(banksRef, {
    name: bankName,
    bankName,
    courseId: input.courseId ?? "",
    courseName: input.courseName ?? "",
    description: input.description?.trim() ?? "",
    questions: input.questions ?? [],
    questionCount: input.questions?.length ?? 0,
    active: input.active !== false,
    createdBy: userId,
    status: input.status || QUESTION_BANK_STATUSES.ACTIVE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "question_bank_created",
    entityType: "questionBank",
    entityId: docRef.id,
    details: { bankName, courseId: input.courseId ?? "" },
    userId,
  });

  return docRef.id;
}

/** @param {string} bankId @param {Partial<QuestionBankRecord>} input @param {string} [userId] */
export async function updateQuestionBank(bankId, input, userId = "") {
  const bankName = input.bankName ?? input.name;
  await updateDoc(doc(db, "questionBanks", bankId), {
    ...(bankName != null ? { name: bankName.trim(), bankName: bankName.trim() } : {}),
    ...(input.courseId != null ? { courseId: input.courseId } : {}),
    ...(input.courseName != null ? { courseName: input.courseName } : {}),
    ...(input.description != null ? { description: input.description.trim() } : {}),
    ...(input.questions != null ? { questions: input.questions } : {}),
    ...(input.status != null ? { status: input.status } : {}),
    ...(input.active != null ? { active: Boolean(input.active) } : {}),
    updatedAt: serverTimestamp(),
  });

  if (userId) {
    await writeAuditLog({
      action: "question_bank_updated",
      entityType: "questionBank",
      entityId: bankId,
      userId,
    });
  }
}

/** @param {string} bankId @param {number} delta */
export async function adjustQuestionBankCount(bankId, delta) {
  const bank = await getQuestionBank(bankId);
  if (!bank) return;
  await updateDoc(doc(db, "questionBanks", bankId), {
    questionCount: Math.max(0, bank.questionCount + delta),
    updatedAt: serverTimestamp(),
  });
}

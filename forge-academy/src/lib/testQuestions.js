import {
  addDoc,
  collection,
  deleteDoc,
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
import { adjustQuestionPoolCount } from "./questionPools.js";
import { adjustQuestionBankCount } from "./questionBanks.js";

export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple_choice",
  TRUE_FALSE: "true_false",
  MULTIPLE_SELECT: "multiple_select",
  SHORT_ANSWER: "short_answer",
  SCENARIO: "scenario",
};

export const QUESTION_TYPE_LABELS = {
  [QUESTION_TYPES.MULTIPLE_CHOICE]: "Multiple choice",
  [QUESTION_TYPES.TRUE_FALSE]: "True / false",
  [QUESTION_TYPES.MULTIPLE_SELECT]: "Multiple select",
  [QUESTION_TYPES.SHORT_ANSWER]: "Short answer",
  [QUESTION_TYPES.SCENARIO]: "Scenario",
};

export const QUESTION_DIFFICULTIES = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

/**
 * @typedef {Object} TestQuestionRecord
 * @property {string} id
 * @property {string} questionBankId
 * @property {string} questionPoolId
 * @property {string} courseId
 * @property {string} questionText
 * @property {string} questionType
 * @property {Array<{ id: string, text: string, isCorrect: boolean }>} answerOptions
 * @property {string} correctAnswerText
 * @property {string} explanation
 * @property {number} points
 * @property {string} difficulty
 * @property {string} category
 * @property {string[]} tags
 * @property {string} reference
 * @property {boolean} active
 * @property {boolean} flaggedForReview
 */

const questionsRef = collection(db, "testQuestions");

function normalizeAnswerOptions(value) {
  if (!Array.isArray(value)) return [];
  return value.map((option, index) => ({
    id: option?.id ?? `opt-${index + 1}`,
    text: option?.text ?? "",
    isCorrect: Boolean(option?.isCorrect),
  }));
}

function mapQuestion(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    questionBankId: data.questionBankId ?? "",
    questionPoolId: data.questionPoolId ?? "",
    courseId: data.courseId ?? "",
    questionText: data.questionText ?? "",
    questionType: data.questionType ?? QUESTION_TYPES.MULTIPLE_CHOICE,
    answerOptions: normalizeAnswerOptions(data.answerOptions),
    correctAnswerText: data.correctAnswerText ?? "",
    explanation: data.explanation ?? "",
    points: Number(data.points ?? 1),
    difficulty: data.difficulty ?? QUESTION_DIFFICULTIES.MEDIUM,
    category: data.category ?? "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    reference: data.reference ?? "",
    active: data.active !== false,
    flaggedForReview: Boolean(data.flaggedForReview),
  };
}

/** Strip answer keys for non-admin contexts (Sprint 10B preview). */
export function stripQuestionAnswers(question) {
  if (!question) return null;
  return {
    ...question,
    answerOptions: (question.answerOptions ?? []).map((option) => ({
      id: option.id,
      text: option.text,
    })),
    correctAnswerText: "",
    explanation: "",
  };
}

/** @param {string} questionBankId */
export async function listQuestionsByBank(questionBankId) {
  if (!questionBankId) return [];
  const snap = await getDocs(query(questionsRef, where("questionBankId", "==", questionBankId)));
  return snap.docs
    .map((item) => mapQuestion(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.questionText.localeCompare(b.questionText));
}

/** @param {string} questionPoolId */
export async function listQuestionsByPool(questionPoolId) {
  if (!questionPoolId) return [];
  const snap = await getDocs(query(questionsRef, where("questionPoolId", "==", questionPoolId)));
  return snap.docs.map((item) => mapQuestion(item.id, item.data())).filter(Boolean);
}

/** @param {string} questionId */
export async function getTestQuestion(questionId) {
  const snap = await getDoc(doc(db, "testQuestions", questionId));
  if (!snap.exists()) return null;
  return mapQuestion(snap.id, snap.data());
}

/** @param {Omit<TestQuestionRecord, 'id'>} input @param {string} userId */
export async function createTestQuestion(input, userId) {
  if (!input.questionText?.trim()) throw new Error("Question text is required.");
  if (!input.questionBankId) throw new Error("Question bank is required.");

  const docRef = await addDoc(questionsRef, {
    questionBankId: input.questionBankId,
    questionPoolId: input.questionPoolId ?? "",
    courseId: input.courseId ?? "",
    questionText: input.questionText.trim(),
    questionType: input.questionType || QUESTION_TYPES.MULTIPLE_CHOICE,
    answerOptions: normalizeAnswerOptions(input.answerOptions),
    correctAnswerText: input.correctAnswerText?.trim() ?? "",
    explanation: input.explanation?.trim() ?? "",
    points: Number(input.points ?? 1),
    difficulty: input.difficulty || QUESTION_DIFFICULTIES.MEDIUM,
    category: input.category?.trim() ?? "",
    tags: Array.isArray(input.tags) ? input.tags : [],
    reference: input.reference?.trim() ?? "",
    active: input.active !== false,
    flaggedForReview: Boolean(input.flaggedForReview),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await adjustQuestionBankCount(input.questionBankId, 1);
  if (input.questionPoolId) await adjustQuestionPoolCount(input.questionPoolId, 1);

  await writeAuditLog({
    action: "test_question_created",
    entityType: "testQuestion",
    entityId: docRef.id,
    details: { questionBankId: input.questionBankId, questionPoolId: input.questionPoolId ?? "" },
    userId,
  });

  return docRef.id;
}

/** @param {string} questionId @param {Partial<TestQuestionRecord>} input @param {string} userId */
export async function updateTestQuestion(questionId, input, userId) {
  const existing = await getTestQuestion(questionId);
  if (!existing) throw new Error("Question not found.");

  await updateDoc(doc(db, "testQuestions", questionId), {
    ...(input.questionText != null ? { questionText: input.questionText.trim() } : {}),
    ...(input.questionType != null ? { questionType: input.questionType } : {}),
    ...(input.questionPoolId != null ? { questionPoolId: input.questionPoolId } : {}),
    ...(input.answerOptions != null ? { answerOptions: normalizeAnswerOptions(input.answerOptions) } : {}),
    ...(input.correctAnswerText != null ? { correctAnswerText: input.correctAnswerText.trim() } : {}),
    ...(input.explanation != null ? { explanation: input.explanation.trim() } : {}),
    ...(input.points != null ? { points: Number(input.points) } : {}),
    ...(input.difficulty != null ? { difficulty: input.difficulty } : {}),
    ...(input.category != null ? { category: input.category.trim() } : {}),
    ...(input.tags != null ? { tags: input.tags } : {}),
    ...(input.reference != null ? { reference: input.reference.trim() } : {}),
    ...(input.active != null ? { active: Boolean(input.active) } : {}),
    ...(input.flaggedForReview != null ? { flaggedForReview: Boolean(input.flaggedForReview) } : {}),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "test_question_updated",
    entityType: "testQuestion",
    entityId: questionId,
    userId,
  });
}

/** @param {string} questionId @param {string} userId */
export async function deleteTestQuestion(questionId, userId) {
  const existing = await getTestQuestion(questionId);
  if (!existing) return;

  await deleteDoc(doc(db, "testQuestions", questionId));
  await adjustQuestionBankCount(existing.questionBankId, -1);
  if (existing.questionPoolId) await adjustQuestionPoolCount(existing.questionPoolId, -1);

  await writeAuditLog({
    action: "test_question_deleted",
    entityType: "testQuestion",
    entityId: questionId,
    userId,
  });
}

/**
 * Count active questions by pool and difficulty for blueprint validation.
 * @param {string} questionBankId
 */
export async function countQuestionsByPoolAndDifficulty(questionBankId) {
  const questions = await listQuestionsByBank(questionBankId);
  /** @type {Record<string, Record<string, number>>} */
  const counts = {};

  for (const question of questions) {
    if (!question.active) continue;
    const poolId = question.questionPoolId || "_unassigned";
    if (!counts[poolId]) counts[poolId] = { easy: 0, medium: 0, hard: 0, total: 0 };
    const bucket = counts[poolId];
    bucket.total += 1;
    if (question.difficulty === QUESTION_DIFFICULTIES.EASY) bucket.easy += 1;
    else if (question.difficulty === QUESTION_DIFFICULTIES.HARD) bucket.hard += 1;
    else bucket.medium += 1;
  }

  return counts;
}

/** @param {Omit<TestQuestionRecord, 'id'>[]} questions @param {string} userId */
export async function bulkCreateTestQuestions(questions, userId) {
  const ids = [];
  for (const question of questions) {
    ids.push(await createTestQuestion(question, userId));
  }
  return ids;
}

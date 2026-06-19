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
import { countQuestionsByPoolAndDifficulty } from "./testQuestions.js";

/**
 * @typedef {Object} BlueprintPoolRule
 * @property {string} questionPoolId
 * @property {number} numberOfQuestions
 * @property {{ easy?: number, medium?: number, hard?: number }} [difficultyMix]
 */

/**
 * @typedef {Object} TestBlueprintRecord
 * @property {string} id
 * @property {string} courseId
 * @property {string} courseName
 * @property {string} testName
 * @property {number} totalQuestions
 * @property {number} passingScore
 * @property {number | null} timeLimitMinutes
 * @property {BlueprintPoolRule[]} poolRules
 * @property {boolean} randomizeQuestions
 * @property {boolean} randomizeAnswers
 * @property {boolean} allowRetakes
 * @property {number | null} maxAttempts
 * @property {boolean} active
 */

const blueprintsRef = collection(db, "testBlueprints");

function normalizePoolRules(value) {
  if (!Array.isArray(value)) return [];
  return value.map((rule) => ({
    questionPoolId: rule?.questionPoolId ?? "",
    numberOfQuestions: Number(rule?.numberOfQuestions ?? 0),
    difficultyMix: rule?.difficultyMix ?? {},
  }));
}

function mapBlueprint(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    courseId: data.courseId ?? "",
    courseName: data.courseName ?? "",
    testName: data.testName ?? "",
    totalQuestions: Number(data.totalQuestions ?? 0),
    passingScore: Number(data.passingScore ?? 70),
    timeLimitMinutes: data.timeLimitMinutes == null ? null : Number(data.timeLimitMinutes),
    poolRules: normalizePoolRules(data.poolRules),
    randomizeQuestions: data.randomizeQuestions !== false,
    randomizeAnswers: data.randomizeAnswers !== false,
    allowRetakes: Boolean(data.allowRetakes),
    maxAttempts: data.maxAttempts == null ? null : Number(data.maxAttempts),
    active: data.active !== false,
  };
}

/** @returns {Promise<TestBlueprintRecord[]>} */
export async function listTestBlueprints() {
  const snap = await getDocs(query(blueprintsRef));
  return snap.docs
    .map((item) => mapBlueprint(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.testName.localeCompare(b.testName));
}

/** @param {string} courseId */
export async function listTestBlueprintsByCourse(courseId) {
  if (!courseId) return [];
  const snap = await getDocs(query(blueprintsRef, where("courseId", "==", courseId)));
  return snap.docs.map((item) => mapBlueprint(item.id, item.data())).filter(Boolean);
}

/** @param {string} blueprintId */
export async function getTestBlueprint(blueprintId) {
  const snap = await getDoc(doc(db, "testBlueprints", blueprintId));
  if (!snap.exists()) return null;
  return mapBlueprint(snap.id, snap.data());
}

/**
 * @param {TestBlueprintRecord} blueprint
 * @param {Record<string, { easy: number, medium: number, hard: number, total: number }>} poolCounts
 */
export function validateBlueprint(blueprint, poolCounts) {
  /** @type {string[]} */
  const errors = [];

  if (!blueprint.testName?.trim()) errors.push("Blueprint name is required.");
  if (!blueprint.courseId) errors.push("Course is required.");
  if (!blueprint.poolRules?.length) errors.push("Add at least one pool rule.");

  const configuredTotal = blueprint.poolRules.reduce(
    (sum, rule) => sum + Number(rule.numberOfQuestions ?? 0),
    0,
  );

  if (configuredTotal !== Number(blueprint.totalQuestions)) {
    errors.push(
      `Pool rules total ${configuredTotal} questions but blueprint expects ${blueprint.totalQuestions}.`,
    );
  }

  for (const rule of blueprint.poolRules) {
    if (!rule.questionPoolId) {
      errors.push("Each pool rule must reference a question pool.");
      continue;
    }
    const available = poolCounts[rule.questionPoolId]?.total ?? 0;
    if (available < rule.numberOfQuestions) {
      errors.push(
        `Pool ${rule.questionPoolId} only has ${available} active questions but blueprint requires ${rule.numberOfQuestions}.`,
      );
    }
  }

  return errors;
}

/** @param {Omit<TestBlueprintRecord, 'id'>} input @param {string} userId */
export async function createTestBlueprint(input, userId) {
  if (!input.testName?.trim()) throw new Error("Blueprint name is required.");
  if (!input.courseId) throw new Error("Course is required.");

  const docRef = await addDoc(blueprintsRef, {
    courseId: input.courseId,
    courseName: input.courseName ?? "",
    testName: input.testName.trim(),
    totalQuestions: Number(input.totalQuestions ?? 0),
    passingScore: Number(input.passingScore ?? 70),
    timeLimitMinutes: input.timeLimitMinutes == null ? null : Number(input.timeLimitMinutes),
    poolRules: normalizePoolRules(input.poolRules),
    randomizeQuestions: input.randomizeQuestions !== false,
    randomizeAnswers: input.randomizeAnswers !== false,
    allowRetakes: Boolean(input.allowRetakes),
    maxAttempts: input.maxAttempts == null ? null : Number(input.maxAttempts),
    active: input.active !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "test_blueprint_created",
    entityType: "testBlueprint",
    entityId: docRef.id,
    userId,
  });

  return docRef.id;
}

/** @param {string} blueprintId @param {Partial<TestBlueprintRecord>} input @param {string} userId */
export async function updateTestBlueprint(blueprintId, input, userId) {
  await updateDoc(doc(db, "testBlueprints", blueprintId), {
    ...(input.courseId != null ? { courseId: input.courseId } : {}),
    ...(input.courseName != null ? { courseName: input.courseName } : {}),
    ...(input.testName != null ? { testName: input.testName.trim() } : {}),
    ...(input.totalQuestions != null ? { totalQuestions: Number(input.totalQuestions) } : {}),
    ...(input.passingScore != null ? { passingScore: Number(input.passingScore) } : {}),
    ...(input.timeLimitMinutes != null
      ? { timeLimitMinutes: input.timeLimitMinutes == null ? null : Number(input.timeLimitMinutes) }
      : {}),
    ...(input.poolRules != null ? { poolRules: normalizePoolRules(input.poolRules) } : {}),
    ...(input.randomizeQuestions != null ? { randomizeQuestions: Boolean(input.randomizeQuestions) } : {}),
    ...(input.randomizeAnswers != null ? { randomizeAnswers: Boolean(input.randomizeAnswers) } : {}),
    ...(input.allowRetakes != null ? { allowRetakes: Boolean(input.allowRetakes) } : {}),
    ...(input.maxAttempts != null
      ? { maxAttempts: input.maxAttempts == null ? null : Number(input.maxAttempts) }
      : {}),
    ...(input.active != null ? { active: Boolean(input.active) } : {}),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "test_blueprint_updated",
    entityType: "testBlueprint",
    entityId: blueprintId,
    userId,
  });
}

/** @param {string} blueprintId @param {string} questionBankId @param {string} userId */
export async function validateBlueprintForPublish(blueprintId, questionBankId, userId) {
  const blueprint = await getTestBlueprint(blueprintId);
  if (!blueprint) throw new Error("Blueprint not found.");
  const poolCounts = await countQuestionsByPoolAndDifficulty(questionBankId);
  const errors = validateBlueprint(blueprint, poolCounts);
  if (errors.length) {
    await writeAuditLog({
      action: "test_blueprint_validation_failed",
      entityType: "testBlueprint",
      entityId: blueprintId,
      details: { errors },
      userId,
    });
  }
  return { blueprint, errors };
}

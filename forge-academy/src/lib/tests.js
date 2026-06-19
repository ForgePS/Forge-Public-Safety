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
import { getTestBlueprint, validateBlueprint, validateBlueprintForPublish } from "./testBlueprints.js";
import { countQuestionsByPoolAndDifficulty } from "./testQuestions.js";

export const TEST_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DRAFT: "draft",
  PUBLISHED: "published",
};

/**
 * @typedef {Object} TestRecord
 * @property {string} id
 * @property {string} name
 * @property {string} courseId
 * @property {string} courseName
 * @property {string} courseNumber
 * @property {string} testCategoryId
 * @property {string} testCategoryName
 * @property {string} questionBankId
 * @property {string} blueprintId
 * @property {number} passingScore
 * @property {number} maxScore
 * @property {number | null} timeLimitMinutes
 * @property {boolean} randomizeQuestions
 * @property {boolean} randomizeAnswers
 * @property {boolean} allowRetakes
 * @property {number | null} maxAttempts
 * @property {boolean} published
 * @property {string} status
 */

const testsRef = collection(db, "tests");

function mapTest(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    name: data.name ?? "",
    courseId: data.courseId ?? "",
    courseName: data.courseName ?? "",
    courseNumber: data.courseNumber ?? "",
    testCategoryId: data.testCategoryId ?? "",
    testCategoryName: data.testCategoryName ?? "",
    questionBankId: data.questionBankId ?? "",
    blueprintId: data.blueprintId ?? "",
    passingScore: Number(data.passingScore ?? 70),
    maxScore: Number(data.maxScore ?? 100),
    timeLimitMinutes: data.timeLimitMinutes == null ? null : Number(data.timeLimitMinutes),
    randomizeQuestions: data.randomizeQuestions !== false,
    randomizeAnswers: data.randomizeAnswers !== false,
    allowRetakes: Boolean(data.allowRetakes),
    maxAttempts: data.maxAttempts == null ? null : Number(data.maxAttempts),
    published: Boolean(data.published),
    status: data.status ?? TEST_STATUSES.ACTIVE,
  };
}

/** @returns {Promise<TestRecord[]>} */
export async function listTests() {
  const snap = await getDocs(query(testsRef));
  return snap.docs
    .map((item) => mapTest(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {string} courseId */
export async function listTestsByCourse(courseId) {
  if (!courseId) return [];
  const snap = await getDocs(
    query(testsRef, where("courseId", "==", courseId), where("status", "==", TEST_STATUSES.ACTIVE)),
  );
  return snap.docs.map((item) => mapTest(item.id, item.data())).filter(Boolean);
}

/** @param {string} testId */
export async function getTest(testId) {
  const snap = await getDoc(doc(db, "tests", testId));
  if (!snap.exists()) return null;
  return mapTest(snap.id, snap.data());
}

/**
 * @param {TestRecord} test
 * @param {Record<string, { total: number }>} [poolCounts]
 */
export function validateTestForPublish(test, poolCounts = {}) {
  /** @type {string[]} */
  const errors = [];
  if (!test.name?.trim()) errors.push("Test name is required.");
  if (!test.courseId) errors.push("Course is required.");
  if (!test.testCategoryId) errors.push("Test category is required.");
  if (!test.questionBankId) errors.push("Question bank is required.");
  if (!test.blueprintId) errors.push("Test blueprint is required.");

  if (test.blueprintId && Object.keys(poolCounts).length) {
    // Additional blueprint checks happen in publishTest via validateBlueprintForPublish
  }

  return errors;
}

/** @param {Omit<TestRecord, 'id' | 'published'>} input @param {string} userId */
export async function createTest(input, userId = "") {
  if (!input.name?.trim()) throw new Error("Test name is required.");
  if (!input.courseId) throw new Error("Course is required.");

  const docRef = await addDoc(testsRef, {
    name: input.name.trim(),
    courseId: input.courseId,
    courseName: input.courseName ?? "",
    courseNumber: input.courseNumber ?? "",
    testCategoryId: input.testCategoryId ?? "",
    testCategoryName: input.testCategoryName ?? "",
    questionBankId: input.questionBankId ?? "",
    blueprintId: input.blueprintId ?? "",
    passingScore: Number(input.passingScore ?? 70),
    maxScore: Number(input.maxScore ?? 100),
    timeLimitMinutes: input.timeLimitMinutes == null ? null : Number(input.timeLimitMinutes),
    randomizeQuestions: input.randomizeQuestions !== false,
    randomizeAnswers: input.randomizeAnswers !== false,
    allowRetakes: Boolean(input.allowRetakes),
    maxAttempts: input.maxAttempts == null ? null : Number(input.maxAttempts),
    published: false,
    status: input.status || TEST_STATUSES.DRAFT,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (userId) {
    await writeAuditLog({
      action: "test_created",
      entityType: "test",
      entityId: docRef.id,
      userId,
    });
  }

  return docRef.id;
}

/** @param {string} testId @param {Partial<TestRecord>} input @param {string} [userId] */
export async function updateTest(testId, input, userId = "") {
  await updateDoc(doc(db, "tests", testId), {
    ...(input.name != null ? { name: input.name.trim() } : {}),
    ...(input.courseId != null ? { courseId: input.courseId } : {}),
    ...(input.courseName != null ? { courseName: input.courseName } : {}),
    ...(input.courseNumber != null ? { courseNumber: input.courseNumber } : {}),
    ...(input.testCategoryId != null ? { testCategoryId: input.testCategoryId } : {}),
    ...(input.testCategoryName != null ? { testCategoryName: input.testCategoryName } : {}),
    ...(input.questionBankId != null ? { questionBankId: input.questionBankId } : {}),
    ...(input.blueprintId != null ? { blueprintId: input.blueprintId } : {}),
    ...(input.passingScore != null ? { passingScore: Number(input.passingScore) } : {}),
    ...(input.maxScore != null ? { maxScore: Number(input.maxScore) } : {}),
    ...(input.timeLimitMinutes != null
      ? { timeLimitMinutes: input.timeLimitMinutes == null ? null : Number(input.timeLimitMinutes) }
      : {}),
    ...(input.randomizeQuestions != null ? { randomizeQuestions: Boolean(input.randomizeQuestions) } : {}),
    ...(input.randomizeAnswers != null ? { randomizeAnswers: Boolean(input.randomizeAnswers) } : {}),
    ...(input.allowRetakes != null ? { allowRetakes: Boolean(input.allowRetakes) } : {}),
    ...(input.maxAttempts != null
      ? { maxAttempts: input.maxAttempts == null ? null : Number(input.maxAttempts) }
      : {}),
    ...(input.status != null ? { status: input.status } : {}),
    ...(input.published != null ? { published: Boolean(input.published) } : {}),
    updatedAt: serverTimestamp(),
  });

  if (userId) {
    await writeAuditLog({
      action: "test_updated",
      entityType: "test",
      entityId: testId,
      userId,
    });
  }
}

/** @param {string} testId @param {string} userId */
export async function publishTest(testId, userId) {
  const test = await getTest(testId);
  if (!test) throw new Error("Test not found.");

  const baseErrors = validateTestForPublish(test);
  if (baseErrors.length) throw new Error(baseErrors.join(" "));

  if (!test.blueprintId || !test.questionBankId) {
    throw new Error("Blueprint and question bank are required before publishing.");
  }

  const { errors } = await validateBlueprintForPublish(test.blueprintId, test.questionBankId, userId);
  if (errors.length) throw new Error(errors.join(" "));

  await updateTest(
    testId,
    {
      published: true,
      status: TEST_STATUSES.ACTIVE,
    },
    userId,
  );

  await writeAuditLog({
    action: "test_published",
    entityType: "test",
    entityId: testId,
    userId,
  });
}

/** @param {string} testId @param {string} userId */
export async function unpublishTest(testId, userId) {
  await updateTest(
    testId,
    {
      published: false,
      status: TEST_STATUSES.DRAFT,
    },
    userId,
  );
  await writeAuditLog({
    action: "test_unpublished",
    entityType: "test",
    entityId: testId,
    userId,
  });
}

/** @param {string} blueprintId @param {string} questionBankId */
export async function getTestPublishPreview(blueprintId, questionBankId) {
  const blueprint = await getTestBlueprint(blueprintId);
  const poolCounts = await countQuestionsByPoolAndDifficulty(questionBankId);
  if (!blueprint) return { errors: ["Blueprint not found."], blueprint: null };
  return { blueprint, errors: validateBlueprint(blueprint, poolCounts) };
}

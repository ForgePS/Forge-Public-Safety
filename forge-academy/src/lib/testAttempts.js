import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { getClassSession } from "./classes.js";
import { getCourse } from "./courses.js";
import { getRequiredTestsForCourse } from "./courseTests.js";
import { listEnrolledRegistrationsByClass } from "./registrations.js";

export const TEST_ATTEMPT_STATUSES = {
  PENDING: "pending",
  PASS: "pass",
  FAIL: "fail",
  RETEST: "retest",
};

export const TEST_ATTEMPT_STATUS_LABELS = {
  [TEST_ATTEMPT_STATUSES.PENDING]: "Pending",
  [TEST_ATTEMPT_STATUSES.PASS]: "Pass",
  [TEST_ATTEMPT_STATUSES.FAIL]: "Fail",
  [TEST_ATTEMPT_STATUSES.RETEST]: "Retest required",
};

/**
 * @typedef {Object} TestAttemptRecord
 * @property {string} id
 * @property {string} classId
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} testId
 * @property {string} testName
 * @property {number} score
 * @property {number} maxScore
 * @property {number} passingScore
 * @property {boolean} passed
 * @property {string} status
 * @property {number} attemptNumber
 * @property {string} enteredByUid
 * @property {string} sessionDate
 * @property {string} notes
 */

/**
 * @typedef {Object} TestResultRecord
 * @property {string} id
 * @property {string} classId
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} testId
 * @property {string} testName
 * @property {number} score
 * @property {number} maxScore
 * @property {number} passingScore
 * @property {boolean} passed
 * @property {string} status
 * @property {number} attemptCount
 */

const attemptsRef = collection(db, "testAttempts");
const resultsRef = collection(db, "testResults");

/** @param {string} classId @param {string} studentId @param {string} testId */
export function testResultId(classId, studentId, testId) {
  return `${classId}_${studentId}_${testId}`;
}

function mapAttempt(id, data) {
  if (!data || typeof data !== "object") return null;
  if (data.deliveryMode === "online") {
    return {
      id,
      deliveryMode: "online",
      classId: data.classId ?? "",
      studentId: data.studentId ?? "",
      studentName: data.studentName ?? "",
      testId: data.testId ?? "",
      testName: data.testName ?? "",
      testVersionId: data.testVersionId ?? "",
      assignmentId: data.assignmentId ?? "",
      sessionId: data.sessionId ?? "",
      status: data.status ?? "in_progress",
      timeRemainingSeconds: data.timeRemainingSeconds ?? null,
      answers: Array.isArray(data.answers) ? data.answers : [],
      flaggedQuestionIds: Array.isArray(data.flaggedQuestionIds) ? data.flaggedQuestionIds : [],
      resultSummary: data.resultSummary ?? null,
      submittedAt: data.submittedAt ?? null,
    };
  }
  return {
    id,
    deliveryMode: "manual",
    classId: data.classId ?? "",
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    testId: data.testId ?? "",
    testName: data.testName ?? "",
    score: Number(data.score ?? 0),
    maxScore: Number(data.maxScore ?? 100),
    passingScore: Number(data.passingScore ?? 70),
    passed: Boolean(data.passed),
    status: data.status ?? TEST_ATTEMPT_STATUSES.PENDING,
    attemptNumber: Number(data.attemptNumber ?? 1),
    enteredByUid: data.enteredByUid ?? "",
    sessionDate: data.sessionDate ?? "",
    notes: data.notes ?? "",
  };
}

function mapResult(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    classId: data.classId ?? "",
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    testId: data.testId ?? "",
    testName: data.testName ?? "",
    score: Number(data.score ?? 0),
    maxScore: Number(data.maxScore ?? 100),
    passingScore: Number(data.passingScore ?? 70),
    passed: Boolean(data.passed),
    status: data.status ?? TEST_ATTEMPT_STATUSES.PENDING,
    attemptCount: Number(data.attemptCount ?? 0),
  };
}

/** @param {string} classId */
export async function listTestAttemptsByClass(classId) {
  if (!classId) return [];
  const snap = await getDocs(query(attemptsRef, where("classId", "==", classId)));
  return snap.docs
    .map((item) => mapAttempt(item.id, item.data()))
    .filter(Boolean)
    .filter((item) => item.deliveryMode !== "online" || item.status === "submitted");
}

/** @param {string} studentId */
export async function listTestAttemptsByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(attemptsRef, where("studentId", "==", studentId)));
  return snap.docs
    .map((item) => mapAttempt(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
}

/** @param {string} classId @param {string} studentId */
export async function listTestResultsByClassStudent(classId, studentId) {
  if (!classId || !studentId) return [];
  const snap = await getDocs(
    query(resultsRef, where("classId", "==", classId), where("studentId", "==", studentId)),
  );
  return snap.docs.map((item) => mapResult(item.id, item.data())).filter(Boolean);
}

/** @param {string} studentId */
export async function listTestResultsByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(resultsRef, where("studentId", "==", studentId)));
  return snap.docs.map((item) => mapResult(item.id, item.data())).filter(Boolean);
}

/** @param {string} classId @param {string} studentId */
export async function studentMeetsTestRequirements(classId, studentId) {
  const classSession = await getClassSession(classId);
  if (!classSession) return false;

  const course = await getCourse(classSession.courseId);
  if (!course?.testRequired) return true;

  const tests = await getRequiredTestsForCourse(course);
  if (!tests.length) return false;

  const results = await listTestResultsByClassStudent(classId, studentId);
  return tests.every((test) => results.some((result) => result.testId === test.id && result.passed));
}

/** @param {string} classId @param {string} studentId */
export async function getStudentTestSummary(classId, studentId) {
  const results = await listTestResultsByClassStudent(classId, studentId);
  return {
    total: results.length,
    passed: results.filter((item) => item.passed).length,
    failed: results.filter((item) => !item.passed && item.status !== TEST_ATTEMPT_STATUSES.PENDING).length,
    pending: results.filter((item) => item.status === TEST_ATTEMPT_STATUSES.PENDING).length,
  };
}

/** @param {string} classId */
export async function initializeClassTestResults(classId) {
  const classSession = await getClassSession(classId);
  if (!classSession) throw new Error("Class session not found.");

  const course = await getCourse(classSession.courseId);
  if (!course?.testRequired) {
    throw new Error("This course is not configured to require a written test.");
  }

  const tests = await getRequiredTestsForCourse(course);
  if (!tests.length) {
    throw new Error("No active tests found for this course.");
  }

  const enrolled = await listEnrolledRegistrationsByClass(classId);
  let created = 0;

  for (const registration of enrolled) {
    for (const test of tests) {
      const id = testResultId(classId, registration.studentId, test.id);
      const existing = await getDoc(doc(db, "testResults", id));
      if (existing.exists()) continue;

      await setDoc(doc(db, "testResults", id), {
        classId,
        studentId: registration.studentId,
        studentName: registration.studentName,
        testId: test.id,
        testName: test.name,
        score: 0,
        maxScore: test.maxScore,
        passingScore: test.passingScore,
        passed: false,
        status: TEST_ATTEMPT_STATUSES.PENDING,
        attemptCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      created += 1;
    }
  }

  return { created, tests: tests.length, students: enrolled.length };
}

/**
 * @param {{ classId: string, studentId: string, studentName: string, testId: string, score: number, notes?: string, enteredByUid: string, sessionDate?: string }} input
 */
export async function submitTestScore(input) {
  const test = await getDoc(doc(db, "tests", input.testId));
  if (!test.exists()) throw new Error("Test not found.");

  const testData = test.data();
  const maxScore = Number(testData.maxScore ?? 100);
  const passingScore = Number(testData.passingScore ?? 70);
  const score = Number(input.score ?? 0);
  const passed = score >= passingScore;
  const status = passed ? TEST_ATTEMPT_STATUSES.PASS : TEST_ATTEMPT_STATUSES.FAIL;
  const sessionDate = input.sessionDate || new Date().toISOString().slice(0, 10);

  const priorResults = await listTestResultsByClassStudent(input.classId, input.studentId);
  const prior = priorResults.find((item) => item.testId === input.testId);
  const attemptNumber = (prior?.attemptCount ?? 0) + 1;

  await addDoc(attemptsRef, {
    deliveryMode: "manual",
    classId: input.classId,
    studentId: input.studentId,
    studentName: input.studentName,
    testId: input.testId,
    testName: testData.name ?? "",
    score,
    maxScore,
    passingScore,
    passed,
    status,
    attemptNumber,
    enteredByUid: input.enteredByUid,
    sessionDate,
    notes: input.notes?.trim() ?? "",
    createdAt: serverTimestamp(),
  });

  const resultId = testResultId(input.classId, input.studentId, input.testId);
  await setDoc(
    doc(db, "testResults", resultId),
    {
      classId: input.classId,
      studentId: input.studentId,
      studentName: input.studentName,
      testId: input.testId,
      testName: testData.name ?? "",
      score,
      maxScore,
      passingScore,
      passed,
      status,
      attemptCount: attemptNumber,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return { passed, status, attemptNumber };
}

/** @param {string} classId */
export async function summarizeClassTestDashboard(classId) {
  const [attempts, classSession] = await Promise.all([
    listTestAttemptsByClass(classId),
    getClassSession(classId),
  ]);

  if (!classSession) return [];

  const resultsSnap = await getDocs(query(resultsRef, where("classId", "==", classId)));
  const results = resultsSnap.docs.map((item) => mapResult(item.id, item.data())).filter(Boolean);
  const byStudent = new Map();

  for (const result of results) {
    if (!byStudent.has(result.studentId)) {
      byStudent.set(result.studentId, {
        studentId: result.studentId,
        studentName: result.studentName,
        results: [],
        attempts: [],
      });
    }
    byStudent.get(result.studentId).results.push(result);
  }

  for (const attempt of attempts) {
    if (!byStudent.has(attempt.studentId)) continue;
    byStudent.get(attempt.studentId).attempts.push(attempt);
  }

  return [...byStudent.values()].sort((a, b) => a.studentName.localeCompare(b.studentName));
}

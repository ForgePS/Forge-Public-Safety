import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";

/**
 * @typedef {Object} TestAssignmentRecord
 * @property {string} id
 * @property {string} testId
 * @property {string} testName
 * @property {string} testVersionId
 * @property {string} classId
 * @property {string} studentId
 * @property {string} openDate
 * @property {string} closeDate
 * @property {string} status
 * @property {boolean} restartAllowed
 * @property {boolean} showResultSummary
 */

/** @param {string} studentId */
export async function listAssignmentsForStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(collection(db, "testAssignments"), where("studentId", "==", studentId)));
  return snap.docs.map((item) => mapAssignment(item.id, item.data())).filter(Boolean);
}

/** @returns {Promise<TestAssignmentRecord[]>} */
export async function listTestAssignments() {
  const snap = await getDocs(query(collection(db, "testAssignments")));
  return snap.docs
    .map((item) => mapAssignment(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => b.openDate.localeCompare(a.openDate));
}

/** @param {string} testId */
export async function listTestAssignmentsByTest(testId) {
  if (!testId) return [];
  const snap = await getDocs(query(collection(db, "testAssignments"), where("testId", "==", testId)));
  return snap.docs.map((item) => mapAssignment(item.id, item.data())).filter(Boolean);
}

function mapAssignment(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    testId: data.testId ?? "",
    testName: data.testName ?? "",
    testVersionId: data.testVersionId ?? "",
    classId: data.classId ?? "",
    studentId: data.studentId ?? "",
    openDate: data.openDate ?? "",
    closeDate: data.closeDate ?? "",
    status: data.status ?? "assigned",
    restartAllowed: Boolean(data.restartAllowed),
    showResultSummary: data.showResultSummary !== false,
  };
}

export function assignmentIsOpen(assignment) {
  const today = new Date().toISOString().slice(0, 10);
  if (assignment.openDate && today < assignment.openDate) return false;
  if (assignment.closeDate && today > assignment.closeDate) return false;
  return assignment.status !== "cancelled";
}

/** @param {string} studentId @param {string[]} enrolledClassIds */
export async function listVisibleAssignmentsForStudent(studentId, enrolledClassIds = []) {
  const all = await listTestAssignments();
  const classSet = new Set(enrolledClassIds);
  return all.filter(
    (assignment) =>
      assignment.studentId === studentId ||
      (!assignment.studentId && assignment.classId && classSet.has(assignment.classId)),
  );
}

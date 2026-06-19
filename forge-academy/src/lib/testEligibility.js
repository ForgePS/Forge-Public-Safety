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

/**
 * @typedef {Object} TestEligibilityRecord
 * @property {string} id
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} classId
 * @property {string} testId
 * @property {string} testName
 * @property {boolean} attendanceMet
 * @property {boolean} skillsMet
 * @property {boolean} lmsMet
 * @property {boolean | null} tuitionPaid
 * @property {boolean} instructorApproved
 * @property {boolean} approvedToTest
 * @property {string} denialReason
 */

const eligibilityRef = collection(db, "testEligibility");

function mapEligibility(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    classId: data.classId ?? "",
    testId: data.testId ?? "",
    testName: data.testName ?? "",
    attendanceMet: Boolean(data.attendanceMet),
    skillsMet: Boolean(data.skillsMet),
    lmsMet: Boolean(data.lmsMet),
    tuitionPaid: data.tuitionPaid == null ? null : Boolean(data.tuitionPaid),
    instructorApproved: Boolean(data.instructorApproved),
    approvedToTest: Boolean(data.approvedToTest),
    denialReason: data.denialReason ?? "",
  };
}

/** @returns {Promise<TestEligibilityRecord[]>} */
export async function listTestEligibility() {
  const snap = await getDocs(query(eligibilityRef));
  return snap.docs.map((item) => mapEligibility(item.id, item.data())).filter(Boolean);
}

/** @param {string} classId */
export async function listTestEligibilityByClass(classId) {
  if (!classId) return [];
  const snap = await getDocs(query(eligibilityRef, where("classId", "==", classId)));
  return snap.docs.map((item) => mapEligibility(item.id, item.data())).filter(Boolean);
}

/** @param {string} eligibilityId */
export async function getTestEligibility(eligibilityId) {
  const snap = await getDoc(doc(db, "testEligibility", eligibilityId));
  if (!snap.exists()) return null;
  return mapEligibility(snap.id, snap.data());
}

/** @param {Omit<TestEligibilityRecord, 'id'>} input @param {string} userId */
export async function createTestEligibility(input, userId) {
  if (!input.studentId || !input.testId) throw new Error("Student and test are required.");

  const docRef = await addDoc(eligibilityRef, {
    studentId: input.studentId,
    studentName: input.studentName ?? "",
    classId: input.classId ?? "",
    testId: input.testId,
    testName: input.testName ?? "",
    attendanceMet: Boolean(input.attendanceMet),
    skillsMet: Boolean(input.skillsMet),
    lmsMet: Boolean(input.lmsMet),
    tuitionPaid: input.tuitionPaid == null ? null : Boolean(input.tuitionPaid),
    instructorApproved: Boolean(input.instructorApproved),
    approvedToTest: Boolean(input.approvedToTest),
    denialReason: input.denialReason?.trim() ?? "",
    checkedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "test_eligibility_created",
    entityType: "testEligibility",
    entityId: docRef.id,
    userId,
  });

  return docRef.id;
}

/** @param {string} eligibilityId @param {Partial<TestEligibilityRecord>} input @param {string} userId */
export async function updateTestEligibility(eligibilityId, input, userId) {
  await updateDoc(doc(db, "testEligibility", eligibilityId), {
    ...(input.attendanceMet != null ? { attendanceMet: Boolean(input.attendanceMet) } : {}),
    ...(input.skillsMet != null ? { skillsMet: Boolean(input.skillsMet) } : {}),
    ...(input.lmsMet != null ? { lmsMet: Boolean(input.lmsMet) } : {}),
    ...(input.tuitionPaid != null ? { tuitionPaid: input.tuitionPaid == null ? null : Boolean(input.tuitionPaid) } : {}),
    ...(input.instructorApproved != null ? { instructorApproved: Boolean(input.instructorApproved) } : {}),
    ...(input.approvedToTest != null ? { approvedToTest: Boolean(input.approvedToTest) } : {}),
    ...(input.denialReason != null ? { denialReason: input.denialReason.trim() } : {}),
    checkedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "test_eligibility_updated",
    entityType: "testEligibility",
    entityId: eligibilityId,
    userId,
  });
}

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { writeAuditLog } from "./auditLogs.js";

export const PROCTOR_ROLES = {
  LEAD: "lead",
  ASSISTANT: "assistant",
};

/**
 * @typedef {Object} ProctorAssignmentRecord
 * @property {string} id
 * @property {string} testId
 * @property {string} testName
 * @property {string} testingWindowId
 * @property {string} instructorId
 * @property {string} instructorName
 * @property {string} role
 * @property {string} assignedBy
 */

const assignmentsRef = collection(db, "proctorAssignments");

function mapAssignment(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    testId: data.testId ?? "",
    testName: data.testName ?? "",
    testingWindowId: data.testingWindowId ?? "",
    instructorId: data.instructorId ?? "",
    instructorName: data.instructorName ?? "",
    role: data.role ?? PROCTOR_ROLES.ASSISTANT,
    assignedBy: data.assignedBy ?? "",
  };
}

/** @returns {Promise<ProctorAssignmentRecord[]>} */
export async function listProctorAssignments() {
  const snap = await getDocs(query(assignmentsRef));
  return snap.docs.map((item) => mapAssignment(item.id, item.data())).filter(Boolean);
}

/** @param {string} testId */
export async function listProctorAssignmentsByTest(testId) {
  if (!testId) return [];
  const snap = await getDocs(query(assignmentsRef, where("testId", "==", testId)));
  return snap.docs.map((item) => mapAssignment(item.id, item.data())).filter(Boolean);
}

/** @param {Omit<ProctorAssignmentRecord, 'id'>} input @param {string} userId */
export async function createProctorAssignment(input, userId) {
  if (!input.testId || !input.instructorId) throw new Error("Test and instructor are required.");

  const docRef = await addDoc(assignmentsRef, {
    testId: input.testId,
    testName: input.testName ?? "",
    testingWindowId: input.testingWindowId ?? "",
    instructorId: input.instructorId,
    instructorName: input.instructorName ?? "",
    role: input.role || PROCTOR_ROLES.ASSISTANT,
    assignedBy: userId,
    assignedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "proctor_assigned",
    entityType: "proctorAssignment",
    entityId: docRef.id,
    userId,
  });

  return docRef.id;
}

/** @param {string} assignmentId @param {string} userId */
export async function deleteProctorAssignment(assignmentId, userId) {
  await deleteDoc(doc(db, "proctorAssignments", assignmentId));
  await writeAuditLog({
    action: "proctor_unassigned",
    entityType: "proctorAssignment",
    entityId: assignmentId,
    userId,
  });
}

/** @param {string} assignmentId */
export async function getProctorAssignment(assignmentId) {
  const snap = await getDoc(doc(db, "proctorAssignments", assignmentId));
  if (!snap.exists()) return null;
  return mapAssignment(snap.id, snap.data());
}

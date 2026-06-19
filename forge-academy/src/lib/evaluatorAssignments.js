import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";

/**
 * @typedef {Object} EvaluatorAssignmentRecord
 * @property {string} id
 * @property {string} classId
 * @property {string} stationId
 * @property {string} evaluatorUserId
 * @property {string} evaluatorName
 */

const assignmentsRef = collection(db, "evaluatorAssignments");

function mapAssignment(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    classId: data.classId ?? "",
    stationId: data.stationId ?? "",
    evaluatorUserId: data.evaluatorUserId ?? "",
    evaluatorName: data.evaluatorName ?? "",
  };
}

/** @param {string} classId */
export async function listEvaluatorAssignmentsByClass(classId) {
  if (!classId) return [];
  const snap = await getDocs(query(assignmentsRef, where("classId", "==", classId)));
  return snap.docs.map((item) => mapAssignment(item.id, item.data())).filter(Boolean);
}

/** @param {string} classId @param {string} evaluatorUserId */
export async function isAssignedEvaluator(classId, evaluatorUserId) {
  if (!classId || !evaluatorUserId) return false;
  const assignments = await listEvaluatorAssignmentsByClass(classId);
  return assignments.some((item) => item.evaluatorUserId === evaluatorUserId);
}

/** @param {Omit<EvaluatorAssignmentRecord, 'id'>} input */
export async function createEvaluatorAssignment(input) {
  if (!input.classId || !input.evaluatorUserId) {
    throw new Error("Class and evaluator are required.");
  }

  const existing = await listEvaluatorAssignmentsByClass(input.classId);
  if (existing.some((item) => item.evaluatorUserId === input.evaluatorUserId)) {
    throw new Error("Evaluator is already assigned to this class.");
  }

  const docRef = await addDoc(assignmentsRef, {
    classId: input.classId,
    stationId: input.stationId ?? "",
    evaluatorUserId: input.evaluatorUserId,
    evaluatorName: input.evaluatorName?.trim() ?? "",
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/** @param {string} assignmentId */
export async function deleteEvaluatorAssignment(assignmentId) {
  await deleteDoc(doc(db, "evaluatorAssignments", assignmentId));
}

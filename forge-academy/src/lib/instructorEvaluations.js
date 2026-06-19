import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";

/**
 * @typedef {Object} InstructorEvaluationRecord
 * @property {string} id
 * @property {string} instructorId
 * @property {string} classId
 * @property {string} studentId
 * @property {string} studentName
 * @property {number} rating
 * @property {string} comments
 * @property {string} sessionDate
 */

const evaluationsRef = collection(db, "instructorEvaluations");

function mapEvaluation(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    instructorId: data.instructorId ?? "",
    classId: data.classId ?? "",
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    rating: Number(data.rating ?? 0),
    comments: data.comments ?? "",
    sessionDate: data.sessionDate ?? "",
  };
}

/** @param {string} instructorId */
export async function listInstructorEvaluations(instructorId) {
  const snap = await getDocs(
    query(evaluationsRef, where("instructorId", "==", instructorId)),
  );
  return snap.docs
    .map((item) => mapEvaluation(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
}

/** @param {Omit<InstructorEvaluationRecord, 'id'>} input */
export async function createInstructorEvaluation(input) {
  if (!input.instructorId || !input.classId) throw new Error("Instructor and class are required.");
  if (!input.rating || input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  const docRef = await addDoc(evaluationsRef, {
    instructorId: input.instructorId,
    classId: input.classId,
    studentId: input.studentId ?? "",
    studentName: input.studentName?.trim() ?? "",
    rating: Number(input.rating),
    comments: input.comments?.trim() ?? "",
    sessionDate: input.sessionDate ?? "",
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/** @param {InstructorEvaluationRecord[]} evaluations */
export function averageEvaluationRating(evaluations) {
  if (!evaluations.length) return 0;
  const total = evaluations.reduce((sum, item) => sum + item.rating, 0);
  return Math.round((total / evaluations.length) * 10) / 10;
}

import { httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db, functions } from "./firebase.js";

export const ONLINE_ATTEMPT_STATUSES = {
  IN_PROGRESS: "in_progress",
  PAUSED: "paused",
  SUBMITTED: "submitted",
  VOIDED: "voided",
};

export const SESSION_STATUSES = {
  ACTIVE: "active",
  PAUSED: "paused",
  SUBMITTED: "submitted",
  EXPIRED: "expired",
  VOIDED: "voided",
};

export async function publishTestVersion(testId) {
  const callable = httpsCallable(functions, "publishTestVersionCallable");
  const result = await callable({ testId });
  return result.data;
}

export async function createTestAssignment(input) {
  const callable = httpsCallable(functions, "createTestAssignmentCallable");
  const result = await callable(input);
  return result.data;
}

export async function startTestSession(assignmentId, meta = {}) {
  const callable = httpsCallable(functions, "startTestSessionCallable");
  const result = await callable({
    assignmentId,
    deviceId: meta.deviceId ?? "",
    userAgent: meta.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : ""),
  });
  return result.data;
}

export async function saveTestAnswers(input) {
  const callable = httpsCallable(functions, "saveTestAnswersCallable");
  const result = await callable(input);
  return result.data;
}

export async function submitTestAttempt(attemptId) {
  const callable = httpsCallable(functions, "submitTestAttemptCallable");
  const result = await callable({ attemptId });
  return result.data;
}

export async function proctorTestAction(sessionId, action, reason = "") {
  const callable = httpsCallable(functions, "proctorTestActionCallable");
  const result = await callable({ sessionId, action, reason });
  return result.data;
}

export async function listActiveTestSessions(filters = {}) {
  const callable = httpsCallable(functions, "listActiveTestSessionsCallable");
  const result = await callable(filters);
  return result.data ?? [];
}

/** @param {string} attemptId @param {(attempt: Record<string, unknown> | null) => void} callback */
export function subscribeToTestAttempt(attemptId, callback) {
  if (!attemptId) return () => {};
  return onSnapshot(doc(db, "testAttempts", attemptId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/** @param {string} sessionId @param {(session: Record<string, unknown> | null) => void} callback */
export function subscribeToTestSession(sessionId, callback) {
  if (!sessionId) return () => {};
  return onSnapshot(doc(db, "testSessions", sessionId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/** @param {string} studentId */
export async function listStudentTestAssignments(studentId) {
  if (!studentId) return [];
  const [directSnap, classSnap] = await Promise.all([
    getDocs(query(collection(db, "testAssignments"), where("studentId", "==", studentId))),
    getDocs(query(collection(db, "testAssignments"), where("studentId", "==", ""))),
  ]);

  const direct = directSnap.docs.map((item) => mapAssignment(item.id, item.data()));
  const classAssignments = classSnap.docs.map((item) => mapAssignment(item.id, item.data()));
  return [...direct, ...classAssignments].filter(Boolean);
}

/** @returns {Promise<import('./testAssignments.js').TestAssignmentRecord[]>} */
export async function listAllTestAssignments() {
  const snap = await getDocs(query(collection(db, "testAssignments")));
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

export { mapAssignment as mapTestAssignment };

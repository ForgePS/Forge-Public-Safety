import { httpsCallable } from "firebase/functions";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db, functions } from "./firebase.js";

export const PASS_FAIL_LABELS = {
  pass: "Pass",
  fail: "Fail",
  pending_manual_review: "Pending manual review",
};

/** @param {string} studentId */
export async function listTestResultsByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(collection(db, "testResults"), where("studentId", "==", studentId)));
  return snap.docs.map((item) => mapTestResult(item.id, item.data())).filter(Boolean);
}

/** @returns {Promise<ReturnType<typeof mapTestResult>[]>} */
export async function listAllTestResults() {
  const snap = await getDocs(query(collection(db, "testResults")));
  return snap.docs.map((item) => mapTestResult(item.id, item.data())).filter(Boolean);
}

function mapTestResult(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    testAttemptId: data.testAttemptId ?? data.attemptId ?? "",
    testId: data.testId ?? "",
    testVersionId: data.testVersionId ?? "",
    assignmentId: data.assignmentId ?? "",
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    classId: data.classId ?? "",
    testName: data.testName ?? "",
    score: Number(data.percentage ?? data.score ?? 0),
    possiblePoints: Number(data.possiblePoints ?? 0),
    percentage: Number(data.percentage ?? data.score ?? 0),
    passingScore: Number(data.passingScore ?? 70),
    passFail: data.passFail ?? (data.passed ? "pass" : data.status === "pending" ? "pending_manual_review" : "fail"),
    attemptNumber: Number(data.attemptNumber ?? data.attemptCount ?? 1),
    gradedBy: data.gradedBy ?? "",
    manualPendingCount: Number(data.manualPendingCount ?? 0),
    gradedAt: data.gradedAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function gradeManualQueueItem(queueItemId, pointsAwarded, graderNotes = "") {
  const callable = httpsCallable(functions, "gradeManualQueueItemCallable");
  const result = await callable({ queueItemId, pointsAwarded, graderNotes });
  return result.data;
}

export async function overrideTestScore(testResultId, newScore, reason, overriddenByName = "") {
  const callable = httpsCallable(functions, "overrideTestScoreCallable");
  const result = await callable({ testResultId, newScore, reason, overriddenByName });
  return result.data;
}

export async function completeRemediation(remediationId, notes = "") {
  const callable = httpsCallable(functions, "completeRemediationCallable");
  const result = await callable({ remediationId, notes });
  return result.data;
}

export async function requestRetest(input) {
  const callable = httpsCallable(functions, "requestRetestCallable");
  const result = await callable(input);
  return result.data;
}

export async function reviewRetestRequest(retestRequestId, decision, denialReason = "") {
  const callable = httpsCallable(functions, "reviewRetestRequestCallable");
  const result = await callable({ retestRequestId, decision, denialReason });
  return result.data;
}

export async function reviewCertificateRelease(queueItemId, decision, reviewNotes = "") {
  const callable = httpsCallable(functions, "reviewCertificateReleaseCallable");
  const result = await callable({ queueItemId, decision, reviewNotes });
  return result.data;
}

export async function getTestingDashboardMetrics() {
  const callable = httpsCallable(functions, "getTestingDashboardMetricsCallable");
  const result = await callable({});
  return result.data ?? {};
}

export async function listManualGradingQueue(status = "pending") {
  const snap = await getDocs(query(collection(db, "manualGradingQueue"), where("status", "==", status)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listRemediationAssignments(status) {
  let snap;
  if (status) {
    snap = await getDocs(query(collection(db, "remediationAssignments"), where("status", "==", status)));
  } else {
    snap = await getDocs(query(collection(db, "remediationAssignments")));
  }
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listRetestRequests(status = "requested") {
  const snap = await getDocs(query(collection(db, "retestRequests"), where("status", "==", status)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listCertificateReleaseQueue(status = "pending_admin_review") {
  const snap = await getDocs(query(collection(db, "certificateReleaseQueue"), where("status", "==", status)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listQuestionAnalytics() {
  const snap = await getDocs(query(collection(db, "questionAnalytics")));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listExamReviewQueue(status = "pending_review") {
  const snap = await getDocs(query(collection(db, "examReviewQueue"), where("status", "==", status)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listRemediationByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(collection(db, "remediationAssignments"), where("studentId", "==", studentId)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listRetestRequestsByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(collection(db, "retestRequests"), where("studentId", "==", studentId)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listPendingCertificatesByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(collection(db, "certificates"), where("studentId", "==", studentId)));
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => item.status === "pending_release");
}

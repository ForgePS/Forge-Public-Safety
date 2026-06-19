import { httpsCallable } from "firebase/functions";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, functions } from "./firebase.js";

export const CHALLENGE_REQUEST_TYPES = {
  RECIPROCITY: "reciprocity",
  PRIOR_EXPERIENCE: "prior_experience",
  DIRECT_CERTIFICATION: "direct_certification",
};

export const CHALLENGE_REQUEST_TYPE_LABELS = {
  [CHALLENGE_REQUEST_TYPES.RECIPROCITY]: "Reciprocity",
  [CHALLENGE_REQUEST_TYPES.PRIOR_EXPERIENCE]: "Prior experience",
  [CHALLENGE_REQUEST_TYPES.DIRECT_CERTIFICATION]: "Direct certification",
};

export const CHALLENGE_STATUS_LABELS = {
  requested: "Requested",
  approved: "Approved",
  denied: "Denied",
  completed: "Completed",
};

export async function submitChallengeTestRequest(input) {
  const callable = httpsCallable(functions, "submitChallengeTestRequestCallable");
  const result = await callable(input);
  return result.data;
}

export async function reviewChallengeTestRequest(requestId, decision, reviewNotes = "", outcome = "") {
  const callable = httpsCallable(functions, "reviewChallengeTestRequestCallable");
  const result = await callable({ requestId, decision, reviewNotes, outcome });
  return result.data;
}

/** @param {string} [status] */
export async function listChallengeTestRequests(status) {
  let snap;
  if (status) {
    snap = await getDocs(query(collection(db, "challengeTestRequests"), where("status", "==", status)));
  } else {
    snap = await getDocs(query(collection(db, "challengeTestRequests")));
  }
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => {
      const aMs = a.createdAt?.toMillis?.() ?? 0;
      const bMs = b.createdAt?.toMillis?.() ?? 0;
      return bMs - aMs;
    });
}

/** @param {string} studentId */
export async function listChallengeRequestsByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(
    query(collection(db, "challengeTestRequests"), where("studentId", "==", studentId)),
  );
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

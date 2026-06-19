import { httpsCallable } from "firebase/functions";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, functions } from "./firebase.js";

export const STATE_CERT_PASS_FAIL_LABELS = {
  pass: "Pass",
  fail: "Fail",
  pending: "Pending",
};

/** @returns {Promise<Array<Record<string, unknown>>>} */
export async function listStateCertificationTests() {
  const snap = await getDocs(query(collection(db, "stateCertificationTests")));
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => String(b.examDate ?? "").localeCompare(String(a.examDate ?? "")));
}

/** @param {string} studentId */
export async function listStateCertificationTestsByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(
    query(collection(db, "stateCertificationTests"), where("studentId", "==", studentId)),
  );
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function recordStateCertificationTest(input) {
  const callable = httpsCallable(functions, "recordStateCertificationTestCallable");
  const result = await callable(input);
  return result.data;
}

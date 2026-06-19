import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { getCertificateTemplateForCourse } from "./certificateTemplates.js";

/**
 * @param {string} serialPrefix
 * @returns {Promise<string>}
 */
export async function assignSerialFromPrefix(serialPrefix) {
  const key = (serialPrefix || "0002AR").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase() || "0002AR";
  const counterRef = doc(db, "certificateCounters", key);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const nextSequence = snap.exists() ? Number(snap.data().nextSequence ?? 1) : 1;
    transaction.set(
      counterRef,
      {
        serialPrefix: key,
        nextSequence: nextSequence + 1,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return `${key}-${String(nextSequence).padStart(7, "0")}`;
  });
}

/**
 * @param {string} courseNumber
 * @returns {Promise<string>}
 */
export async function assignSerialFromCourseNumber(courseNumber) {
  const prefix = (courseNumber || "CERT").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "CERT";
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const counterRef = doc(db, "certificateCounters", key);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const nextSequence = snap.exists() ? Number(snap.data().nextSequence ?? 1) : 1;
    transaction.set(
      counterRef,
      {
        serialPrefix: key,
        nextSequence: nextSequence + 1,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return `${key}-${String(nextSequence).padStart(4, "0")}`;
  });
}

/**
 * @param {{ courseId?: string, courseNumber?: string, serialPrefix?: string }} input
 * @returns {Promise<string>}
 */
export async function assignNextCertificateNumber(input = {}) {
  if (input.serialPrefix) {
    return assignSerialFromPrefix(input.serialPrefix);
  }

  const template = input.courseId ? await getCertificateTemplateForCourse(input.courseId) : null;
  if (template?.serialPrefix) {
    return assignSerialFromPrefix(template.serialPrefix);
  }

  return assignSerialFromCourseNumber(input.courseNumber ?? "");
}

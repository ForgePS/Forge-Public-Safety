import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";

export const CREDENTIAL_STATUSES = {
  ACTIVE: "active",
  EXPIRED: "expired",
  PENDING: "pending",
};

export const CREDENTIAL_STATUS_LABELS = {
  [CREDENTIAL_STATUSES.ACTIVE]: "Active",
  [CREDENTIAL_STATUSES.EXPIRED]: "Expired",
  [CREDENTIAL_STATUSES.PENDING]: "Pending",
};

/**
 * @typedef {Object} InstructorCertificationRecord
 * @property {string} id
 * @property {string} instructorId
 * @property {string} name
 * @property {string} credentialNumber
 * @property {string} issuingBody
 * @property {string} issuedDate
 * @property {string} expirationDate
 * @property {string} status
 * @property {string} notes
 */

const certificationsRef = collection(db, "instructorCertifications");

function mapCertification(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    instructorId: data.instructorId ?? "",
    name: data.name ?? "",
    credentialNumber: data.credentialNumber ?? "",
    issuingBody: data.issuingBody ?? "",
    issuedDate: data.issuedDate ?? "",
    expirationDate: data.expirationDate ?? "",
    status: data.status ?? CREDENTIAL_STATUSES.ACTIVE,
    notes: data.notes ?? "",
  };
}

/** @param {string} instructorId */
export async function listInstructorCertifications(instructorId) {
  const snap = await getDocs(
    query(certificationsRef, where("instructorId", "==", instructorId)),
  );
  return snap.docs
    .map((item) => mapCertification(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
}

/** @param {Omit<InstructorCertificationRecord, 'id'>} input */
export async function createInstructorCertification(input) {
  if (!input.instructorId) throw new Error("Instructor is required.");
  if (!input.name) throw new Error("Credential name is required.");

  const docRef = await addDoc(certificationsRef, {
    instructorId: input.instructorId,
    name: input.name.trim(),
    credentialNumber: input.credentialNumber?.trim() ?? "",
    issuingBody: input.issuingBody?.trim() ?? "",
    issuedDate: input.issuedDate ?? "",
    expirationDate: input.expirationDate ?? "",
    status: input.status || CREDENTIAL_STATUSES.ACTIVE,
    notes: input.notes?.trim() ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/** @param {string} certificationId @param {Partial<Omit<InstructorCertificationRecord, 'id' | 'instructorId'>>} input */
export async function updateInstructorCertification(certificationId, input) {
  await updateDoc(doc(db, "instructorCertifications", certificationId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

/** @param {string} certificationId */
export async function deleteInstructorCertification(certificationId) {
  await deleteDoc(doc(db, "instructorCertifications", certificationId));
}

/** @param {InstructorCertificationRecord[]} certifications */
export function countExpiringCertifications(certifications, withinDays = 45) {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + withinDays);

  return certifications.filter((cert) => {
    if (!cert.expirationDate || cert.status === CREDENTIAL_STATUSES.EXPIRED) return false;
    const expiry = new Date(`${cert.expirationDate}T00:00:00`);
    return expiry >= today && expiry <= cutoff;
  }).length;
}

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

export const CERTIFICATION_TYPE_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

/**
 * @typedef {Object} CertificationTypeRecord
 * @property {string} id
 * @property {string} name
 * @property {string} code
 * @property {string} description
 * @property {number} validityYears
 * @property {string} status
 */

const typesRef = collection(db, "certificationTypes");

function mapType(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    name: data.name ?? "",
    code: data.code ?? "",
    description: data.description ?? "",
    validityYears: Number(data.validityYears ?? 2),
    status: data.status ?? CERTIFICATION_TYPE_STATUSES.ACTIVE,
  };
}

/** @returns {Promise<CertificationTypeRecord[]>} */
export async function listCertificationTypes() {
  const snap = await getDocs(query(typesRef));
  return snap.docs
    .map((item) => mapType(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {string} code */
export async function findCertificationTypeByCode(code) {
  if (!code) return null;
  const snap = await getDocs(query(typesRef, where("code", "==", code)));
  const match = snap.docs.map((item) => mapType(item.id, item.data())).find(Boolean);
  return match ?? null;
}

/** @param {Omit<CertificationTypeRecord, 'id'>} input */
export async function createCertificationType(input) {
  if (!input.name?.trim() || !input.code?.trim()) {
    throw new Error("Name and code are required.");
  }

  const docRef = await addDoc(typesRef, {
    name: input.name.trim(),
    code: input.code.trim(),
    description: input.description?.trim() ?? "",
    validityYears: Number(input.validityYears ?? 2),
    status: input.status || CERTIFICATION_TYPE_STATUSES.ACTIVE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/** @param {string} typeId @param {Partial<CertificationTypeRecord>} input */
export async function updateCertificationType(typeId, input) {
  await updateDoc(doc(db, "certificationTypes", typeId), {
    ...(input.name != null ? { name: input.name.trim() } : {}),
    ...(input.code != null ? { code: input.code.trim() } : {}),
    ...(input.description != null ? { description: input.description.trim() } : {}),
    ...(input.validityYears != null ? { validityYears: Number(input.validityYears) } : {}),
    ...(input.status != null ? { status: input.status } : {}),
    updatedAt: serverTimestamp(),
  });
}

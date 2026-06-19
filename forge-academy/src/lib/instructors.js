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

export const INSTRUCTOR_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const INSTRUCTOR_STATUS_LABELS = {
  [INSTRUCTOR_STATUSES.ACTIVE]: "Active",
  [INSTRUCTOR_STATUSES.INACTIVE]: "Inactive",
};

/**
 * @typedef {Object} InstructorRecord
 * @property {string} id
 * @property {string} userId
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} phone
 * @property {string} employeeId
 * @property {string[]} specialties
 * @property {string} bio
 * @property {string} status
 * @property {string} notes
 * @property {import('firebase/firestore').Timestamp | null} createdAt
 * @property {import('firebase/firestore').Timestamp | null} updatedAt
 */

const instructorsRef = collection(db, "instructors");

/**
 * @param {unknown} data
 * @returns {InstructorRecord | null}
 */
export function mapInstructor(id, data) {
  if (!data || typeof data !== "object") return null;

  return {
    id,
    userId: data.userId ?? "",
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    email: data.email?.trim().toLowerCase() ?? "",
    phone: data.phone ?? "",
    employeeId: data.employeeId ?? "",
    specialties: Array.isArray(data.specialties) ? data.specialties.filter(Boolean) : [],
    bio: data.bio ?? "",
    status: data.status ?? INSTRUCTOR_STATUSES.ACTIVE,
    notes: data.notes ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

/** @param {InstructorRecord} instructor */
export function instructorDisplayName(instructor) {
  return `${instructor.firstName} ${instructor.lastName}`.trim() || instructor.email || "Instructor";
}

/** @returns {Promise<InstructorRecord[]>} */
export async function listInstructors() {
  const snap = await getDocs(query(instructorsRef));
  return snap.docs
    .map((item) => mapInstructor(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => instructorDisplayName(a).localeCompare(instructorDisplayName(b)));
}

/** @returns {Promise<InstructorRecord[]>} */
export async function listActiveInstructors() {
  const instructors = await listInstructors();
  return instructors.filter((instructor) => instructor.status === INSTRUCTOR_STATUSES.ACTIVE);
}

/** @returns {Promise<InstructorRecord | null>} */
export async function getInstructor(instructorId) {
  const snap = await getDoc(doc(db, "instructors", instructorId));
  if (!snap.exists()) return null;
  return mapInstructor(snap.id, snap.data());
}

/** @returns {Promise<InstructorRecord | null>} */
export async function getInstructorByUserId(userId) {
  if (!userId) return null;
  const snap = await getDocs(query(instructorsRef, where("userId", "==", userId)));
  const match = snap.docs.map((item) => mapInstructor(item.id, item.data())).find(Boolean);
  return match ?? null;
}

/** @param {Omit<InstructorRecord, 'id' | 'createdAt' | 'updatedAt'>} input */
export async function createInstructor(input) {
  const payload = sanitizeInstructorPayload(input);
  validateInstructorPayload(payload);

  const docRef = await addDoc(instructorsRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/** @param {string} instructorId @param {Partial<Omit<InstructorRecord, 'id' | 'createdAt' | 'updatedAt'>>} input */
export async function updateInstructor(instructorId, input) {
  const existing = await getInstructor(instructorId);
  if (!existing) throw new Error("Instructor not found.");

  const payload = sanitizeInstructorPayload({ ...existing, ...input });
  validateInstructorPayload(payload);

  await updateDoc(doc(db, "instructors", instructorId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

/** @param {string} instructorId */
export async function deactivateInstructor(instructorId) {
  await updateDoc(doc(db, "instructors", instructorId), {
    status: INSTRUCTOR_STATUSES.INACTIVE,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {InstructorRecord[]} instructors
 * @param {string} search
 */
export function filterInstructors(instructors, search) {
  const term = search.trim().toLowerCase();
  if (!term) return instructors;

  return instructors.filter((instructor) =>
    [
      instructor.firstName,
      instructor.lastName,
      instructor.email,
      instructor.phone,
      instructor.employeeId,
      instructor.specialties.join(" "),
    ]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
}

function sanitizeInstructorPayload(input) {
  const specialties = Array.isArray(input.specialties)
    ? input.specialties
    : String(input.specialties ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  return {
    userId: input.userId?.trim() ?? "",
    firstName: input.firstName?.trim() ?? "",
    lastName: input.lastName?.trim() ?? "",
    email: input.email?.trim().toLowerCase() ?? "",
    phone: normalizePhone(input.phone ?? ""),
    employeeId: input.employeeId?.trim() ?? "",
    specialties,
    bio: input.bio?.trim() ?? "",
    status: input.status || INSTRUCTOR_STATUSES.ACTIVE,
    notes: input.notes?.trim() ?? "",
  };
}

function validateInstructorPayload(payload) {
  if (!payload.firstName || !payload.lastName) {
    throw new Error("First and last name are required.");
  }
  if (!payload.email) {
    throw new Error("Email is required.");
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("Enter a valid email address.");
  }
}

function normalizePhone(value) {
  return value.replace(/\D/g, "");
}

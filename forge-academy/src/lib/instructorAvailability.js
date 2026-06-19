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

export const AVAILABILITY_TYPES = {
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
};

export const AVAILABILITY_TYPE_LABELS = {
  [AVAILABILITY_TYPES.AVAILABLE]: "Available",
  [AVAILABILITY_TYPES.UNAVAILABLE]: "Unavailable",
};

/**
 * @typedef {Object} InstructorAvailabilityRecord
 * @property {string} id
 * @property {string} instructorId
 * @property {string} startDate
 * @property {string} endDate
 * @property {string} availabilityType
 * @property {string} notes
 */

const availabilityRef = collection(db, "instructorAvailability");

function mapAvailability(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    instructorId: data.instructorId ?? "",
    startDate: data.startDate ?? "",
    endDate: data.endDate ?? "",
    availabilityType: data.availabilityType ?? AVAILABILITY_TYPES.UNAVAILABLE,
    notes: data.notes ?? "",
  };
}

/** @param {string} instructorId */
export async function listInstructorAvailability(instructorId) {
  const snap = await getDocs(
    query(availabilityRef, where("instructorId", "==", instructorId)),
  );
  return snap.docs
    .map((item) => mapAvailability(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** @param {Omit<InstructorAvailabilityRecord, 'id'>} input */
export async function createInstructorAvailability(input) {
  if (!input.instructorId) throw new Error("Instructor is required.");
  if (!input.startDate || !input.endDate) throw new Error("Start and end dates are required.");
  if (input.endDate < input.startDate) throw new Error("End date cannot be before start date.");

  const docRef = await addDoc(availabilityRef, {
    instructorId: input.instructorId,
    startDate: input.startDate,
    endDate: input.endDate,
    availabilityType: input.availabilityType || AVAILABILITY_TYPES.UNAVAILABLE,
    notes: input.notes?.trim() ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/** @param {string} availabilityId */
export async function deleteInstructorAvailability(availabilityId) {
  await deleteDoc(doc(db, "instructorAvailability", availabilityId));
}

/** @param {InstructorAvailabilityRecord[]} availabilityRows @param {string} date */
export function isInstructorUnavailableOnDate(availabilityRows, date) {
  return availabilityRows.some(
    (row) =>
      row.availabilityType === AVAILABILITY_TYPES.UNAVAILABLE &&
      date >= row.startDate &&
      date <= row.endDate,
  );
}

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
import { writeAuditLog } from "./auditLogs.js";

export const ACCOMMODATION_TYPES = {
  EXTENDED_TIME: "extended_time",
  READER: "reader",
  SEPARATE_ROOM: "separate_room",
  LARGE_FONT: "large_font",
  MANUAL_DELIVERY: "manual_delivery",
  OTHER: "other",
};

export const ACCOMMODATION_TYPE_LABELS = {
  [ACCOMMODATION_TYPES.EXTENDED_TIME]: "Extended time",
  [ACCOMMODATION_TYPES.READER]: "Reader",
  [ACCOMMODATION_TYPES.SEPARATE_ROOM]: "Separate room",
  [ACCOMMODATION_TYPES.LARGE_FONT]: "Large font",
  [ACCOMMODATION_TYPES.MANUAL_DELIVERY]: "Manual delivery",
  [ACCOMMODATION_TYPES.OTHER]: "Other",
};

/**
 * @typedef {Object} TestAccommodationRecord
 * @property {string} id
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} testId
 * @property {string} classId
 * @property {string} accommodationType
 * @property {number | null} extraTimePercent
 * @property {string} notes
 * @property {string} approvedBy
 */

const accommodationsRef = collection(db, "testAccommodations");

function mapAccommodation(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    testId: data.testId ?? "",
    classId: data.classId ?? "",
    accommodationType: data.accommodationType ?? ACCOMMODATION_TYPES.OTHER,
    extraTimePercent: data.extraTimePercent == null ? null : Number(data.extraTimePercent),
    notes: data.notes ?? "",
    approvedBy: data.approvedBy ?? "",
  };
}

/** @returns {Promise<TestAccommodationRecord[]>} */
export async function listTestAccommodations() {
  const snap = await getDocs(query(accommodationsRef));
  return snap.docs.map((item) => mapAccommodation(item.id, item.data())).filter(Boolean);
}

/** @param {string} studentId */
export async function listTestAccommodationsByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(accommodationsRef, where("studentId", "==", studentId)));
  return snap.docs.map((item) => mapAccommodation(item.id, item.data())).filter(Boolean);
}

/** @param {Omit<TestAccommodationRecord, 'id'>} input @param {string} userId */
export async function createTestAccommodation(input, userId) {
  if (!input.studentId) throw new Error("Student is required.");
  if (!input.accommodationType) throw new Error("Accommodation type is required.");

  const docRef = await addDoc(accommodationsRef, {
    studentId: input.studentId,
    studentName: input.studentName ?? "",
    testId: input.testId ?? "",
    classId: input.classId ?? "",
    accommodationType: input.accommodationType,
    extraTimePercent: input.extraTimePercent == null ? null : Number(input.extraTimePercent),
    notes: input.notes?.trim() ?? "",
    approvedBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "test_accommodation_created",
    entityType: "testAccommodation",
    entityId: docRef.id,
    userId,
  });

  return docRef.id;
}

/** @param {string} accommodationId @param {Partial<TestAccommodationRecord>} input @param {string} userId */
export async function updateTestAccommodation(accommodationId, input, userId) {
  await updateDoc(doc(db, "testAccommodations", accommodationId), {
    ...(input.accommodationType != null ? { accommodationType: input.accommodationType } : {}),
    ...(input.extraTimePercent != null
      ? { extraTimePercent: input.extraTimePercent == null ? null : Number(input.extraTimePercent) }
      : {}),
    ...(input.notes != null ? { notes: input.notes.trim() } : {}),
    ...(input.testId != null ? { testId: input.testId } : {}),
    ...(input.classId != null ? { classId: input.classId } : {}),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "test_accommodation_updated",
    entityType: "testAccommodation",
    entityId: accommodationId,
    userId,
  });
}

/** @param {string} accommodationId */
export async function getTestAccommodation(accommodationId) {
  const snap = await getDoc(doc(db, "testAccommodations", accommodationId));
  if (!snap.exists()) return null;
  return mapAccommodation(snap.id, snap.data());
}

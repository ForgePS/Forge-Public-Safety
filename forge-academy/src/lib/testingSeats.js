import {
  addDoc,
  collection,
  deleteDoc,
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

/**
 * @typedef {Object} TestingSeatRecord
 * @property {string} id
 * @property {string} testingWindowId
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} roomId
 * @property {string} roomName
 * @property {string} seatNumber
 * @property {string} computerNumber
 * @property {string} assignedBy
 */

const seatsRef = collection(db, "testingSeats");

function mapSeat(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    testingWindowId: data.testingWindowId ?? "",
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    roomId: data.roomId ?? "",
    roomName: data.roomName ?? "",
    seatNumber: data.seatNumber ?? "",
    computerNumber: data.computerNumber ?? "",
    assignedBy: data.assignedBy ?? "",
  };
}

/** @returns {Promise<TestingSeatRecord[]>} */
export async function listTestingSeats() {
  const snap = await getDocs(query(seatsRef));
  return snap.docs.map((item) => mapSeat(item.id, item.data())).filter(Boolean);
}

/** @param {string} testingWindowId */
export async function listTestingSeatsByWindow(testingWindowId) {
  if (!testingWindowId) return [];
  const snap = await getDocs(query(seatsRef, where("testingWindowId", "==", testingWindowId)));
  return snap.docs.map((item) => mapSeat(item.id, item.data())).filter(Boolean);
}

/** @param {Omit<TestingSeatRecord, 'id'>} input @param {string} userId */
export async function createTestingSeat(input, userId) {
  if (!input.testingWindowId || !input.studentId || !input.roomId) {
    throw new Error("Testing window, student, and room are required.");
  }

  const docRef = await addDoc(seatsRef, {
    testingWindowId: input.testingWindowId,
    studentId: input.studentId,
    studentName: input.studentName ?? "",
    roomId: input.roomId,
    roomName: input.roomName ?? "",
    seatNumber: input.seatNumber ?? "",
    computerNumber: input.computerNumber ?? "",
    assignedBy: userId,
    assignedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "testing_seat_assigned",
    entityType: "testingSeat",
    entityId: docRef.id,
    userId,
  });

  return docRef.id;
}

/** @param {string} seatId @param {Partial<TestingSeatRecord>} input @param {string} userId */
export async function updateTestingSeat(seatId, input, userId) {
  await updateDoc(doc(db, "testingSeats", seatId), {
    ...(input.roomId != null ? { roomId: input.roomId } : {}),
    ...(input.roomName != null ? { roomName: input.roomName } : {}),
    ...(input.seatNumber != null ? { seatNumber: input.seatNumber } : {}),
    ...(input.computerNumber != null ? { computerNumber: input.computerNumber } : {}),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "testing_seat_updated",
    entityType: "testingSeat",
    entityId: seatId,
    userId,
  });
}

/** @param {string} seatId @param {string} userId */
export async function deleteTestingSeat(seatId, userId) {
  await deleteDoc(doc(db, "testingSeats", seatId));
  await writeAuditLog({
    action: "testing_seat_removed",
    entityType: "testingSeat",
    entityId: seatId,
    userId,
  });
}

/** @param {string} seatId */
export async function getTestingSeat(seatId) {
  const snap = await getDoc(doc(db, "testingSeats", seatId));
  if (!snap.exists()) return null;
  return mapSeat(snap.id, snap.data());
}

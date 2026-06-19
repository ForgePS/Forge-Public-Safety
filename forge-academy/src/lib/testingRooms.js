import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { writeAuditLog } from "./auditLogs.js";

/**
 * @typedef {Object} TestingRoomRecord
 * @property {string} id
 * @property {string} roomName
 * @property {string} roomNumber
 * @property {number} capacity
 * @property {boolean} active
 */

const roomsRef = collection(db, "testingRooms");

function mapRoom(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    roomName: data.roomName ?? "",
    roomNumber: data.roomNumber ?? "",
    capacity: Number(data.capacity ?? 0),
    active: data.active !== false,
  };
}

/** @returns {Promise<TestingRoomRecord[]>} */
export async function listTestingRooms(includeInactive = false) {
  const snap = await getDocs(query(roomsRef));
  return snap.docs
    .map((item) => mapRoom(item.id, item.data()))
    .filter(Boolean)
    .filter((item) => includeInactive || item.active)
    .sort((a, b) => a.roomName.localeCompare(b.roomName));
}

/** @param {string} roomId */
export async function getTestingRoom(roomId) {
  const snap = await getDoc(doc(db, "testingRooms", roomId));
  if (!snap.exists()) return null;
  return mapRoom(snap.id, snap.data());
}

/** @param {Omit<TestingRoomRecord, 'id'>} input @param {string} userId */
export async function createTestingRoom(input, userId) {
  if (!input.roomName?.trim()) throw new Error("Room name is required.");

  const docRef = await addDoc(roomsRef, {
    roomName: input.roomName.trim(),
    roomNumber: input.roomNumber?.trim() ?? "",
    capacity: Number(input.capacity ?? 0),
    active: input.active !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "testing_room_created",
    entityType: "testingRoom",
    entityId: docRef.id,
    userId,
  });

  return docRef.id;
}

/** @param {string} roomId @param {Partial<TestingRoomRecord>} input @param {string} userId */
export async function updateTestingRoom(roomId, input, userId) {
  await updateDoc(doc(db, "testingRooms", roomId), {
    ...(input.roomName != null ? { roomName: input.roomName.trim() } : {}),
    ...(input.roomNumber != null ? { roomNumber: input.roomNumber.trim() } : {}),
    ...(input.capacity != null ? { capacity: Number(input.capacity) } : {}),
    ...(input.active != null ? { active: Boolean(input.active) } : {}),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "testing_room_updated",
    entityType: "testingRoom",
    entityId: roomId,
    userId,
  });
}

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
import { HOUSING_AUDIT_ACTIONS, writeHousingAuditEntry } from "./housingAuditLog.js";

export const ROOM_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  MAINTENANCE: "maintenance",
  RESERVED: "reserved",
};

export const ROOM_STATUS_LABELS = {
  [ROOM_STATUSES.ACTIVE]: "Active",
  [ROOM_STATUSES.INACTIVE]: "Inactive",
  [ROOM_STATUSES.MAINTENANCE]: "Maintenance",
  [ROOM_STATUSES.RESERVED]: "Reserved",
};

export const ROOM_TYPES = {
  STANDARD: "standard",
  SINGLE: "single",
  DOUBLE: "double",
  ACCESSIBLE: "accessible",
  INSTRUCTOR: "instructor",
  OVERFLOW: "overflow",
};

export const ROOM_TYPE_LABELS = {
  [ROOM_TYPES.STANDARD]: "Standard",
  [ROOM_TYPES.SINGLE]: "Single",
  [ROOM_TYPES.DOUBLE]: "Double",
  [ROOM_TYPES.ACCESSIBLE]: "Accessible",
  [ROOM_TYPES.INSTRUCTOR]: "Instructor",
  [ROOM_TYPES.OVERFLOW]: "Overflow",
};

/**
 * @typedef {Object} RoomRecord
 * @property {string} id
 * @property {string} roomNumber
 * @property {string} building
 * @property {string} floor
 * @property {number} capacity
 * @property {string} roomType
 * @property {string} status
 * @property {string} notes
 */

const roomsRef = collection(db, "rooms");

function mapRoom(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    roomNumber: data.roomNumber ?? "",
    building: data.building ?? "",
    floor: data.floor ?? "",
    capacity: Number(data.capacity ?? 2),
    roomType: data.roomType ?? ROOM_TYPES.STANDARD,
    status: data.status ?? ROOM_STATUSES.ACTIVE,
    notes: data.notes ?? "",
  };
}

/** @returns {Promise<RoomRecord[]>} */
export async function listRooms() {
  const snap = await getDocs(query(roomsRef));
  return snap.docs
    .map((item) => mapRoom(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
}

/** @param {string} roomId */
export async function getRoom(roomId) {
  const snap = await getDoc(doc(db, "rooms", roomId));
  if (!snap.exists()) return null;
  return mapRoom(snap.id, snap.data());
}

/** @param {Omit<RoomRecord, 'id'> & { actorUid: string, actorName?: string }} input */
export async function createRoom(input) {
  validateRoomPayload(input);

  const duplicate = await findRoomByNumber(input.roomNumber);
  if (duplicate) throw new Error(`Room ${input.roomNumber} already exists.`);

  const docRef = await addDoc(roomsRef, {
    roomNumber: input.roomNumber.trim(),
    building: input.building?.trim() ?? "",
    floor: input.floor?.trim() ?? "",
    capacity: Number(input.capacity ?? 2),
    roomType: input.roomType || ROOM_TYPES.STANDARD,
    status: input.status || ROOM_STATUSES.ACTIVE,
    notes: input.notes?.trim() ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeHousingAuditEntry({
    action: HOUSING_AUDIT_ACTIONS.ROOM_CREATED,
    entityType: "room",
    entityId: docRef.id,
    roomId: docRef.id,
    actorUid: input.actorUid,
    actorName: input.actorName,
    newValue: input.roomNumber,
  });

  return docRef.id;
}

/** @param {string} roomId @param {Partial<RoomRecord> & { actorUid: string, actorName?: string }} input */
export async function updateRoom(roomId, input) {
  const existing = await getRoom(roomId);
  if (!existing) throw new Error("Room not found.");

  const payload = {
    roomNumber: input.roomNumber?.trim() ?? existing.roomNumber,
    building: input.building?.trim() ?? existing.building,
    floor: input.floor?.trim() ?? existing.floor,
    capacity: Number(input.capacity ?? existing.capacity),
    roomType: input.roomType ?? existing.roomType,
    status: input.status ?? existing.status,
    notes: input.notes?.trim() ?? existing.notes,
  };

  validateRoomPayload(payload);

  if (payload.roomNumber !== existing.roomNumber) {
    const duplicate = await findRoomByNumber(payload.roomNumber);
    if (duplicate && duplicate.id !== roomId) {
      throw new Error(`Room ${payload.roomNumber} already exists.`);
    }
  }

  await updateDoc(doc(db, "rooms", roomId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });

  let action = HOUSING_AUDIT_ACTIONS.ROOM_UPDATED;
  if (payload.status === ROOM_STATUSES.INACTIVE && existing.status !== ROOM_STATUSES.INACTIVE) {
    action = HOUSING_AUDIT_ACTIONS.ROOM_DEACTIVATED;
  } else if (payload.status === ROOM_STATUSES.MAINTENANCE) {
    action = HOUSING_AUDIT_ACTIONS.ROOM_MAINTENANCE;
  }

  await writeHousingAuditEntry({
    action,
    entityType: "room",
    entityId: roomId,
    roomId,
    actorUid: input.actorUid,
    actorName: input.actorName,
    priorValue: existing.roomNumber,
    newValue: payload.roomNumber,
    notes: payload.notes,
  });
}

/** @param {string} roomNumber */
async function findRoomByNumber(roomNumber) {
  if (!roomNumber?.trim()) return null;
  const snap = await getDocs(query(roomsRef, where("roomNumber", "==", roomNumber.trim())));
  const match = snap.docs.map((item) => mapRoom(item.id, item.data())).find(Boolean);
  return match ?? null;
}

function validateRoomPayload(payload) {
  if (!payload.roomNumber?.trim()) throw new Error("Room number is required.");
  if (payload.capacity <= 0) throw new Error("Room capacity must be at least 1.");
}

/**
 * @param {RoomRecord[]} rooms
 * @param {{ building?: string, floor?: string, roomType?: string, status?: string, search?: string }} filters
 */
export function filterRooms(rooms, filters) {
  const term = filters.search?.trim().toLowerCase() ?? "";
  return rooms.filter((room) => {
    if (filters.building && room.building !== filters.building) return false;
    if (filters.floor && room.floor !== filters.floor) return false;
    if (filters.roomType && room.roomType !== filters.roomType) return false;
    if (filters.status && room.status !== filters.status) return false;
    if (!term) return true;
    return [room.roomNumber, room.building, room.floor, room.notes]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
}

/** @param {RoomRecord} room */
export function isRoomAssignable(room) {
  return room.status === ROOM_STATUSES.ACTIVE || room.status === ROOM_STATUSES.RESERVED;
}

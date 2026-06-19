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
import { getClassSession, isHousingRequired } from "./classes.js";
import { getStudent } from "./students.js";
import { getRoom, isRoomAssignable } from "./rooms.js";
import { HOUSING_AUDIT_ACTIONS, writeHousingAuditEntry } from "./housingAuditLog.js";
import { syncHousingRoster } from "./housingRosters.js";

export const ASSIGNMENT_STATUSES = {
  ASSIGNED: "assigned",
  CHECKED_IN: "checked_in",
  CHECKED_OUT: "checked_out",
  CANCELLED: "cancelled",
};

export const ASSIGNMENT_STATUS_LABELS = {
  [ASSIGNMENT_STATUSES.ASSIGNED]: "Assigned",
  [ASSIGNMENT_STATUSES.CHECKED_IN]: "Checked in",
  [ASSIGNMENT_STATUSES.CHECKED_OUT]: "Checked out",
  [ASSIGNMENT_STATUSES.CANCELLED]: "Cancelled",
};

export const BED_ASSIGNMENTS = ["A", "B"];

const assignmentsRef = collection(db, "roomAssignments");

const ACTIVE_ASSIGNMENT_STATUSES = [ASSIGNMENT_STATUSES.ASSIGNED, ASSIGNMENT_STATUSES.CHECKED_IN];

/**
 * @typedef {Object} RoomAssignmentRecord
 * @property {string} id
 * @property {string} classId
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} departmentName
 * @property {string} femaSid
 * @property {string} courseName
 * @property {string} roomId
 * @property {string} roomNumber
 * @property {string} building
 * @property {string} bedAssignment
 * @property {string} checkInDate
 * @property {string} checkOutDate
 * @property {string} status
 * @property {string} assignedBy
 * @property {string} notes
 * @property {boolean} capacityOverride
 * @property {string} overrideReason
 */

function mapAssignment(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    classId: data.classId ?? "",
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    departmentName: data.departmentName ?? "",
    femaSid: data.femaSid ?? "",
    courseName: data.courseName ?? "",
    roomId: data.roomId ?? "",
    roomNumber: data.roomNumber ?? "",
    building: data.building ?? "",
    bedAssignment: data.bedAssignment ?? "",
    checkInDate: data.checkInDate ?? "",
    checkOutDate: data.checkOutDate ?? "",
    status: data.status ?? ASSIGNMENT_STATUSES.ASSIGNED,
    assignedBy: data.assignedBy ?? "",
    notes: data.notes?.trim() ?? "",
    capacityOverride: Boolean(data.capacityOverride),
    overrideReason: data.overrideReason ?? "",
  };
}

/** @param {string} classId */
export async function listAssignmentsByClass(classId) {
  if (!classId) return [];
  const snap = await getDocs(query(assignmentsRef, where("classId", "==", classId)));
  return snap.docs
    .map((item) => mapAssignment(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/** @param {string} studentId */
export async function listAssignmentsByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(assignmentsRef, where("studentId", "==", studentId)));
  return snap.docs
    .map((item) => mapAssignment(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
}

/** @param {string} roomId @param {string} classId */
export async function listActiveAssignmentsForRoom(classId, roomId) {
  const rows = await listAssignmentsByClass(classId);
  return rows.filter(
    (item) => item.roomId === roomId && ACTIVE_ASSIGNMENT_STATUSES.includes(item.status),
  );
}

/** @param {string} assignmentId */
export async function getRoomAssignment(assignmentId) {
  const snap = await getDoc(doc(db, "roomAssignments", assignmentId));
  if (!snap.exists()) return null;
  return mapAssignment(snap.id, snap.data());
}

/**
 * @param {{
 *   classId: string,
 *   studentId: string,
 *   roomId: string,
 *   bedAssignment?: string,
 *   checkInDate?: string,
 *   checkOutDate?: string,
 *   notes?: string,
 *   assignedByUid: string,
 *   assignedByName?: string,
 *   capacityOverrideReason?: string,
 * }} input
 */
export async function assignStudentToRoom(input) {
  const classSession = await getClassSession(input.classId);
  if (!classSession) throw new Error("Class session not found.");
  if (!isHousingRequired(classSession)) {
    throw new Error("Room assignment is only enabled for on-campus housing classes.");
  }

  const student = await getStudent(input.studentId);
  if (!student) throw new Error("Student not found.");

  const room = await getRoom(input.roomId);
  if (!room) throw new Error("Room not found.");
  if (!isRoomAssignable(room)) throw new Error("This room is not available for assignment.");

  const existingForStudent = (await listAssignmentsByClass(input.classId)).find(
    (item) =>
      item.studentId === input.studentId && ACTIVE_ASSIGNMENT_STATUSES.includes(item.status),
  );
  if (existingForStudent) {
    throw new Error("Student already has an active room assignment for this class.");
  }

  const activeInRoom = await listActiveAssignmentsForRoom(input.classId, input.roomId);
  const bed = input.bedAssignment?.toUpperCase();
  if (bed && !BED_ASSIGNMENTS.includes(bed)) {
    throw new Error("Bed assignment must be A or B.");
  }
  if (bed && activeInRoom.some((item) => item.bedAssignment === bed)) {
    throw new Error(`Bed ${bed} is already assigned in this room.`);
  }

  const overrideReason = input.capacityOverrideReason?.trim() ?? "";
  if (activeInRoom.length >= room.capacity && !overrideReason) {
    throw new Error(
      `Room ${room.roomNumber} is at capacity (${room.capacity}). Provide an override reason to continue.`,
    );
  }

  const checkInDate = input.checkInDate || classSession.startDate;
  const checkOutDate = input.checkOutDate || classSession.endDate;

  const docRef = await addDoc(assignmentsRef, {
    classId: input.classId,
    studentId: input.studentId,
    studentName: `${student.firstName} ${student.lastName}`.trim(),
    departmentName: student.departmentName ?? "",
    femaSid: student.femaSid ?? "",
    courseName: classSession.courseName,
    roomId: room.id,
    roomNumber: room.roomNumber,
    building: room.building ?? "",
    bedAssignment: bed ?? suggestBed(activeInRoom),
    checkInDate,
    checkOutDate,
    status: ASSIGNMENT_STATUSES.ASSIGNED,
    assignedBy: input.assignedByUid,
    notes: input.notes?.trim() ?? "",
    capacityOverride: Boolean(overrideReason),
    overrideReason,
    assignedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeHousingAuditEntry({
    action: overrideReason
      ? HOUSING_AUDIT_ACTIONS.CAPACITY_OVERRIDE
      : HOUSING_AUDIT_ACTIONS.ASSIGNMENT_CREATED,
    entityType: "roomAssignment",
    entityId: docRef.id,
    classId: input.classId,
    studentId: input.studentId,
    roomId: room.id,
    actorUid: input.assignedByUid,
    actorName: input.assignedByName,
    newValue: room.roomNumber,
    notes: overrideReason || input.notes,
  });

  await syncHousingRoster(input.classId);
  return docRef.id;
}

/** @param {RoomAssignmentRecord[]} activeInRoom */
function suggestBed(activeInRoom) {
  const used = new Set(activeInRoom.map((item) => item.bedAssignment).filter(Boolean));
  if (!used.has("A")) return "A";
  if (!used.has("B")) return "B";
  return "";
}

/**
 * @param {string} assignmentId
 * @param {{
 *   roomId: string,
 *   bedAssignment?: string,
 *   assignedByUid: string,
 *   assignedByName?: string,
 *   capacityOverrideReason?: string,
 *   notes?: string,
 * }} input
 */
export async function moveRoomAssignment(assignmentId, input) {
  const assignment = await getRoomAssignment(assignmentId);
  if (!assignment) throw new Error("Assignment not found.");
  if (!ACTIVE_ASSIGNMENT_STATUSES.includes(assignment.status)) {
    throw new Error("Only active assignments can be moved.");
  }

  const room = await getRoom(input.roomId);
  if (!room) throw new Error("Room not found.");
  if (!isRoomAssignable(room)) throw new Error("Target room is not available.");

  const activeInRoom = (await listActiveAssignmentsForRoom(assignment.classId, input.roomId)).filter(
    (item) => item.id !== assignmentId,
  );

  const bed = input.bedAssignment?.toUpperCase() ?? assignment.bedAssignment;
  if (bed && activeInRoom.some((item) => item.bedAssignment === bed)) {
    throw new Error(`Bed ${bed} is already assigned in room ${room.roomNumber}.`);
  }

  const overrideReason = input.capacityOverrideReason?.trim() ?? "";
  if (activeInRoom.length >= room.capacity && !overrideReason) {
    throw new Error(
      `Room ${room.roomNumber} is at capacity (${room.capacity}). Provide an override reason to continue.`,
    );
  }

  await updateDoc(doc(db, "roomAssignments", assignmentId), {
    roomId: room.id,
    roomNumber: room.roomNumber,
    building: room.building ?? "",
    bedAssignment: bed || suggestBed(activeInRoom),
    notes: input.notes?.trim() ?? assignment.notes,
    capacityOverride: Boolean(overrideReason) || assignment.capacityOverride,
    overrideReason: overrideReason || assignment.overrideReason,
    updatedAt: serverTimestamp(),
  });

  await writeHousingAuditEntry({
    action: overrideReason
      ? HOUSING_AUDIT_ACTIONS.CAPACITY_OVERRIDE
      : HOUSING_AUDIT_ACTIONS.ASSIGNMENT_CHANGED,
    entityType: "roomAssignment",
    entityId: assignmentId,
    classId: assignment.classId,
    studentId: assignment.studentId,
    roomId: room.id,
    actorUid: input.assignedByUid,
    actorName: input.assignedByName,
    priorValue: assignment.roomNumber,
    newValue: room.roomNumber,
    notes: overrideReason || input.notes,
  });

  await syncHousingRoster(assignment.classId);
}

/** @param {string} assignmentId @param {{ assignedByUid: string, assignedByName?: string }} input */
export async function removeRoomAssignment(assignmentId, input) {
  const assignment = await getRoomAssignment(assignmentId);
  if (!assignment) throw new Error("Assignment not found.");

  await updateDoc(doc(db, "roomAssignments", assignmentId), {
    status: ASSIGNMENT_STATUSES.CANCELLED,
    updatedAt: serverTimestamp(),
  });

  await writeHousingAuditEntry({
    action: HOUSING_AUDIT_ACTIONS.ASSIGNMENT_REMOVED,
    entityType: "roomAssignment",
    entityId: assignmentId,
    classId: assignment.classId,
    studentId: assignment.studentId,
    roomId: assignment.roomId,
    actorUid: input.assignedByUid,
    actorName: input.assignedByName,
    priorValue: assignment.roomNumber,
  });

  await syncHousingRoster(assignment.classId);
}

/** @param {string} assignmentId @param {{ actorUid: string, actorName?: string }} input */
export async function checkInAssignment(assignmentId, input) {
  const assignment = await getRoomAssignment(assignmentId);
  if (!assignment) throw new Error("Assignment not found.");
  if (assignment.status !== ASSIGNMENT_STATUSES.ASSIGNED) {
    throw new Error("Only assigned students can be checked in.");
  }

  await updateDoc(doc(db, "roomAssignments", assignmentId), {
    status: ASSIGNMENT_STATUSES.CHECKED_IN,
    updatedAt: serverTimestamp(),
  });

  await writeHousingAuditEntry({
    action: HOUSING_AUDIT_ACTIONS.CHECK_IN,
    entityType: "roomAssignment",
    entityId: assignmentId,
    classId: assignment.classId,
    studentId: assignment.studentId,
    roomId: assignment.roomId,
    actorUid: input.actorUid,
    actorName: input.actorName,
    newValue: assignment.roomNumber,
  });

  await syncHousingRoster(assignment.classId);
}

/** @param {string} assignmentId @param {{ actorUid: string, actorName?: string }} input */
export async function checkOutAssignment(assignmentId, input) {
  const assignment = await getRoomAssignment(assignmentId);
  if (!assignment) throw new Error("Assignment not found.");
  if (!ACTIVE_ASSIGNMENT_STATUSES.includes(assignment.status)) {
    throw new Error("Assignment is not active.");
  }

  await updateDoc(doc(db, "roomAssignments", assignmentId), {
    status: ASSIGNMENT_STATUSES.CHECKED_OUT,
    updatedAt: serverTimestamp(),
  });

  await writeHousingAuditEntry({
    action: HOUSING_AUDIT_ACTIONS.CHECK_OUT,
    entityType: "roomAssignment",
    entityId: assignmentId,
    classId: assignment.classId,
    studentId: assignment.studentId,
    roomId: assignment.roomId,
    actorUid: input.actorUid,
    actorName: input.actorName,
    priorValue: assignment.roomNumber,
  });

  await syncHousingRoster(assignment.classId);
}

/** @param {string} assignmentId @param {Partial<RoomAssignmentRecord> & { actorUid: string, actorName?: string }} input */
export async function updateRoomAssignmentDetails(assignmentId, input) {
  const assignment = await getRoomAssignment(assignmentId);
  if (!assignment) throw new Error("Assignment not found.");

  await updateDoc(doc(db, "roomAssignments", assignmentId), {
    bedAssignment: input.bedAssignment?.toUpperCase() ?? assignment.bedAssignment,
    checkInDate: input.checkInDate ?? assignment.checkInDate,
    checkOutDate: input.checkOutDate ?? assignment.checkOutDate,
    notes: input.notes?.trim() ?? assignment.notes,
    updatedAt: serverTimestamp(),
  });

  await writeHousingAuditEntry({
    action: HOUSING_AUDIT_ACTIONS.ASSIGNMENT_CHANGED,
    entityType: "roomAssignment",
    entityId: assignmentId,
    classId: assignment.classId,
    studentId: assignment.studentId,
    roomId: assignment.roomId,
    actorUid: input.actorUid,
    actorName: input.actorName,
    notes: input.notes,
  });

  await syncHousingRoster(assignment.classId);
}

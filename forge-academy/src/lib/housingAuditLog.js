import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "./firebase.js";

export const HOUSING_AUDIT_ACTIONS = {
  ROOM_CREATED: "room_created",
  ROOM_UPDATED: "room_updated",
  ROOM_DEACTIVATED: "room_deactivated",
  ROOM_MAINTENANCE: "room_maintenance",
  ASSIGNMENT_CREATED: "assignment_created",
  ASSIGNMENT_CHANGED: "assignment_changed",
  ASSIGNMENT_REMOVED: "assignment_removed",
  CAPACITY_OVERRIDE: "capacity_override",
  CHECK_IN: "check_in",
  CHECK_OUT: "check_out",
};

const auditRef = collection(db, "housingAuditLog");

/**
 * @param {{
 *   action: string,
 *   entityType: string,
 *   entityId: string,
 *   classId?: string,
 *   studentId?: string,
 *   roomId?: string,
 *   actorUid: string,
 *   actorName?: string,
 *   notes?: string,
 *   priorValue?: string,
 *   newValue?: string,
 * }} input
 */
export async function writeHousingAuditEntry(input) {
  await addDoc(auditRef, {
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    classId: input.classId ?? "",
    studentId: input.studentId ?? "",
    roomId: input.roomId ?? "",
    actorUid: input.actorUid,
    actorName: input.actorName?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    priorValue: input.priorValue ?? "",
    newValue: input.newValue ?? "",
    createdAt: serverTimestamp(),
  });
}

/** @param {string} [classId] */
export async function listHousingAuditEntries(classId) {
  const snap = classId
    ? await getDocs(query(auditRef, where("classId", "==", classId)))
    : await getDocs(query(auditRef));

  return snap.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

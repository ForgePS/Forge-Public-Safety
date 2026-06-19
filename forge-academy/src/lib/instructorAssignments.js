import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { getClassSession, updateClassSession } from "./classes.js";
import { getInstructor, instructorDisplayName } from "./instructors.js";

export const ASSIGNMENT_ROLES = {
  LEAD: "lead",
  ASSISTANT: "assistant",
};

export const ASSIGNMENT_ROLE_LABELS = {
  [ASSIGNMENT_ROLES.LEAD]: "Lead instructor",
  [ASSIGNMENT_ROLES.ASSISTANT]: "Assistant instructor",
};

export const ASSIGNMENT_STATUSES = {
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const ASSIGNMENT_STATUS_LABELS = {
  [ASSIGNMENT_STATUSES.SCHEDULED]: "Scheduled",
  [ASSIGNMENT_STATUSES.COMPLETED]: "Completed",
  [ASSIGNMENT_STATUSES.CANCELLED]: "Cancelled",
};

/**
 * @typedef {Object} InstructorAssignmentRecord
 * @property {string} id
 * @property {string} instructorId
 * @property {string} instructorUserId
 * @property {string} instructorName
 * @property {string} classId
 * @property {string} courseId
 * @property {string} courseName
 * @property {string} courseNumber
 * @property {string} startDate
 * @property {string} endDate
 * @property {string} location
 * @property {string} assignmentRole
 * @property {string} status
 * @property {string} assignedByUid
 */

const assignmentsRef = collection(db, "instructorAssignments");

function mapAssignment(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    instructorId: data.instructorId ?? "",
    instructorUserId: data.instructorUserId ?? "",
    instructorName: data.instructorName ?? "",
    classId: data.classId ?? "",
    courseId: data.courseId ?? "",
    courseName: data.courseName ?? "",
    courseNumber: data.courseNumber ?? "",
    startDate: data.startDate ?? "",
    endDate: data.endDate ?? "",
    location: data.location ?? "",
    assignmentRole: data.assignmentRole ?? ASSIGNMENT_ROLES.LEAD,
    status: data.status ?? ASSIGNMENT_STATUSES.SCHEDULED,
    assignedByUid: data.assignedByUid ?? "",
  };
}

/** @returns {Promise<InstructorAssignmentRecord[]>} */
export async function listInstructorAssignments() {
  const snap = await getDocs(query(assignmentsRef));
  return snap.docs
    .map((item) => mapAssignment(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** @param {string} instructorId */
export async function listAssignmentsByInstructorId(instructorId) {
  const snap = await getDocs(
    query(assignmentsRef, where("instructorId", "==", instructorId)),
  );
  return snap.docs
    .map((item) => mapAssignment(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** @param {string} userId */
export async function listAssignmentsByInstructorUserId(userId) {
  if (!userId) return [];
  const snap = await getDocs(
    query(assignmentsRef, where("instructorUserId", "==", userId)),
  );
  return snap.docs
    .map((item) => mapAssignment(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** @param {string} classId */
export async function listAssignmentsByClassId(classId) {
  const snap = await getDocs(query(assignmentsRef, where("classId", "==", classId)));
  return snap.docs.map((item) => mapAssignment(item.id, item.data())).filter(Boolean);
}

/**
 * @param {{ instructorId: string, classId: string, assignmentRole?: string, assignedByUid: string }} input
 */
export async function assignInstructorToClass(input) {
  const [instructor, classSession, existingForClass] = await Promise.all([
    getInstructor(input.instructorId),
    getClassSession(input.classId),
    listAssignmentsByClassId(input.classId),
  ]);

  if (!instructor) throw new Error("Instructor not found.");
  if (!classSession) throw new Error("Class session not found.");
  if (!instructor.userId) {
    throw new Error("Link this instructor to a portal user account before assigning classes.");
  }

  const duplicate = existingForClass.find(
    (assignment) =>
      assignment.instructorId === input.instructorId &&
      assignment.status === ASSIGNMENT_STATUSES.SCHEDULED,
  );
  if (duplicate) throw new Error("This instructor is already assigned to the class.");

  const docRef = await addDoc(assignmentsRef, {
    instructorId: instructor.id,
    instructorUserId: instructor.userId,
    instructorName: instructorDisplayName(instructor),
    classId: classSession.id,
    courseId: classSession.courseId,
    courseName: classSession.courseName,
    courseNumber: classSession.courseNumber,
    startDate: classSession.startDate,
    endDate: classSession.endDate,
    location: classSession.location,
    assignmentRole: input.assignmentRole || ASSIGNMENT_ROLES.LEAD,
    status: ASSIGNMENT_STATUSES.SCHEDULED,
    assignedByUid: input.assignedByUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (!classSession.instructorIds.includes(instructor.userId)) {
    const instructorIds = [...classSession.instructorIds, instructor.userId];
    const instructorNames = [...classSession.instructorNames, instructorDisplayName(instructor)];
    await updateClassSession(classSession.id, { instructorIds, instructorNames });
  }

  return docRef.id;
}

/** @param {string} assignmentId */
export async function cancelInstructorAssignment(assignmentId) {
  await updateDoc(doc(db, "instructorAssignments", assignmentId), {
    status: ASSIGNMENT_STATUSES.CANCELLED,
    updatedAt: serverTimestamp(),
  });
}

/** @param {InstructorAssignmentRecord[]} assignments */
export function getUpcomingAssignments(assignments) {
  const today = new Date().toISOString().slice(0, 10);
  return assignments.filter(
    (assignment) =>
      assignment.status === ASSIGNMENT_STATUSES.SCHEDULED && assignment.endDate >= today,
  );
}

/** @param {InstructorAssignmentRecord[]} assignments */
export function getTeachingHistory(assignments) {
  const today = new Date().toISOString().slice(0, 10);
  return assignments.filter(
    (assignment) =>
      assignment.status === ASSIGNMENT_STATUSES.COMPLETED || assignment.endDate < today,
  );
}

/** @param {InstructorAssignmentRecord[]} assignments */
export function getInstructorAnalytics(assignments) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    upcoming: assignments.filter(
      (assignment) =>
        assignment.status === ASSIGNMENT_STATUSES.SCHEDULED && assignment.endDate >= today,
    ).length,
    completed: assignments.filter(
      (assignment) =>
        assignment.status === ASSIGNMENT_STATUSES.COMPLETED || assignment.endDate < today,
    ).length,
    total: assignments.filter((assignment) => assignment.status !== ASSIGNMENT_STATUSES.CANCELLED)
      .length,
  };
}

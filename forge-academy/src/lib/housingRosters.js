import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { getClassSession, isHousingRequired } from "./classes.js";
import { listEnrolledRegistrationsByClass } from "./registrations.js";
import { listAssignmentsByClass, ASSIGNMENT_STATUSES } from "./roomAssignments.js";

/**
 * @typedef {Object} HousingRosterRecord
 * @property {string} classId
 * @property {string} courseName
 * @property {number} enrolledCount
 * @property {number} assignedCount
 * @property {number} checkedInCount
 * @property {number} needingAssignment
 * @property {string} updatedAt
 */

/** @param {string} classId */
export async function syncHousingRoster(classId) {
  const classSession = await getClassSession(classId);
  if (!classSession || !isHousingRequired(classSession)) return;

  const [enrolled, assignments] = await Promise.all([
    listEnrolledRegistrationsByClass(classId),
    listAssignmentsByClass(classId),
  ]);

  const activeAssignments = assignments.filter((item) =>
    [ASSIGNMENT_STATUSES.ASSIGNED, ASSIGNMENT_STATUSES.CHECKED_IN].includes(item.status),
  );

  const payload = {
    classId,
    courseName: classSession.courseName,
    courseNumber: classSession.courseNumber,
    startDate: classSession.startDate,
    endDate: classSession.endDate,
    enrolledCount: enrolled.length,
    assignedCount: activeAssignments.length,
    checkedInCount: activeAssignments.filter((item) => item.status === ASSIGNMENT_STATUSES.CHECKED_IN)
      .length,
    needingAssignment: Math.max(enrolled.length - activeAssignments.length, 0),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "housingRosters", classId), payload, { merge: true });
}

/** @param {string} classId @returns {Promise<HousingRosterRecord | null>} */
export async function getHousingRosterSummary(classId) {
  const snap = await getDoc(doc(db, "housingRosters", classId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    classId,
    courseName: data.courseName ?? "",
    enrolledCount: Number(data.enrolledCount ?? 0),
    assignedCount: Number(data.assignedCount ?? 0),
    checkedInCount: Number(data.checkedInCount ?? 0),
    needingAssignment: Number(data.needingAssignment ?? 0),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? "",
  };
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { CLASS_STATUSES, getClassSession, listClassSessions, listClassSessionsByInstructor } from "./classes.js";
import {
  REGISTRATION_STATUSES,
  listEnrolledRegistrationsByClass,
} from "./registrations.js";

export const ATTENDANCE_STATUSES = {
  UNMARKED: "unmarked",
  PRESENT: "present",
  ABSENT: "absent",
  EXCUSED: "excused",
  TARDY: "tardy",
};

export const ATTENDANCE_STATUS_LABELS = {
  [ATTENDANCE_STATUSES.UNMARKED]: "Unmarked",
  [ATTENDANCE_STATUSES.PRESENT]: "Present",
  [ATTENDANCE_STATUSES.ABSENT]: "Absent",
  [ATTENDANCE_STATUSES.EXCUSED]: "Excused",
  [ATTENDANCE_STATUSES.TARDY]: "Tardy",
};

/**
 * @typedef {Object} AttendanceRecord
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} departmentName
 * @property {string} registrationId
 * @property {string} status
 * @property {string} notes
 */

/**
 * @typedef {Object} AttendanceDayRecord
 * @property {string} id
 * @property {string} classId
 * @property {string} sessionDate
 * @property {string} courseName
 * @property {string} courseNumber
 * @property {boolean} finalized
 * @property {AttendanceRecord[]} records
 * @property {string} savedByUid
 * @property {string} finalizedByUid
 * @property {import('firebase/firestore').Timestamp | null} createdAt
 * @property {import('firebase/firestore').Timestamp | null} updatedAt
 * @property {import('firebase/firestore').Timestamp | null} finalizedAt
 */

const attendanceDaysRef = collection(db, "attendanceDays");

/** @param {string} classId @param {string} sessionDate */
export function attendanceDayId(classId, sessionDate) {
  return `${classId}_${sessionDate}`;
}

/**
 * @param {{ startDate: string, endDate: string }} classSession
 * @returns {string[]}
 */
export function getClassSessionDates(classSession) {
  if (!classSession.startDate || !classSession.endDate) return [];

  const dates = [];
  const cursor = new Date(`${classSession.startDate}T00:00:00`);
  const end = new Date(`${classSession.endDate}T00:00:00`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

/** @returns {string} */
export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param {unknown} data
 * @returns {AttendanceDayRecord | null}
 */
export function mapAttendanceDay(id, data) {
  if (!data || typeof data !== "object") return null;

  return {
    id,
    classId: data.classId ?? "",
    sessionDate: data.sessionDate ?? "",
    courseName: data.courseName ?? "",
    courseNumber: data.courseNumber ?? "",
    finalized: Boolean(data.finalized),
    records: Array.isArray(data.records)
      ? data.records.map((record) => ({
          studentId: record.studentId ?? "",
          studentName: record.studentName ?? "",
          departmentName: record.departmentName ?? "",
          registrationId: record.registrationId ?? "",
          status: record.status ?? ATTENDANCE_STATUSES.UNMARKED,
          notes: record.notes ?? "",
        }))
      : [],
    savedByUid: data.savedByUid ?? "",
    finalizedByUid: data.finalizedByUid ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    finalizedAt: data.finalizedAt ?? null,
  };
}

/** @param {string} classId @param {string} sessionDate */
export async function getAttendanceDay(classId, sessionDate) {
  const snap = await getDoc(doc(db, "attendanceDays", attendanceDayId(classId, sessionDate)));
  if (!snap.exists()) return null;
  return mapAttendanceDay(snap.id, snap.data());
}

/** @param {string} classId */
export async function listAttendanceDaysForClass(classId) {
  const snap = await getDocs(query(attendanceDaysRef, where("classId", "==", classId)));
  return snap.docs
    .map((item) => mapAttendanceDay(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
}

/**
 * @param {import('./registrations.js').RegistrationRecord[]} enrolled
 * @param {AttendanceRecord[]} [existingRecords]
 * @returns {AttendanceRecord[]}
 */
export function buildAttendanceRecords(enrolled, existingRecords = []) {
  const existingByStudent = new Map(existingRecords.map((record) => [record.studentId, record]));

  return enrolled
    .map((registration) => {
      const existing = existingByStudent.get(registration.studentId);
      return {
        studentId: registration.studentId,
        studentName: registration.studentName,
        departmentName: registration.departmentName,
        registrationId: registration.id,
        status: existing?.status ?? ATTENDANCE_STATUSES.UNMARKED,
        notes: existing?.notes ?? "",
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/**
 * @param {string} classId
 * @param {string} sessionDate
 * @returns {Promise<AttendanceDayRecord>}
 */
export async function loadAttendanceSheet(classId, sessionDate) {
  const [classSession, enrolled, existing] = await Promise.all([
    getClassSession(classId),
    listEnrolledRegistrationsByClass(classId),
    getAttendanceDay(classId, sessionDate),
  ]);

  if (!classSession) throw new Error("Class session not found.");

  const validDates = getClassSessionDates(classSession);
  if (!validDates.includes(sessionDate)) {
    throw new Error("Selected date is outside this class schedule.");
  }

  const records = buildAttendanceRecords(enrolled, existing?.records ?? []);

  return {
    id: attendanceDayId(classId, sessionDate),
    classId,
    sessionDate,
    courseName: classSession.courseName,
    courseNumber: classSession.courseNumber,
    finalized: existing?.finalized ?? false,
    records,
    savedByUid: existing?.savedByUid ?? "",
    finalizedByUid: existing?.finalizedByUid ?? "",
    createdAt: existing?.createdAt ?? null,
    updatedAt: existing?.updatedAt ?? null,
    finalizedAt: existing?.finalizedAt ?? null,
  };
}

/**
 * @param {string} classId
 * @param {string} sessionDate
 * @param {AttendanceRecord[]} records
 * @param {string} savedByUid
 */
export async function saveAttendanceDay(classId, sessionDate, records, savedByUid) {
  const existing = await getAttendanceDay(classId, sessionDate);
  if (existing?.finalized) {
    throw new Error("This attendance sheet is finalized and cannot be edited.");
  }

  const classSession = await getClassSession(classId);
  if (!classSession) throw new Error("Class session not found.");

  const payload = {
    classId,
    sessionDate,
    courseName: classSession.courseName,
    courseNumber: classSession.courseNumber,
    finalized: false,
    records: records.map((record) => ({
      studentId: record.studentId,
      studentName: record.studentName,
      departmentName: record.departmentName,
      registrationId: record.registrationId,
      status: record.status || ATTENDANCE_STATUSES.UNMARKED,
      notes: record.notes?.trim() ?? "",
    })),
    savedByUid,
    updatedAt: serverTimestamp(),
  };

  const ref = doc(db, "attendanceDays", attendanceDayId(classId, sessionDate));
  if (existing) {
    await updateDoc(ref, payload);
  } else {
    await setDoc(ref, {
      ...payload,
      finalizedByUid: "",
      createdAt: serverTimestamp(),
    });
  }
}

/**
 * @param {string} classId
 * @param {string} sessionDate
 * @param {AttendanceRecord[]} records
 * @param {string} finalizedByUid
 */
export async function finalizeAttendanceDay(classId, sessionDate, records, finalizedByUid) {
  const unmarked = records.filter((record) => record.status === ATTENDANCE_STATUSES.UNMARKED);
  if (unmarked.length) {
    throw new Error("Mark attendance for every student before finalizing.");
  }

  const classSession = await getClassSession(classId);
  if (!classSession) throw new Error("Class session not found.");

  const ref = doc(db, "attendanceDays", attendanceDayId(classId, sessionDate));
  await setDoc(
    ref,
    {
      classId,
      sessionDate,
      courseName: classSession.courseName,
      courseNumber: classSession.courseNumber,
      finalized: true,
      records: records.map((record) => ({
        studentId: record.studentId,
        studentName: record.studentName,
        departmentName: record.departmentName,
        registrationId: record.registrationId,
        status: record.status,
        notes: record.notes?.trim() ?? "",
      })),
      savedByUid: finalizedByUid,
      finalizedByUid,
      finalizedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** @param {AttendanceDayRecord | null} day */
export function summarizeAttendanceDay(day) {
  if (!day) {
    return { present: 0, absent: 0, excused: 0, tardy: 0, unmarked: 0, total: 0 };
  }

  return day.records.reduce(
    (summary, record) => {
      summary.total += 1;
      if (record.status === ATTENDANCE_STATUSES.PRESENT) summary.present += 1;
      else if (record.status === ATTENDANCE_STATUSES.ABSENT) summary.absent += 1;
      else if (record.status === ATTENDANCE_STATUSES.EXCUSED) summary.excused += 1;
      else if (record.status === ATTENDANCE_STATUSES.TARDY) summary.tardy += 1;
      else summary.unmarked += 1;
      return summary;
    },
    { present: 0, absent: 0, excused: 0, tardy: 0, unmarked: 0, total: 0 },
  );
}

/**
 * @param {import('./classes.js').ClassSessionRecord} classSession
 * @param {AttendanceDayRecord[]} attendanceDays
 */
export function getIncompleteAttendanceDates(classSession, attendanceDays) {
  const today = todayDateString();
  const expectedDates = getClassSessionDates(classSession).filter((date) => date <= today);
  const finalizedDates = new Set(
    attendanceDays.filter((day) => day.finalized).map((day) => day.sessionDate),
  );

  return expectedDates.filter((date) => !finalizedDates.has(date));
}

/** @param {string} instructorId */
export async function countIncompleteAttendanceForInstructor(instructorId) {
  const sessions = await listClassSessionsByInstructor(instructorId);
  const activeSessions = sessions.filter((session) =>
    [CLASS_STATUSES.IN_PROGRESS, CLASS_STATUSES.OPEN, CLASS_STATUSES.FULL, CLASS_STATUSES.COMPLETED].includes(
      session.status,
    ),
  );

  let count = 0;
  for (const session of activeSessions) {
    const days = await listAttendanceDaysForClass(session.id);
    count += getIncompleteAttendanceDates(session, days).length;
  }
  return count;
}

/** @returns {Promise<number>} */
export async function countIncompleteAttendanceForAdmin() {
  const sessions = await listClassSessions();
  const activeSessions = sessions.filter((session) =>
    [CLASS_STATUSES.IN_PROGRESS, CLASS_STATUSES.COMPLETED].includes(session.status),
  );

  let count = 0;
  for (const session of activeSessions) {
    const days = await listAttendanceDaysForClass(session.id);
    count += getIncompleteAttendanceDates(session, days).length;
  }
  return count;
}

/** @param {AttendanceRecord[]} records */
export function allAttendanceMarked(records) {
  return records.every((record) => record.status !== ATTENDANCE_STATUSES.UNMARKED);
}

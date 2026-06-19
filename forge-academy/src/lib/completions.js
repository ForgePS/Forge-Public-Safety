import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";
import {
  ATTENDANCE_STATUSES,
  getClassSessionDates,
  listAttendanceDaysForClass,
} from "./attendance.js";
import { getClassSession } from "./classes.js";
import { getCourse } from "./courses.js";
import { listEnrolledRegistrationsByClass } from "./registrations.js";
import {
  getStudentSkillSummary,
  studentMeetsSkillRequirements,
} from "./skillEvaluations.js";
import {
  getStudentTestSummary,
  studentMeetsTestRequirements,
} from "./testAttempts.js";

export const COMPLETION_STATUSES = {
  PENDING: "pending",
  ELIGIBLE: "eligible",
  INELIGIBLE: "ineligible",
  ISSUED: "issued",
  NOT_APPLICABLE: "not_applicable",
};

export const COMPLETION_STATUS_LABELS = {
  [COMPLETION_STATUSES.PENDING]: "Pending attendance",
  [COMPLETION_STATUSES.ELIGIBLE]: "Eligible for certificate",
  [COMPLETION_STATUSES.INELIGIBLE]: "Did not meet requirements",
  [COMPLETION_STATUSES.ISSUED]: "Certificate issued",
  [COMPLETION_STATUSES.NOT_APPLICABLE]: "No certificate for course",
};

/**
 * @typedef {Object} CompletionRecord
 * @property {string} id
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} classId
 * @property {string} courseId
 * @property {string} courseName
 * @property {string} courseNumber
 * @property {number} hours
 * @property {string} registrationId
 * @property {string} status
 * @property {boolean} attendanceComplete
 * @property {string} certificateId
 * @property {string} notes
 */

const completionsRef = collection(db, "completions");

/** @param {string} classId @param {string} studentId */
export function completionId(classId, studentId) {
  return `${classId}_${studentId}`;
}

function mapCompletion(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    classId: data.classId ?? "",
    courseId: data.courseId ?? "",
    courseName: data.courseName ?? "",
    courseNumber: data.courseNumber ?? "",
    hours: Number(data.hours ?? 0),
    registrationId: data.registrationId ?? "",
    status: data.status ?? COMPLETION_STATUSES.PENDING,
    attendanceComplete: Boolean(data.attendanceComplete),
    certificateId: data.certificateId ?? "",
    notes: data.notes ?? "",
  };
}

/** @param {string} classId @param {string} studentId */
export async function getCompletion(classId, studentId) {
  const snap = await getDoc(doc(db, "completions", completionId(classId, studentId)));
  if (!snap.exists()) return null;
  return mapCompletion(snap.id, snap.data());
}

/** @param {string} classId */
export async function listCompletionsByClass(classId) {
  const snap = await getDocs(query(completionsRef, where("classId", "==", classId)));
  return snap.docs
    .map((item) => mapCompletion(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/** @returns {Promise<CompletionRecord[]>} */
export async function listEligibleCompletions() {
  const snap = await getDocs(
    query(completionsRef, where("status", "==", COMPLETION_STATUSES.ELIGIBLE)),
  );
  return snap.docs.map((item) => mapCompletion(item.id, item.data())).filter(Boolean);
}

/** @param {string} studentId */
export async function listCompletionsByStudent(studentId) {
  const snap = await getDocs(query(completionsRef, where("studentId", "==", studentId)));
  return snap.docs.map((item) => mapCompletion(item.id, item.data())).filter(Boolean);
}

/**
 * @param {import('./attendance.js').AttendanceDayRecord[]} attendanceDays
 * @param {string} studentId
 * @param {string[]} expectedDates
 */
export function studentMeetsAttendanceRequirement(attendanceDays, studentId, expectedDates) {
  for (const date of expectedDates) {
    const day = attendanceDays.find((item) => item.sessionDate === date && item.finalized);
    if (!day) return false;

    const record = day.records.find((item) => item.studentId === studentId);
    if (!record) return false;

    if (
      record.status === ATTENDANCE_STATUSES.ABSENT ||
      record.status === ATTENDANCE_STATUSES.UNMARKED
    ) {
      return false;
    }
  }
  return true;
}

/** @param {string} classId */
export async function evaluateClassCompletions(classId) {
  const classSession = await getClassSession(classId);
  if (!classSession) throw new Error("Class session not found.");

  const [course, enrolled, attendanceDays] = await Promise.all([
    getCourse(classSession.courseId),
    listEnrolledRegistrationsByClass(classId),
    listAttendanceDaysForClass(classId),
  ]);

  if (!course) throw new Error("Course not found.");

  const expectedDates = getClassSessionDates(classSession);
  const allDaysFinalized =
    expectedDates.length > 0 &&
    expectedDates.every((date) =>
      attendanceDays.some((day) => day.sessionDate === date && day.finalized),
    );

  const results = [];

  for (const registration of enrolled) {
    const existing = await getCompletion(classId, registration.studentId);
    if (existing?.status === COMPLETION_STATUSES.ISSUED) {
      results.push(existing);
      continue;
    }

    let status = COMPLETION_STATUSES.PENDING;
    let notes = "";

    if (!course.certificateIssued) {
      status = COMPLETION_STATUSES.NOT_APPLICABLE;
      notes = "Course is not configured to issue certificates.";
    } else if (!allDaysFinalized) {
      status = COMPLETION_STATUSES.PENDING;
      notes = "Waiting for all class days to have finalized attendance.";
    } else if (
      !studentMeetsAttendanceRequirement(attendanceDays, registration.studentId, expectedDates)
    ) {
      status = COMPLETION_STATUSES.INELIGIBLE;
      notes = "Student did not meet attendance requirements.";
    } else {
      let eligible = true;
      let pending = false;

      if (course.skillsRequired) {
        const skillsMet = await studentMeetsSkillRequirements(classId, registration.studentId);
        if (!skillsMet) {
          const skillSummary = await getStudentSkillSummary(classId, registration.studentId);
          if (skillSummary.total === 0 || skillSummary.pending > 0 || skillSummary.remediate > 0) {
            pending = true;
            notes = "Skills evaluations are incomplete.";
          } else {
            eligible = false;
            notes = "Student did not pass required skills evaluations.";
          }
        }
      }

      if (eligible && !pending && course.testRequired) {
        const testsMet = await studentMeetsTestRequirements(classId, registration.studentId);
        if (!testsMet) {
          const testSummary = await getStudentTestSummary(classId, registration.studentId);
          if (testSummary.total === 0 || testSummary.pending > 0) {
            pending = true;
            notes = "Written test results are incomplete.";
          } else {
            eligible = false;
            notes = "Student did not pass required written test.";
          }
        }
      }

      if (pending) {
        status = COMPLETION_STATUSES.PENDING;
      } else if (eligible) {
        status = COMPLETION_STATUSES.ELIGIBLE;
      } else {
        status = COMPLETION_STATUSES.INELIGIBLE;
      }
    }

    const payload = {
      studentId: registration.studentId,
      studentName: registration.studentName,
      classId,
      courseId: course.id,
      courseName: course.name,
      courseNumber: course.courseNumber,
      hours: course.hours,
      registrationId: registration.id,
      status,
      attendanceComplete: allDaysFinalized,
      certificateId: existing?.certificateId ?? "",
      notes,
      updatedAt: serverTimestamp(),
    };

    const id = completionId(classId, registration.studentId);
    const ref = doc(db, "completions", id);
    const prior = await getDoc(ref);
    if (prior.exists()) {
      await setDoc(ref, payload, { merge: true });
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    }

    results.push(mapCompletion(id, payload));
  }

  return results;
}

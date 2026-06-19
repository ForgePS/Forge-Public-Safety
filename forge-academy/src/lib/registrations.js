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
import {
  adjustClassEnrollmentCounts,
  getClassSession,
  isOnCampusClass,
  CLASS_STATUSES,
} from "./classes.js";
import { getStudent, STUDENT_STATUSES } from "./students.js";

export const REGISTRATION_STATUSES = {
  PENDING_DEPARTMENT: "pending_department",
  PENDING_ACADEMY: "pending_academy",
  ENROLLED: "enrolled",
  WAITLISTED: "waitlisted",
  DENIED: "denied",
  CANCELLED: "cancelled",
};

export const REGISTRATION_STATUS_LABELS = {
  [REGISTRATION_STATUSES.PENDING_DEPARTMENT]: "Awaiting department",
  [REGISTRATION_STATUSES.PENDING_ACADEMY]: "Awaiting academy",
  [REGISTRATION_STATUSES.ENROLLED]: "Enrolled",
  [REGISTRATION_STATUSES.WAITLISTED]: "Waitlisted",
  [REGISTRATION_STATUSES.DENIED]: "Denied",
  [REGISTRATION_STATUSES.CANCELLED]: "Cancelled",
};

export const ACTIVE_REGISTRATION_STATUSES = [
  REGISTRATION_STATUSES.PENDING_DEPARTMENT,
  REGISTRATION_STATUSES.PENDING_ACADEMY,
  REGISTRATION_STATUSES.ENROLLED,
  REGISTRATION_STATUSES.WAITLISTED,
];

export const CAMPUS_MEAL_LODGING_OPTIONS = {
  LODGING_AND_FOOD: "lodging_and_food",
  LODGING_ONLY: "lodging_only",
  FOOD_ONLY: "food_only",
};

export const CAMPUS_MEAL_LODGING_LABELS = {
  [CAMPUS_MEAL_LODGING_OPTIONS.LODGING_AND_FOOD]: "Lodging & food",
  [CAMPUS_MEAL_LODGING_OPTIONS.LODGING_ONLY]: "Lodging only",
  [CAMPUS_MEAL_LODGING_OPTIONS.FOOD_ONLY]: "Food only",
};

/**
 * @typedef {Object} RegistrationRecord
 * @property {string} id
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} studentEmail
 * @property {string} departmentId
 * @property {string} departmentName
 * @property {string} classId
 * @property {string} courseId
 * @property {string} courseName
 * @property {string} courseNumber
 * @property {string} classStartDate
 * @property {string} classEndDate
 * @property {string} classLocation
 * @property {string} classLocationType
 * @property {string} classStartTime
 * @property {string} classEndTime
 * @property {string} classRegistrationDeadline
 * @property {string} classCancellationDeadline
 * @property {string} classMealLodgingNotes
 * @property {string} classHousingNotes
 * @property {string} catalogDescription
 * @property {string} catalogPrerequisites
 * @property {string} catalogBook
 * @property {string} campusMealLodgingPreference
 * @property {boolean} needsLodging
 * @property {boolean} needsMeals
 * @property {string} status
 * @property {string} notes
 * @property {string} denialReason
 * @property {string} submittedByUid
 * @property {string} departmentApprovedByUid
 * @property {string} academyApprovedByUid
 * @property {import('firebase/firestore').Timestamp | null} departmentApprovedAt
 * @property {import('firebase/firestore').Timestamp | null} academyApprovedAt
 * @property {import('firebase/firestore').Timestamp | null} createdAt
 * @property {import('firebase/firestore').Timestamp | null} updatedAt
 */

const registrationsRef = collection(db, "registrations");

/**
 * @param {unknown} data
 * @returns {RegistrationRecord | null}
 */
export function mapRegistration(id, data) {
  if (!data || typeof data !== "object") return null;

  return {
    id,
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    studentEmail: data.studentEmail ?? "",
    departmentId: data.departmentId ?? "",
    departmentName: data.departmentName ?? "",
    classId: data.classId ?? "",
    courseId: data.courseId ?? "",
    courseName: data.courseName ?? "",
    courseNumber: data.courseNumber ?? "",
    classStartDate: data.classStartDate ?? "",
    classEndDate: data.classEndDate ?? "",
    classLocation: data.classLocation ?? "",
    classLocationType: data.classLocationType ?? "",
    classStartTime: data.classStartTime ?? "",
    classEndTime: data.classEndTime ?? "",
    classRegistrationDeadline: data.classRegistrationDeadline ?? "",
    classCancellationDeadline: data.classCancellationDeadline ?? "",
    classMealLodgingNotes: data.classMealLodgingNotes ?? "",
    classHousingNotes: data.classHousingNotes ?? "",
    catalogDescription: data.catalogDescription ?? "",
    catalogPrerequisites: data.catalogPrerequisites ?? "",
    catalogBook: data.catalogBook ?? "",
    campusMealLodgingPreference: data.campusMealLodgingPreference ?? "",
    needsLodging: Boolean(data.needsLodging),
    needsMeals: Boolean(data.needsMeals),
    status: data.status ?? REGISTRATION_STATUSES.PENDING_ACADEMY,
    notes: data.notes ?? "",
    denialReason: data.denialReason ?? "",
    submittedByUid: data.submittedByUid ?? "",
    departmentApprovedByUid: data.departmentApprovedByUid ?? "",
    academyApprovedByUid: data.academyApprovedByUid ?? "",
    departmentApprovedAt: data.departmentApprovedAt ?? null,
    academyApprovedAt: data.academyApprovedAt ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

/** @returns {Promise<RegistrationRecord[]>} */
export async function listRegistrations() {
  const snap = await getDocs(query(registrationsRef));
  return snap.docs
    .map((item) => mapRegistration(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => b.classStartDate.localeCompare(a.classStartDate));
}

/** @returns {Promise<RegistrationRecord[]>} */
export async function listRegistrationsByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(registrationsRef, where("studentId", "==", studentId)));
  return snap.docs
    .map((item) => mapRegistration(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => b.classStartDate.localeCompare(a.classStartDate));
}

/**
 * @param {string} departmentId
 * @param {string} [status]
 * @returns {Promise<RegistrationRecord[]>}
 */
export async function listRegistrationsByDepartment(departmentId, status) {
  if (!departmentId) return [];

  const snap = await getDocs(query(registrationsRef, where("departmentId", "==", departmentId)));
  let rows = snap.docs.map((item) => mapRegistration(item.id, item.data())).filter(Boolean);

  if (status) {
    rows = rows.filter((row) => row.status === status);
  }

  return rows.sort((a, b) => b.classStartDate.localeCompare(a.classStartDate));
}

/** @returns {Promise<RegistrationRecord[]>} */
export async function listPendingAcademyRegistrations() {
  const snap = await getDocs(
    query(registrationsRef, where("status", "==", REGISTRATION_STATUSES.PENDING_ACADEMY)),
  );
  return snap.docs
    .map((item) => mapRegistration(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.classStartDate.localeCompare(b.classStartDate));
}

/** @returns {Promise<RegistrationRecord[]>} */
export async function listEnrolledRegistrationsByClass(classId) {
  if (!classId) return [];

  const snap = await getDocs(
    query(
      registrationsRef,
      where("classId", "==", classId),
      where("status", "==", REGISTRATION_STATUSES.ENROLLED),
    ),
  );

  return snap.docs
    .map((item) => mapRegistration(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/** @returns {Promise<RegistrationRecord | null>} */
export async function getRegistration(registrationId) {
  const snap = await getDoc(doc(db, "registrations", registrationId));
  if (!snap.exists()) return null;
  return mapRegistration(snap.id, snap.data());
}

/**
 * @param {string} studentId
 * @param {string} classId
 * @returns {Promise<RegistrationRecord | null>}
 */
export async function findActiveRegistration(studentId, classId) {
  const snap = await getDocs(
    query(
      registrationsRef,
      where("studentId", "==", studentId),
      where("classId", "==", classId),
    ),
  );

  return (
    snap.docs
      .map((item) => mapRegistration(item.id, item.data()))
      .find((registration) => ACTIVE_REGISTRATION_STATUSES.includes(registration.status)) ?? null
  );
}

/** @param {string | undefined} preference */
export function deriveCampusMealLodgingFlags(preference) {
  return {
    needsLodging:
      preference === CAMPUS_MEAL_LODGING_OPTIONS.LODGING_AND_FOOD ||
      preference === CAMPUS_MEAL_LODGING_OPTIONS.LODGING_ONLY,
    needsMeals:
      preference === CAMPUS_MEAL_LODGING_OPTIONS.LODGING_AND_FOOD ||
      preference === CAMPUS_MEAL_LODGING_OPTIONS.FOOD_ONLY,
  };
}

/** @param {RegistrationRecord} registration */
export function formatCampusMealLodgingPreference(registration) {
  if (!registration.campusMealLodgingPreference) return "";
  return (
    CAMPUS_MEAL_LODGING_LABELS[registration.campusMealLodgingPreference] ??
    registration.campusMealLodgingPreference
  );
}

/**
 * @param {{
 *   studentId: string,
 *   classId: string,
 *   notes?: string,
 *   campusMealLodgingPreference?: string,
 *   submittedByUid: string,
 * }} input
 * @returns {Promise<string>}
 */
export async function submitRegistration(input) {
  const student = await getStudent(input.studentId);
  if (!student) throw new Error("Student record not found.");
  if (student.status !== STUDENT_STATUSES.ACTIVE) {
    throw new Error("Your student record is inactive. Contact the academy.");
  }

  const classSession = await getClassSession(input.classId);
  if (!classSession) throw new Error("Class session not found.");
  if (![CLASS_STATUSES.OPEN, CLASS_STATUSES.WAITLIST, CLASS_STATUSES.FULL].includes(classSession.status)) {
    throw new Error("This class is not open for registration.");
  }

  if (classSession.registrationDeadline) {
    const today = new Date().toISOString().slice(0, 10);
    if (today > classSession.registrationDeadline) {
      throw new Error("The registration deadline for this class has passed.");
    }
  }

  const existing = await findActiveRegistration(input.studentId, input.classId);
  if (existing) {
    throw new Error("You already have an active registration request for this class.");
  }

  const onCampus = isOnCampusClass(classSession);
  const campusMealLodgingPreference = input.campusMealLodgingPreference?.trim() ?? "";

  if (onCampus && !campusMealLodgingPreference) {
    throw new Error("Select lodging and meal preferences for this on-campus class.");
  }

  if (
    campusMealLodgingPreference &&
    !Object.values(CAMPUS_MEAL_LODGING_OPTIONS).includes(campusMealLodgingPreference)
  ) {
    throw new Error("Invalid lodging and meal preference.");
  }

  const mealLodgingFlags = deriveCampusMealLodgingFlags(campusMealLodgingPreference);

  const initialStatus = student.departmentId
    ? REGISTRATION_STATUSES.PENDING_DEPARTMENT
    : REGISTRATION_STATUSES.PENDING_ACADEMY;

  const docRef = await addDoc(registrationsRef, {
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`.trim(),
    studentEmail: student.email,
    departmentId: student.departmentId,
    departmentName: student.departmentName,
    classId: classSession.id,
    courseId: classSession.courseId,
    courseName: classSession.courseName,
    courseNumber: classSession.courseNumber,
    classStartDate: classSession.startDate,
    classEndDate: classSession.endDate,
    classLocation: classSession.location,
    classLocationType: classSession.locationType,
    classStartTime: classSession.startTime,
    classEndTime: classSession.endTime,
    classRegistrationDeadline: classSession.registrationDeadline,
    classCancellationDeadline: classSession.cancellationDeadline,
    classMealLodgingNotes: classSession.mealLodgingNotes,
    classHousingNotes: classSession.housingNotes,
    catalogDescription: classSession.catalogDescription ?? "",
    catalogPrerequisites: classSession.catalogPrerequisites ?? "",
    catalogBook: classSession.catalogBook ?? "",
    campusMealLodgingPreference,
    needsLodging: mealLodgingFlags.needsLodging,
    needsMeals: mealLodgingFlags.needsMeals,
    status: initialStatus,
    notes: input.notes?.trim() ?? "",
    denialReason: "",
    submittedByUid: input.submittedByUid,
    departmentApprovedByUid: "",
    academyApprovedByUid: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/** @param {string} registrationId @param {string} approverUid */
export async function approveDepartmentRegistration(registrationId, approverUid) {
  const registration = await getRegistration(registrationId);
  if (!registration) throw new Error("Registration not found.");
  if (registration.status !== REGISTRATION_STATUSES.PENDING_DEPARTMENT) {
    throw new Error("Registration is not awaiting department approval.");
  }

  await updateDoc(doc(db, "registrations", registrationId), {
    status: REGISTRATION_STATUSES.PENDING_ACADEMY,
    departmentApprovedByUid: approverUid,
    departmentApprovedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {string} registrationId
 * @param {string} approverUid
 * @param {string} reason
 */
export async function denyDepartmentRegistration(registrationId, approverUid, reason) {
  const registration = await getRegistration(registrationId);
  if (!registration) throw new Error("Registration not found.");
  if (registration.status !== REGISTRATION_STATUSES.PENDING_DEPARTMENT) {
    throw new Error("Registration is not awaiting department approval.");
  }

  await updateDoc(doc(db, "registrations", registrationId), {
    status: REGISTRATION_STATUSES.DENIED,
    denialReason: reason?.trim() || "Denied by department training officer.",
    departmentApprovedByUid: approverUid,
    departmentApprovedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** @param {string} registrationId @param {string} approverUid */
export async function approveAcademyRegistration(registrationId, approverUid) {
  const registration = await getRegistration(registrationId);
  if (!registration) throw new Error("Registration not found.");
  if (registration.status !== REGISTRATION_STATUSES.PENDING_ACADEMY) {
    throw new Error("Registration is not awaiting academy approval.");
  }

  const classSession = await getClassSession(registration.classId);
  if (!classSession) throw new Error("Class session not found.");

  const openSeats = Math.max(classSession.enrollmentCap - classSession.enrolledCount, 0);
  const waitlistOpen = Math.max(classSession.waitlistCap - classSession.waitlistCount, 0);

  let nextStatus = REGISTRATION_STATUSES.ENROLLED;
  if (openSeats <= 0) {
    if (waitlistOpen <= 0) {
      throw new Error("This class and waitlist are full.");
    }
    nextStatus = REGISTRATION_STATUSES.WAITLISTED;
  }

  await updateDoc(doc(db, "registrations", registrationId), {
    status: nextStatus,
    academyApprovedByUid: approverUid,
    academyApprovedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await adjustClassEnrollmentCounts(
    registration.classId,
    nextStatus === REGISTRATION_STATUSES.ENROLLED ? 1 : 0,
    nextStatus === REGISTRATION_STATUSES.WAITLISTED ? 1 : 0,
  );
}

/**
 * @param {string} registrationId
 * @param {string} approverUid
 * @param {string} reason
 */
export async function denyAcademyRegistration(registrationId, approverUid, reason) {
  const registration = await getRegistration(registrationId);
  if (!registration) throw new Error("Registration not found.");
  if (registration.status !== REGISTRATION_STATUSES.PENDING_ACADEMY) {
    throw new Error("Registration is not awaiting academy approval.");
  }

  await updateDoc(doc(db, "registrations", registrationId), {
    status: REGISTRATION_STATUSES.DENIED,
    denialReason: reason?.trim() || "Denied by academy admin.",
    academyApprovedByUid: approverUid,
    academyApprovedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** @param {string} registrationId */
export async function cancelRegistration(registrationId) {
  const registration = await getRegistration(registrationId);
  if (!registration) throw new Error("Registration not found.");

  if (!ACTIVE_REGISTRATION_STATUSES.includes(registration.status)) {
    throw new Error("This registration cannot be cancelled.");
  }

  const wasEnrolled = registration.status === REGISTRATION_STATUSES.ENROLLED;
  const wasWaitlisted = registration.status === REGISTRATION_STATUSES.WAITLISTED;

  await updateDoc(doc(db, "registrations", registrationId), {
    status: REGISTRATION_STATUSES.CANCELLED,
    updatedAt: serverTimestamp(),
  });

  if (wasEnrolled || wasWaitlisted) {
    await adjustClassEnrollmentCounts(
      registration.classId,
      wasEnrolled ? -1 : 0,
      wasWaitlisted ? -1 : 0,
    );
  }
}

/**
 * @param {RegistrationRecord[]} registrations
 * @param {string} search
 */
export function filterRegistrations(registrations, search) {
  const term = search.trim().toLowerCase();
  if (!term) return registrations;

  return registrations.filter((registration) =>
    [
      registration.studentName,
      registration.departmentName,
      registration.courseName,
      registration.courseNumber,
      registration.classLocation,
      formatCampusMealLodgingPreference(registration),
      REGISTRATION_STATUS_LABELS[registration.status] ?? registration.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
}

/** @returns {Promise<{ pendingDepartment: number, pendingAcademy: number, enrolled: number }>} */
export async function getRegistrationSummary() {
  const registrations = await listRegistrations();
  return {
    pendingDepartment: registrations.filter(
      (item) => item.status === REGISTRATION_STATUSES.PENDING_DEPARTMENT,
    ).length,
    pendingAcademy: registrations.filter(
      (item) => item.status === REGISTRATION_STATUSES.PENDING_ACADEMY,
    ).length,
    enrolled: registrations.filter((item) => item.status === REGISTRATION_STATUSES.ENROLLED).length,
  };
}

/**
 * @param {string} departmentId
 * @returns {Promise<number>}
 */
export async function countPendingDepartmentApprovals(departmentId) {
  const rows = await listRegistrationsByDepartment(
    departmentId,
    REGISTRATION_STATUSES.PENDING_DEPARTMENT,
  );
  return rows.length;
}

/**
 * @param {{ studentIds: string[], classId: string, submittedByUid: string }} input
 */
export async function submitBulkRegistrations(input) {
  const results = [];

  for (const studentId of input.studentIds) {
    try {
      const id = await submitRegistration({
        studentId,
        classId: input.classId,
        submittedByUid: input.submittedByUid,
        notes: "Submitted by department training officer.",
      });
      results.push({ studentId, success: true, registrationId: id });
    } catch (err) {
      results.push({
        studentId,
        success: false,
        error: err instanceof Error ? err.message : "Unable to register student.",
      });
    }
  }

  return results;
}

/**
 * @param {string[]} registrationIds
 * @param {string} approverUid
 * @returns {Promise<{ id: string, success: boolean, error?: string }[]>}
 */
export async function bulkApproveAcademyRegistrations(registrationIds, approverUid) {
  const results = [];
  for (const id of registrationIds) {
    try {
      await approveAcademyRegistration(id, approverUid);
      results.push({ id, success: true });
    } catch (err) {
      results.push({
        id,
        success: false,
        error: err instanceof Error ? err.message : "Unable to approve registration.",
      });
    }
  }
  return results;
}

/**
 * @param {string[]} registrationIds
 * @param {string} approverUid
 * @param {string} reason
 * @returns {Promise<{ id: string, success: boolean, error?: string }[]>}
 */
export async function bulkDenyAcademyRegistrations(registrationIds, approverUid, reason) {
  const results = [];
  for (const id of registrationIds) {
    try {
      await denyAcademyRegistration(id, approverUid, reason);
      results.push({ id, success: true });
    } catch (err) {
      results.push({
        id,
        success: false,
        error: err instanceof Error ? err.message : "Unable to deny registration.",
      });
    }
  }
  return results;
}

/**
 * @param {string[]} registrationIds
 * @returns {Promise<{ id: string, success: boolean, error?: string }[]>}
 */
export async function bulkCancelRegistrations(registrationIds) {
  const results = [];
  for (const id of registrationIds) {
    try {
      await cancelRegistration(id);
      results.push({ id, success: true });
    } catch (err) {
      results.push({
        id,
        success: false,
        error: err instanceof Error ? err.message : "Unable to cancel registration.",
      });
    }
  }
  return results;
}

/**
 * @param {string[]} registrationIds
 * @param {string} notes
 * @param {'replace' | 'append'} mode
 * @returns {Promise<{ id: string, success: boolean, error?: string }[]>}
 */
export async function bulkUpdateRegistrationNotes(registrationIds, notes, mode = "replace") {
  const results = [];

  for (const id of registrationIds) {
    try {
      const registration = await getRegistration(id);
      if (!registration) throw new Error("Registration not found.");

      const nextNotes =
        mode === "append" && registration.notes
          ? `${registration.notes}\n${notes}`.trim()
          : notes.trim();

      await updateDoc(doc(db, "registrations", id), {
        notes: nextNotes,
        updatedAt: serverTimestamp(),
      });
      results.push({ id, success: true });
    } catch (err) {
      results.push({
        id,
        success: false,
        error: err instanceof Error ? err.message : "Unable to update registration notes.",
      });
    }
  }

  return results;
}

import {
  ACTIVE_REGISTRATION_STATUSES,
  listRegistrationsByStudent,
  REGISTRATION_STATUSES,
  REGISTRATION_STATUS_LABELS,
} from "./registrations.js";
import { buildStudentTranscript } from "./transcripts.js";
import { EMPLOYMENT_STATUS_LABELS, STUDENT_STATUSES } from "./students.js";
import { TRANSCRIPT_RESULTS } from "./transcripts.js";
import { LOCATION_TYPE_LABELS } from "./classes.js";

export const TRAINING_HISTORY_VIEWS = {
  UPCOMING: "upcoming",
  CURRENT_YEAR: "current_year",
  PREVIOUS_YEAR: "previous_year",
  ALL_COMPLETED: "all_completed",
};

export const TRAINING_HISTORY_VIEW_LABELS = {
  [TRAINING_HISTORY_VIEWS.UPCOMING]: "Upcoming, ongoing & unconfirmed",
  [TRAINING_HISTORY_VIEWS.CURRENT_YEAR]: "Current year",
  [TRAINING_HISTORY_VIEWS.PREVIOUS_YEAR]: "Previous year",
  [TRAINING_HISTORY_VIEWS.ALL_COMPLETED]: "All completed training",
};

export const YEAR_MODES = {
  CALENDAR: "calendar",
  FISCAL: "fiscal",
};

/**
 * @typedef {Object} ProfileTrainingRow
 * @property {string} key
 * @property {string} classId
 * @property {string} courseName
 * @property {string} courseNumber
 * @property {string} startDate
 * @property {string} endDate
 * @property {number | null} hours
 * @property {string} category
 * @property {string} statusLabel
 * @property {boolean} completed
 * @property {boolean} upcoming
 */

/** @param {{ firstName: string, lastName: string, middleName?: string }} student */
export function formatStudentDisplayName(student) {
  const last = student.lastName?.trim().toUpperCase() ?? "";
  const first = student.firstName?.trim().toUpperCase() ?? "";
  const middle = student.middleName?.trim().toUpperCase();
  return middle ? `${last}, ${first} ${middle.charAt(0)}` : `${last}, ${first}`;
}

/** @param {string} phone */
export function formatStudentPhone(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone || "—";
}

/** @param {{ femaSid?: string, id?: string }} student */
export function formatAcademyId(student) {
  if (student.femaSid) return student.femaSid;
  if (student.id) return student.id.slice(0, 8).toUpperCase();
  return "—";
}

/** @param {string} dateString */
export function formatProfileDate(dateString) {
  if (!dateString) return "—";
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return parsed.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

/** @param {number | null | undefined} hours */
export function formatTrainingHours(hours) {
  if (hours === null || hours === undefined) return "—";
  return `${hours}h 0m`;
}

/** @param {ProfileTrainingRow[]} rows */
export function sumTrainingHours(rows) {
  return rows.reduce((total, row) => total + (row.hours ?? 0), 0);
}

/** @param {number} totalHours */
export function formatHoursSummary(totalHours) {
  return `${totalHours} Hour${totalHours === 1 ? "" : "s"}`;
}

/**
 * @param {"calendar" | "fiscal"} yearMode
 * @param {number} offset 0 = current period, -1 = previous
 * @param {Date} [referenceDate]
 */
export function getReportingPeriodBounds(yearMode, offset = 0, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  if (yearMode === YEAR_MODES.FISCAL) {
    const fiscalStartYear = month >= 6 ? year : year - 1;
    const startYear = fiscalStartYear + offset;
    const endYear = startYear + 1;
    return {
      start: `${startYear}-07-01`,
      end: `${endYear}-06-30`,
      label: `Jul 1, ${startYear} – Jun 30, ${endYear}`,
    };
  }

  const calendarYear = year + offset;
  return {
    start: `${calendarYear}-01-01`,
    end: `${calendarYear}-12-31`,
    label: `Jan 1, ${calendarYear} – Dec 31, ${calendarYear}`,
  };
}

/** @param {string} date @param {string} start @param {string} end */
function dateWithinRange(date, start, end) {
  if (!date) return false;
  return date >= start && date <= end;
}

/** @param {string} date @param {string} start @param {string} end */
function overlapsRange(startDate, endDate, start, end) {
  const from = startDate || endDate;
  const to = endDate || startDate;
  if (!from && !to) return false;
  return dateWithinRange(from, start, end) || dateWithinRange(to, start, end) || (from <= start && to >= end);
}

/**
 * @param {import('./registrations.js').RegistrationRecord[]} registrations
 * @param {import('./transcripts.js').TranscriptEntry[]} transcriptEntries
 * @returns {ProfileTrainingRow[]}
 */
export function buildProfileTrainingRows(registrations, transcriptEntries) {
  const completedByClassId = new Map(
    transcriptEntries
      .filter((entry) => entry.result === TRANSCRIPT_RESULTS.PASS)
      .map((entry) => [entry.classId, entry]),
  );

  const today = new Date().toISOString().slice(0, 10);
  const rows = [];

  for (const registration of registrations) {
    if (
      registration.status === REGISTRATION_STATUSES.CANCELLED ||
      registration.status === REGISTRATION_STATUSES.DENIED
    ) {
      continue;
    }

    const completedEntry = completedByClassId.get(registration.classId);
    const completed = Boolean(completedEntry);
    const upcoming =
      !completed &&
      ACTIVE_REGISTRATION_STATUSES.includes(registration.status) &&
      (registration.classEndDate >= today ||
        [REGISTRATION_STATUSES.PENDING_DEPARTMENT, REGISTRATION_STATUSES.PENDING_ACADEMY].includes(
          registration.status,
        ));

    rows.push({
      key: registration.id,
      classId: registration.classId,
      courseName: registration.courseName,
      courseNumber: registration.courseNumber,
      startDate: registration.classStartDate,
      endDate: registration.classEndDate,
      hours: completedEntry?.hours ?? null,
      category: LOCATION_TYPE_LABELS[registration.classLocationType] ?? registration.classLocationType ?? "",
      statusLabel: completed
        ? "Completed"
        : REGISTRATION_STATUS_LABELS[registration.status] ?? registration.status,
      completed,
      upcoming,
    });
  }

  return rows.sort((a, b) => {
    const aDate = a.startDate || a.endDate || "";
    const bDate = b.startDate || b.endDate || "";
    return bDate.localeCompare(aDate);
  });
}

/**
 * @param {ProfileTrainingRow[]} rows
 * @param {string} view
 * @param {"calendar" | "fiscal"} yearMode
 */
export function filterProfileTrainingRows(rows, view, yearMode = YEAR_MODES.CALENDAR) {
  if (view === TRAINING_HISTORY_VIEWS.UPCOMING) {
    return rows.filter((row) => row.upcoming);
  }

  if (view === TRAINING_HISTORY_VIEWS.ALL_COMPLETED) {
    return rows.filter((row) => row.completed);
  }

  const offset = view === TRAINING_HISTORY_VIEWS.PREVIOUS_YEAR ? -1 : 0;
  const { start, end } = getReportingPeriodBounds(yearMode, offset);

  return rows.filter(
    (row) =>
      row.completed &&
      overlapsRange(row.startDate, row.endDate, start, end),
  );
}

/** @param {import('./students.js').StudentRecord} student */
export function formatMailingAddress(student) {
  const lines = [
    student.mailingAddressLine1,
    student.mailingAddressLine2,
    [student.mailingCity, student.mailingState, student.mailingZip].filter(Boolean).join(", "),
  ].filter(Boolean);

  return lines.length ? lines : null;
}

/** @param {import('./students.js').StudentRecord} student */
export function formatEmergencyContact(student) {
  if (!student.emergencyContactName && !student.emergencyContactPhone) {
    return null;
  }

  const address = [
    student.emergencyContactAddressLine1,
    [student.emergencyContactCity, student.emergencyContactState, student.emergencyContactZip]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    name: student.emergencyContactName || "—",
    relationship: student.emergencyContactRelationship || "",
    phone: student.emergencyContactPhone ? formatStudentPhone(student.emergencyContactPhone) : "—",
    address: address || "—",
  };
}

/** @param {import('./students.js').StudentRecord} student */
export function studentSelfProfileFormFromRecord(student) {
  return {
    phone: student.phone ?? "",
    mailingAddressLine1: student.mailingAddressLine1 ?? "",
    mailingAddressLine2: student.mailingAddressLine2 ?? "",
    mailingCity: student.mailingCity ?? "",
    mailingState: student.mailingState ?? "",
    mailingZip: student.mailingZip ?? "",
    emergencyContactName: student.emergencyContactName ?? "",
    emergencyContactRelationship: student.emergencyContactRelationship ?? "",
    emergencyContactPhone: student.emergencyContactPhone ?? "",
    emergencyContactAddressLine1: student.emergencyContactAddressLine1 ?? "",
    emergencyContactCity: student.emergencyContactCity ?? "",
    emergencyContactState: student.emergencyContactState ?? "",
    emergencyContactZip: student.emergencyContactZip ?? "",
    departmentName: student.departmentName ?? "",
    rank: student.rank ?? "",
    specialConsiderations: student.specialConsiderations ?? "",
  };
}

/** @param {import('./students.js').StudentRecord} student */
export function buildEmploymentRows(student) {
  if (!student.departmentName && !student.rank) return [];

  return [
    {
      organization: student.departmentName || "—",
      roleLine: [student.rank, student.status === STUDENT_STATUSES.ACTIVE ? "Active" : "Inactive"]
        .filter(Boolean)
        .join(" · "),
      employmentType: EMPLOYMENT_STATUS_LABELS[student.employmentStatus] ?? student.employmentStatus,
      supervisor: "—",
      lastHired: student.createdAt?.toDate
        ? student.createdAt.toDate().toLocaleDateString("en-US")
        : "—",
    },
  ];
}

/** @param {string} studentId @returns {Promise<Set<string>>} */
export async function getCompletedCourseIdsForStudent(studentId) {
  if (!studentId) return new Set();

  const [transcript, registrations] = await Promise.all([
    buildStudentTranscript(studentId),
    listRegistrationsByStudent(studentId),
  ]);

  const completedClassIds = new Set(
    transcript.entries
      .filter((entry) => entry.result === TRANSCRIPT_RESULTS.PASS)
      .map((entry) => entry.classId),
  );

  /** @type {Set<string>} */
  const courseIds = new Set();
  for (const registration of registrations) {
    if (completedClassIds.has(registration.classId) && registration.courseId) {
      courseIds.add(registration.courseId);
    }
  }
  return courseIds;
}

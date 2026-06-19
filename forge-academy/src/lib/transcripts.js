import { CERTIFICATE_STATUSES, listCertificatesByStudent } from "./certificates.js";
import { COMPLETION_STATUSES, listCompletionsByStudent } from "./completions.js";
import {
  ACTIVE_REGISTRATION_STATUSES,
  listRegistrationsByStudent,
  REGISTRATION_STATUSES,
} from "./registrations.js";

export const TRANSCRIPT_RESULTS = {
  PASS: "Pass",
  IN_PROGRESS: "In progress",
  FAIL: "Did not complete",
  WITHDRAWN: "Withdrawn",
};

/**
 * @typedef {Object} TranscriptEntry
 * @property {string} courseName
 * @property {string} courseNumber
 * @property {string} completedDate
 * @property {number | null} hours
 * @property {string} result
 * @property {string} certificateNumber
 * @property {string} classId
 * @property {string} sortDate
 */

/**
 * @typedef {Object} StudentTranscript
 * @property {string} studentId
 * @property {TranscriptEntry[]} entries
 * @property {string} generatedAt
 */

/** @param {string} date */
export function formatTranscriptDisplayDate(date) {
  if (!date || date === "In progress") return date;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** @param {string} studentId @returns {Promise<StudentTranscript>} */
export async function buildStudentTranscript(studentId) {
  if (!studentId) {
    return { studentId: "", entries: [], generatedAt: new Date().toISOString() };
  }

  const [certificates, registrations, completions] = await Promise.all([
    listCertificatesByStudent(studentId),
    listRegistrationsByStudent(studentId),
    listCompletionsByStudent(studentId),
  ]);

  /** @type {TranscriptEntry[]} */
  const entries = [];
  const coveredClassIds = new Set();

  for (const certificate of certificates) {
    if (certificate.status !== CERTIFICATE_STATUSES.ISSUED) continue;
    coveredClassIds.add(certificate.classId);
    entries.push({
      courseName: certificate.courseName,
      courseNumber: certificate.courseNumber,
      completedDate: certificate.completionDate,
      hours: certificate.hours,
      result: TRANSCRIPT_RESULTS.PASS,
      certificateNumber: certificate.certificateNumber,
      classId: certificate.classId,
      sortDate: certificate.completionDate,
    });
  }

  for (const registration of registrations) {
    if (coveredClassIds.has(registration.classId)) continue;

    if (registration.status === REGISTRATION_STATUSES.CANCELLED) {
      entries.push({
        courseName: registration.courseName,
        courseNumber: registration.courseNumber,
        completedDate: "—",
        hours: null,
        result: TRANSCRIPT_RESULTS.WITHDRAWN,
        certificateNumber: "—",
        classId: registration.classId,
        sortDate: registration.classEndDate || registration.classStartDate || "0000-01-01",
      });
      continue;
    }

    if (ACTIVE_REGISTRATION_STATUSES.includes(registration.status)) {
      entries.push({
        courseName: registration.courseName,
        courseNumber: registration.courseNumber,
        completedDate: "In progress",
        hours: null,
        result: TRANSCRIPT_RESULTS.IN_PROGRESS,
        certificateNumber: "—",
        classId: registration.classId,
        sortDate: "9999-12-31",
      });
    }
  }

  for (const completion of completions) {
    if (coveredClassIds.has(completion.classId)) continue;
    if (completion.status !== COMPLETION_STATUSES.INELIGIBLE) continue;

    entries.push({
      courseName: completion.courseName,
      courseNumber: completion.courseNumber,
      completedDate: completion.attendanceComplete ? "—" : "In progress",
      hours: completion.hours,
      result: TRANSCRIPT_RESULTS.FAIL,
      certificateNumber: "—",
      classId: completion.classId,
      sortDate: "0000-01-01",
    });
  }

  entries.sort((a, b) => {
    if (a.sortDate === b.sortDate) {
      return a.courseName.localeCompare(b.courseName);
    }
    return b.sortDate.localeCompare(a.sortDate);
  });

  return {
    studentId,
    entries,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {StudentTranscript} transcript
 * @param {{ firstName: string, lastName: string, departmentName?: string, femaSid?: string }} student
 */
export function downloadTranscriptCsv(transcript, student) {
  const lines = [
    "Course,Course Number,Completed,Hours,Result,Certificate",
    ...transcript.entries.map((entry) =>
      [
        csvEscape(entry.courseName),
        csvEscape(entry.courseNumber),
        csvEscape(formatTranscriptDisplayDate(entry.completedDate)),
        entry.hours ?? "—",
        csvEscape(entry.result),
        csvEscape(entry.certificateNumber),
      ].join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${student.lastName}-${student.firstName}-transcript.csv`.replace(/\s+/g, "-");
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

import { listActiveDepartments } from "./departments.js";
import { listClassSessions } from "./classes.js";
import { listInstructors } from "./instructors.js";
import { listStudents } from "./students.js";
import { listTestEligibility } from "./testEligibility.js";
import { listStateCertificationTests } from "./stateCertificationTests.js";
import { listQuestionAnalytics, listAllTestResults, listRemediationAssignments, listRetestRequests, listCertificateReleaseQueue } from "./testGrading.js";

/**
 * @typedef {Object} TestingReportFilters
 * @property {string} startDate
 * @property {string} endDate
 * @property {string} classId
 * @property {string} courseId
 * @property {string} departmentId
 */

export const EMPTY_TESTING_FILTERS = {
  startDate: "",
  endDate: "",
  classId: "",
  courseId: "",
  departmentId: "",
};

function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function csvRow(cells) {
  return cells.map(csvCell).join(",");
}

export function downloadTestingCsv(filename, headers, rows) {
  const lines = [csvRow(headers), ...rows.map((row) => csvRow(row))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function resultDateString(result) {
  if (result.gradedAt?.toDate) {
    return result.gradedAt.toDate().toISOString().slice(0, 10);
  }
  if (result.updatedAt?.toDate) {
    return result.updatedAt.toDate().toISOString().slice(0, 10);
  }
  return "";
}

/**
 * @param {ReturnType<typeof import('./testGrading.js').mapTestResult extends never ? never : any>[]} results
 * @param {TestingReportFilters} filters
 * @param {Map<string, import('./students.js').StudentRecord>} studentMap
 * @param {Map<string, import('./classes.js').ClassSessionRecord>} classMap
 */
export function filterTestResults(results, filters, studentMap, classMap) {
  return results.filter((result) => {
    if (filters.classId && result.classId !== filters.classId) return false;

    const classSession = result.classId ? classMap.get(result.classId) : null;
    if (filters.courseId && classSession?.courseId !== filters.courseId) return false;

    const student = studentMap.get(result.studentId);
    if (filters.departmentId && student?.departmentId !== filters.departmentId) return false;

    const gradedDate = resultDateString(result);
    if (filters.startDate && gradedDate && gradedDate < filters.startDate) return false;
    if (filters.endDate && gradedDate && gradedDate > filters.endDate) return false;
    if (filters.startDate && !gradedDate) return false;
    if (filters.endDate && !gradedDate) return false;

    return true;
  });
}

async function loadContext() {
  const [results, students, classes, departments, instructors] = await Promise.all([
    listAllTestResults(),
    listStudents(),
    listClassSessions(),
    listActiveDepartments(),
    listInstructors(),
  ]);

  return {
    results,
    students,
    classes,
    departments,
    instructors,
    studentMap: new Map(students.map((item) => [item.id, item])),
    classMap: new Map(classes.map((item) => [item.id, item])),
  };
}

/**
 * @param {TestingReportFilters} filters
 */
export async function buildStudentTestingReport(filters = EMPTY_TESTING_FILTERS) {
  const { results, studentMap, classMap } = await loadContext();
  const filtered = filterTestResults(results, filters, studentMap, classMap);

  const headers = [
    "studentId",
    "studentName",
    "department",
    "classId",
    "courseName",
    "testName",
    "score",
    "passFail",
    "attemptNumber",
    "gradedDate",
  ];

  const rows = filtered.map((result) => {
    const student = studentMap.get(result.studentId);
    const classSession = result.classId ? classMap.get(result.classId) : null;
    return [
      result.studentId,
      result.studentName || (student ? `${student.firstName} ${student.lastName}`.trim() : ""),
      student?.departmentName ?? "",
      result.classId ?? "",
      classSession?.courseName ?? "",
      result.testName,
      result.percentage ?? result.score,
      result.passFail,
      result.attemptNumber,
      resultDateString(result),
    ];
  });

  return { headers, rows, count: rows.length };
}

/**
 * @param {TestingReportFilters} filters
 */
export async function buildClassTestingReport(filters = EMPTY_TESTING_FILTERS) {
  const { results, studentMap, classMap } = await loadContext();
  const filtered = filterTestResults(results, filters, studentMap, classMap);

  const byClass = new Map();
  for (const result of filtered) {
    const classId = result.classId || "unassigned";
    const bucket = byClass.get(classId) ?? { pass: 0, fail: 0, pending: 0, totalScore: 0, graded: 0 };
    if (result.passFail === "pass") bucket.pass += 1;
    else if (result.passFail === "fail") bucket.fail += 1;
    else bucket.pending += 1;
    if (result.passFail === "pass" || result.passFail === "fail") {
      bucket.totalScore += Number(result.percentage ?? result.score ?? 0);
      bucket.graded += 1;
    }
    byClass.set(classId, bucket);
  }

  const headers = [
    "classId",
    "courseNumber",
    "courseName",
    "location",
    "studentsTested",
    "passCount",
    "failCount",
    "pendingCount",
    "passRate",
    "averageScore",
  ];

  const rows = [...byClass.entries()].map(([classId, stats]) => {
    const classSession = classId !== "unassigned" ? classMap.get(classId) : null;
    const tested = stats.pass + stats.fail + stats.pending;
    const passRate = stats.pass + stats.fail > 0 ? Math.round((stats.pass / (stats.pass + stats.fail)) * 100) : 0;
    const averageScore = stats.graded > 0 ? Math.round(stats.totalScore / stats.graded) : 0;
    return [
      classId,
      classSession?.courseNumber ?? "",
      classSession?.courseName ?? "Unassigned",
      classSession?.location ?? "",
      tested,
      stats.pass,
      stats.fail,
      stats.pending,
      `${passRate}%`,
      averageScore,
    ];
  });

  return { headers, rows, count: rows.length };
}

/**
 * @param {TestingReportFilters} filters
 */
export async function buildInstructorTestingReport(filters = EMPTY_TESTING_FILTERS) {
  const { results, studentMap, classMap, instructors } = await loadContext();
  const filtered = filterTestResults(results, filters, studentMap, classMap);

  const classInstructors = new Map();
  for (const classSession of classMap.values()) {
    for (const instructorId of classSession.instructorIds ?? []) {
      if (!classInstructors.has(instructorId)) classInstructors.set(instructorId, new Set());
      classInstructors.get(instructorId).add(classSession.id);
    }
  }

  const instructorMap = new Map(
    instructors.map((item) => [item.id, `${item.lastName}, ${item.firstName}`]),
  );

  const byInstructor = new Map();
  for (const result of filtered) {
    if (!result.classId) continue;
    const classSession = classMap.get(result.classId);
    if (!classSession) continue;
    for (const instructorId of classSession.instructorIds ?? []) {
      const bucket = byInstructor.get(instructorId) ?? { pass: 0, fail: 0, pending: 0, classes: new Set() };
      if (result.passFail === "pass") bucket.pass += 1;
      else if (result.passFail === "fail") bucket.fail += 1;
      else bucket.pending += 1;
      bucket.classes.add(result.classId);
      byInstructor.set(instructorId, bucket);
    }
  }

  const headers = [
    "instructorId",
    "instructorName",
    "classesTaught",
    "resultsRecorded",
    "passCount",
    "failCount",
    "pendingCount",
    "passRate",
  ];

  const rows = [...byInstructor.entries()].map(([instructorId, stats]) => {
    const tested = stats.pass + stats.fail;
    const passRate = tested > 0 ? Math.round((stats.pass / tested) * 100) : 0;
    return [
      instructorId,
      instructorMap.get(instructorId) ?? instructorId,
      stats.classes.size,
      stats.pass + stats.fail + stats.pending,
      stats.pass,
      stats.fail,
      stats.pending,
      `${passRate}%`,
    ];
  });

  return { headers, rows, count: rows.length };
}

export async function buildQuestionAnalyticsReport() {
  const analytics = await listQuestionAnalytics();
  const headers = [
    "questionId",
    "testId",
    "timesUsed",
    "correctCount",
    "incorrectCount",
    "percentCorrect",
    "flaggedForReview",
  ];
  const rows = analytics.map((row) => [
    row.questionId ?? "",
    row.testId ?? "",
    row.timesUsed ?? 0,
    row.correctCount ?? 0,
    row.incorrectCount ?? 0,
    row.percentCorrect ?? 0,
    row.flaggedForReview ? "yes" : "no",
  ]);
  return { headers, rows, count: rows.length };
}

/**
 * @param {TestingReportFilters} filters
 */
export async function buildCertificationEligibilityReport(filters = EMPTY_TESTING_FILTERS) {
  const [eligibility, students] = await Promise.all([listTestEligibility(), listStudents()]);
  const studentMap = new Map(students.map((item) => [item.id, item]));

  let rows = eligibility.filter((row) => {
    if (filters.classId && row.classId !== filters.classId) return false;
    if (filters.departmentId) {
      const student = studentMap.get(row.studentId);
      if (student?.departmentId !== filters.departmentId) return false;
    }
    return true;
  });

  const headers = [
    "studentId",
    "studentName",
    "department",
    "classId",
    "testName",
    "attendanceMet",
    "skillsMet",
    "lmsMet",
    "tuitionPaid",
    "instructorApproved",
    "approvedToTest",
    "denialReason",
  ];

  const csvRows = rows.map((row) => {
    const student = studentMap.get(row.studentId);
    return [
      row.studentId,
      row.studentName,
      student?.departmentName ?? "",
      row.classId,
      row.testName,
      row.attendanceMet ? "yes" : "no",
      row.skillsMet ? "yes" : "no",
      row.lmsMet ? "yes" : "no",
      row.tuitionPaid == null ? "" : row.tuitionPaid ? "yes" : "no",
      row.instructorApproved ? "yes" : "no",
      row.approvedToTest ? "yes" : "no",
      row.denialReason ?? "",
    ];
  });

  return { headers, rows: csvRows, count: csvRows.length };
}

/**
 * @param {TestingReportFilters} filters
 */
export async function buildStateTestingReport(filters = EMPTY_TESTING_FILTERS) {
  const [records, students] = await Promise.all([listStateCertificationTests(), listStudents()]);
  const studentMap = new Map(students.map((item) => [item.id, item]));

  const filtered = records.filter((row) => {
    if (filters.departmentId) {
      const student = studentMap.get(row.studentId);
      if (student?.departmentId !== filters.departmentId) return false;
    }
    if (filters.startDate && row.examDate < filters.startDate) return false;
    if (filters.endDate && row.examDate > filters.endDate) return false;
    return true;
  });

  const headers = [
    "studentId",
    "studentName",
    "department",
    "certificationType",
    "examDate",
    "score",
    "passFail",
    "attemptNumber",
    "documentationUrl",
  ];

  const rows = filtered.map((row) => {
    const student = studentMap.get(row.studentId);
    return [
      row.studentId,
      student ? `${student.firstName} ${student.lastName}`.trim() : "",
      student?.departmentName ?? "",
      row.certificationType,
      row.examDate,
      row.score ?? "",
      row.passFail ?? "",
      row.attemptNumber ?? 1,
      row.documentationUrl ?? "",
    ];
  });

  return { headers, rows, count: rows.length };
}

/** @param {TestingReportFilters} filters */
export async function buildPassFailReport(filters = EMPTY_TESTING_FILTERS) {
  return buildStudentTestingReport(filters);
}

export async function buildRemediationReport() {
  const rows = await listRemediationAssignments();
  const headers = ["studentId", "classId", "testResultId", "remediationType", "status", "notes"];
  const csvRows = rows.map((row) => [
    row.studentId,
    row.classId ?? "",
    row.testResultId ?? "",
    row.remediationType ?? "",
    row.status ?? "",
    row.notes ?? "",
  ]);
  return { headers, rows: csvRows, count: csvRows.length };
}

export async function buildCertificateReleaseReport() {
  const pending = await listCertificateReleaseQueue("pending_admin_review");
  const held = await listCertificateReleaseQueue("held");
  const rows = [...pending, ...held];
  const headers = ["studentId", "classId", "courseId", "status", "certificateId"];
  const csvRows = rows.map((row) => [
    row.studentId,
    row.classId ?? "",
    row.courseId ?? "",
    row.status ?? "",
    row.certificateId ?? "",
  ]);
  return { headers, rows: csvRows, count: csvRows.length };
}

export async function buildRetestReport() {
  const rows = await listRetestRequests("requested");
  const headers = ["studentId", "testId", "classId", "attemptNumber", "reason", "status"];
  const csvRows = rows.map((row) => [
    row.studentId,
    row.testId ?? "",
    row.classId ?? "",
    row.attemptNumber ?? "",
    row.reason ?? "",
    row.status ?? "",
  ]);
  return { headers, rows: csvRows, count: csvRows.length };
}

export async function exportTestingReport(reportKey, filters = EMPTY_TESTING_FILTERS) {
  const builders = {
    passFail: () => buildPassFailReport(filters),
    student: () => buildStudentTestingReport(filters),
    class: () => buildClassTestingReport(filters),
    instructor: () => buildInstructorTestingReport(filters),
    questionAnalytics: () => buildQuestionAnalyticsReport(),
    eligibility: () => buildCertificationEligibilityReport(filters),
    state: () => buildStateTestingReport(filters),
    remediation: () => buildRemediationReport(),
    certificateRelease: () => buildCertificateReleaseReport(),
    retest: () => buildRetestReport(),
  };

  const builder = builders[reportKey];
  if (!builder) throw new Error("Unknown report type.");

  const report = await builder();
  const stamp = new Date().toISOString().slice(0, 10);
  downloadTestingCsv(`${reportKey}-report-${stamp}.csv`, report.headers, report.rows);
  return report.count;
}

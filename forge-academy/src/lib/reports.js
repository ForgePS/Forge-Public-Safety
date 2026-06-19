import { CERTIFICATE_STATUSES, listCertificates } from "./certificates.js";
import {
  CLASS_STATUSES,
  getOpenSeats,
  listClassSessions,
  listClassSessionsByInstructor,
} from "./classes.js";
import { listActiveDepartments } from "./departments.js";
import {
  getIncompleteAttendanceDates,
  listAttendanceDaysForClass,
} from "./attendance.js";
import { listCompletionsByClass, COMPLETION_STATUSES } from "./completions.js";
import {
  REGISTRATION_STATUSES,
  listEnrolledRegistrationsByClass,
  listRegistrations,
} from "./registrations.js";
import {
  listPendingStudentCertifications,
  listStudentCertifications,
  STUDENT_CERTIFICATION_STATUSES,
} from "./studentCertifications.js";
import { listStudents, listStudentsByDepartment, STUDENT_STATUSES } from "./students.js";
import { summarizeClassSkillDashboard } from "./skillEvaluations.js";
import { summarizeClassTestDashboard } from "./testAttempts.js";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function endOfWeek(dateString) {
  return addDays(startOfWeek(dateString), 6);
}

function overlapsRange(startDate, endDate, rangeStart, rangeEnd) {
  if (!startDate) return false;
  const start = startDate;
  const end = endDate || startDate;
  return start <= rangeEnd && end >= rangeStart;
}

function monthStart(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * @typedef {Object} AdminAnalyticsReport
 * @property {Object} summary
 * @property {{ departmentName: string, count: number }[]} registrationsByDepartment
 * @property {{ courseName: string, courseNumber: string, enrolled: number }[]} enrollmentsByCourse
 * @property {string} generatedAt
 */

/**
 * @typedef {Object} AdminDashboardMetrics
 * @property {number} classesThisWeek
 * @property {string} classesThisWeekDetail
 * @property {number} openSeats
 * @property {number} openClasses
 * @property {number} pendingCertifications
 */

/** @returns {Promise<AdminDashboardMetrics>} */
export async function getAdminDashboardMetrics() {
  const report = await getAdminAnalyticsReport();
  return {
    classesThisWeek: report.summary.classesThisWeek,
    classesThisWeekDetail: report.summary.classesThisWeekDetail,
    openSeats: report.summary.openSeats,
    openClasses: report.summary.openClasses,
    pendingCertifications: report.summary.pendingCertifications,
  };
}

/** @returns {Promise<AdminAnalyticsReport>} */
export async function getAdminAnalyticsReport() {
  const today = todayString();
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const expiringThreshold = addDays(today, 30);

  const [
    registrations,
    departments,
    certificates,
    studentCertifications,
    classes,
    students,
    pendingCertifications,
  ] = await Promise.all([
    listRegistrations(),
    listActiveDepartments(),
    listCertificates(),
    listStudentCertifications(),
    listClassSessions(),
    listStudents(),
    listPendingStudentCertifications(),
  ]);

  const issuedCertificates = certificates.filter(
    (item) => item.status === CERTIFICATE_STATUSES.ISSUED,
  );
  const studentsTrainedYtd = new Set(
    issuedCertificates
      .filter((item) => item.completionDate >= yearStart)
      .map((item) => item.studentId),
  ).size;

  const openClasses = classes.filter((session) =>
    [CLASS_STATUSES.OPEN, CLASS_STATUSES.FULL, CLASS_STATUSES.WAITLIST].includes(session.status),
  );

  const classesThisWeek = classes.filter((session) =>
    overlapsRange(session.startDate, session.endDate, weekStart, weekEnd),
  );

  const onCampusThisWeek = classesThisWeek.filter(
    (session) => session.locationType === "on_campus",
  ).length;
  const regionalThisWeek = classesThisWeek.filter(
    (session) => session.locationType === "regional",
  ).length;

  const openSeats = openClasses.reduce((sum, session) => sum + getOpenSeats(session), 0);

  const departmentCounts = new Map();
  for (const registration of registrations) {
    if (
      ![
        REGISTRATION_STATUSES.PENDING_DEPARTMENT,
        REGISTRATION_STATUSES.PENDING_ACADEMY,
        REGISTRATION_STATUSES.ENROLLED,
        REGISTRATION_STATUSES.WAITLISTED,
      ].includes(registration.status)
    ) {
      continue;
    }
    const label = registration.departmentName || "Independent";
    departmentCounts.set(label, (departmentCounts.get(label) ?? 0) + 1);
  }

  const courseCounts = new Map();
  for (const registration of registrations.filter(
    (item) => item.status === REGISTRATION_STATUSES.ENROLLED,
  )) {
    const key = `${registration.courseNumber}|${registration.courseName}`;
    const existing = courseCounts.get(key) ?? {
      courseName: registration.courseName,
      courseNumber: registration.courseNumber,
      enrolled: 0,
    };
    existing.enrolled += 1;
    courseCounts.set(key, existing);
  }

  return {
    summary: {
      studentsTrainedYtd,
      activeStudents: students.filter((item) => item.status === STUDENT_STATUSES.ACTIVE).length,
      activeDepartments: departments.length,
      certificatesIssued: issuedCertificates.length,
      expiringIn30Days: studentCertifications.filter(
        (item) =>
          item.expiryDate &&
          item.expiryDate >= today &&
          item.expiryDate <= expiringThreshold &&
          [STUDENT_CERTIFICATION_STATUSES.ACTIVE, STUDENT_CERTIFICATION_STATUSES.RENEWAL_DUE].includes(
            item.status,
          ),
      ).length,
      pendingCertifications: pendingCertifications.length,
      classesThisWeek: classesThisWeek.length,
      classesThisWeekDetail: `${onCampusThisWeek} on-campus / ${regionalThisWeek} regional`,
      openSeats,
      openClasses: openClasses.length,
      enrolledStudents: registrations.filter(
        (item) => item.status === REGISTRATION_STATUSES.ENROLLED,
      ).length,
      pendingRegistrations: registrations.filter((item) =>
        [REGISTRATION_STATUSES.PENDING_DEPARTMENT, REGISTRATION_STATUSES.PENDING_ACADEMY].includes(
          item.status,
        ),
      ).length,
    },
    registrationsByDepartment: [...departmentCounts.entries()]
      .map(([departmentName, count]) => ({ departmentName, count }))
      .sort((a, b) => b.count - a.count),
    enrollmentsByCourse: [...courseCounts.values()].sort((a, b) => b.enrolled - a.enrolled),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @typedef {Object} DepartmentComplianceReport
 * @property {string} departmentId
 * @property {Object} summary
 * @property {{ label: string, percent: number, current: number, total: number }[]} certificationCompliance
 * @property {{ studentName: string, courseName: string, completionDate: string }[]} recentCompletions
 * @property {string} generatedAt
 */

/** @param {string} departmentId @returns {Promise<DepartmentComplianceReport>} */
export async function getDepartmentComplianceReport(departmentId) {
  const today = todayString();
  const monthBeginning = monthStart(today);
  const expiringThreshold = addDays(today, 60);

  const [roster, registrations, allStudentCerts, allCertificates] = await Promise.all([
    listStudentsByDepartment(departmentId),
    listRegistrations(),
    listStudentCertifications(),
    listCertificates(),
  ]);

  const activeRoster = roster.filter((item) => item.status === STUDENT_STATUSES.ACTIVE);
  const rosterIds = new Set(activeRoster.map((item) => item.id));

  const departmentRegistrations = registrations.filter(
    (item) => item.departmentId === departmentId,
  );
  const membersInTraining = new Set(
    departmentRegistrations
      .filter((item) => item.status === REGISTRATION_STATUSES.ENROLLED)
      .map((item) => item.studentId),
  ).size;

  const departmentCerts = allStudentCerts.filter((item) => rosterIds.has(item.studentId));
  const expiringCount = departmentCerts.filter(
    (item) =>
      item.expiryDate &&
      item.expiryDate >= today &&
      item.expiryDate <= expiringThreshold &&
      item.status !== STUDENT_CERTIFICATION_STATUSES.REVOKED &&
      item.status !== STUDENT_CERTIFICATION_STATUSES.DENIED,
  ).length;

  const typeMap = new Map();
  for (const cert of departmentCerts) {
    const label = cert.certificationName || cert.certificationCode || "Other";
    if (!typeMap.has(label)) {
      typeMap.set(label, { label, current: 0, total: activeRoster.length });
    }
    if (
      [STUDENT_CERTIFICATION_STATUSES.ACTIVE, STUDENT_CERTIFICATION_STATUSES.RENEWAL_DUE].includes(
        cert.status,
      )
    ) {
      typeMap.get(label).current += 1;
    }
  }

  const certificationCompliance = [...typeMap.values()]
    .map((row) => ({
      ...row,
      percent: row.total ? Math.round((row.current / row.total) * 100) : 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const recentCompletions = allCertificates
    .filter(
      (item) =>
        rosterIds.has(item.studentId) &&
        item.status === CERTIFICATE_STATUSES.ISSUED &&
        item.completionDate >= monthBeginning,
    )
    .map((item) => ({
      studentName: item.studentName,
      courseName: item.courseName,
      completionDate: item.completionDate,
    }))
    .sort((a, b) => b.completionDate.localeCompare(a.completionDate));

  return {
    departmentId,
    summary: {
      activeRoster: activeRoster.length,
      membersInTraining,
      expiringCertifications: expiringCount,
      pendingApprovals: departmentRegistrations.filter(
        (item) => item.status === REGISTRATION_STATUSES.PENDING_DEPARTMENT,
      ).length,
      recentCompletions: recentCompletions.length,
    },
    certificationCompliance,
    recentCompletions,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @typedef {Object} InstructorCloseoutRow
 * @property {Object} classSession
 * @property {number} enrolledCount
 * @property {number} incompleteAttendanceDays
 * @property {number} skillsPending
 * @property {number} testsPending
 * @property {number} completionsPending
 * @property {string} closeoutStatus
 */

/** @param {string} instructorUserId @returns {Promise<InstructorCloseoutRow[]>} */
export async function getInstructorCloseoutReport(instructorUserId) {
  const sessions = await listClassSessionsByInstructor(instructorUserId);
  const activeSessions = sessions.filter((session) =>
    [CLASS_STATUSES.IN_PROGRESS, CLASS_STATUSES.COMPLETED, CLASS_STATUSES.OPEN, CLASS_STATUSES.FULL].includes(
      session.status,
    ),
  );

  const rows = [];

  for (const classSession of activeSessions) {
    const [enrolled, attendanceDays, skillDashboard, testDashboard, completions] =
      await Promise.all([
        listEnrolledRegistrationsByClass(classSession.id),
        listAttendanceDaysForClass(classSession.id),
        summarizeClassSkillDashboard(classSession.id),
        summarizeClassTestDashboard(classSession.id),
        listCompletionsByClass(classSession.id),
      ]);

    const incompleteAttendanceDays = getIncompleteAttendanceDates(
      classSession,
      attendanceDays,
    ).length;

    const skillsPending = skillDashboard.reduce(
      (sum, row) => sum + row.summary.pending + row.summary.remediate,
      0,
    );

    const testsPending = testDashboard.reduce((sum, row) => {
      return (
        sum +
        row.results.filter((result) => !result.passed && result.status === "pending").length
      );
    }, 0);

    const completionsPending = completions.filter((item) =>
      [COMPLETION_STATUSES.PENDING, COMPLETION_STATUSES.ELIGIBLE].includes(item.status),
    ).length;

    let closeoutStatus = "Complete";
    if (incompleteAttendanceDays > 0) closeoutStatus = "Attendance incomplete";
    else if (skillsPending > 0) closeoutStatus = "Skills pending";
    else if (testsPending > 0) closeoutStatus = "Tests pending";
    else if (completionsPending > 0) closeoutStatus = "Closeout pending";

    rows.push({
      classSession,
      enrolledCount: enrolled.length,
      incompleteAttendanceDays,
      skillsPending,
      testsPending,
      completionsPending,
      closeoutStatus,
    });
  }

  return rows.sort((a, b) => a.classSession.startDate.localeCompare(b.classSession.startDate));
}

/** @param {AdminAnalyticsReport} report */
export function downloadAdminReportCsv(report) {
  const lines = [
    "Metric,Value",
    `Students trained YTD,${report.summary.studentsTrainedYtd}`,
    `Active students,${report.summary.activeStudents}`,
    `Active departments,${report.summary.activeDepartments}`,
    `Certificates issued,${report.summary.certificatesIssued}`,
    `Expiring in 30 days,${report.summary.expiringIn30Days}`,
    `Pending certifications,${report.summary.pendingCertifications}`,
    `Classes this week,${report.summary.classesThisWeek}`,
    `Open seats,${report.summary.openSeats}`,
    `Enrolled students,${report.summary.enrolledStudents}`,
    "",
    "Department,Registrations",
    ...report.registrationsByDepartment.map(
      (row) => `${csvEscape(row.departmentName)},${row.count}`,
    ),
    "",
    "Course Number,Course Name,Enrolled",
    ...report.enrollmentsByCourse.map(
      (row) =>
        `${csvEscape(row.courseNumber)},${csvEscape(row.courseName)},${row.enrolled}`,
    ),
  ];

  downloadCsv(lines.join("\n"), "afta-statewide-analytics.csv");
}

/** @param {DepartmentComplianceReport} report @param {string} departmentName */
export function downloadDepartmentComplianceCsv(report, departmentName) {
  const lines = [
    "Metric,Value",
    `Active roster,${report.summary.activeRoster}`,
    `Members in training,${report.summary.membersInTraining}`,
    `Expiring certifications (60 days),${report.summary.expiringCertifications}`,
    `Pending approvals,${report.summary.pendingApprovals}`,
    `Completions this month,${report.summary.recentCompletions}`,
    "",
    "Certification,Current,Total,Percent",
    ...report.certificationCompliance.map(
      (row) =>
        `${csvEscape(row.label)},${row.current},${row.total},${row.percent}%`,
    ),
    "",
    "Student,Course,Completed",
    ...report.recentCompletions.map(
      (row) =>
        `${csvEscape(row.studentName)},${csvEscape(row.courseName)},${row.completionDate}`,
    ),
  ];

  const slug = (departmentName || "department").replace(/\s+/g, "-").toLowerCase();
  downloadCsv(lines.join("\n"), `${slug}-compliance-report.csv`);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

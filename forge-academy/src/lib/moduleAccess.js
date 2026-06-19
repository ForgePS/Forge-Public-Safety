import { getSettingValue, isModuleEnabled } from "./systemSettings.js";

/**
 * @typedef {{ module?: string, flags?: string[], always?: boolean }} PathRequirement
 */

/** @type {{ prefix: string, exact?: boolean, module?: string, flags?: string[], always?: boolean }[]} */
const ADMIN_PATH_RULES = [
  { prefix: "/admin/settings", always: true },
  { prefix: "/admin/users", always: true },
  { prefix: "/admin/students", always: true },
  { prefix: "/admin", exact: true, always: true },
  { prefix: "/admin/announcements", always: true },
  { prefix: "/admin/registrations", module: "registration" },
  { prefix: "/admin/courses", module: "classes" },
  { prefix: "/admin/scheduling", module: "classes" },
  { prefix: "/admin/housing", module: "housing" },
  { prefix: "/admin/testing/lms-integration", module: "lms", flags: ["lms.enabled"] },
  { prefix: "/admin/testing/challenge", module: "testing", flags: ["testing.challengeTestingEnabled"] },
  { prefix: "/admin/testing/state-certification", module: "testing", flags: ["testing.stateCertificationEnabled"] },
  { prefix: "/admin/testing/audit", module: "audit", flags: ["audit.showTestingAuditConsole"] },
  { prefix: "/admin/testing", module: "testing" },
  { prefix: "/admin/tests", module: "testing" },
  { prefix: "/admin/question-banks", module: "testing" },
  { prefix: "/admin/certificates", module: "certificates" },
  { prefix: "/admin/certifications", module: "certifications" },
  { prefix: "/admin/certification-types", module: "certifications" },
  { prefix: "/admin/skills", module: "skills" },
  { prefix: "/admin/departments", module: "departments" },
  { prefix: "/admin/reports", module: "reports" },
  { prefix: "/admin/digital-dashboard", module: "digitalDashboard" },
  { prefix: "/admin/instructors", module: "instructors" },
  { prefix: "/admin/pilot", flags: ["features.showPilotReleasePage"] },
];

/** @type {{ prefix: string, exact?: boolean, module?: string, flags?: string[], always?: boolean }[]} */
const STUDENT_PATH_RULES = [
  { prefix: "/student", exact: true, always: true },
  { prefix: "/student/profile", always: true },
  { prefix: "/student/register", module: "registration", flags: ["registration.allowSelfRegistration"] },
  { prefix: "/student/catalog", module: "registration" },
  { prefix: "/student/transcript", flags: ["students.showTranscriptToStudent"] },
  { prefix: "/student/skills", module: "skills", flags: ["skills.allowStudentViewProgress"] },
  { prefix: "/student/test-results", module: "testing", flags: ["students.showTestResultsToStudent"] },
  { prefix: "/student/tests", module: "testing", flags: ["testing.onlineTestingEnabled"] },
  { prefix: "/student/challenge-testing", module: "testing", flags: ["testing.challengeTestingEnabled"] },
  { prefix: "/student/certifications", module: "certifications", flags: ["students.showCertificationsToStudent"] },
  { prefix: "/student/housing", module: "housing" },
  { prefix: "/student/certificates", module: "certificates" },
];

const DEPARTMENT_PATH_RULES = [
  { prefix: "/department", exact: true, always: true },
  { prefix: "/department/roster", module: "departments" },
  { prefix: "/department/bulk-register", module: "registration", flags: ["registration.allowBulkDepartmentRegistration"] },
  { prefix: "/department/approvals", module: "registration", flags: ["departments.requireApprovalForRegistration"] },
  { prefix: "/department/compliance", module: "departments", flags: ["departments.complianceReportsEnabled"] },
  { prefix: "/department/housing", module: "housing" },
];

const INSTRUCTOR_PATH_RULES = [
  { prefix: "/instructor", exact: true, always: true },
  { prefix: "/instructor/announcements", always: true },
  { prefix: "/instructor/classes", module: "classes" },
  { prefix: "/instructor/schedule", module: "classes" },
  { prefix: "/instructor/attendance", module: "classes" },
  { prefix: "/instructor/profile", module: "instructors", flags: ["instructors.allowSelfServiceProfile"] },
  { prefix: "/instructor/skills", module: "skills" },
  { prefix: "/instructor/tests", module: "testing", flags: ["instructors.allowManualTestEntry"] },
  { prefix: "/instructor/proctor", module: "testing", flags: ["testing.proctorMonitorEnabled"] },
  { prefix: "/instructor/closeout", module: "classes" },
  { prefix: "/instructor/housing", module: "housing" },
];

const CERTIFICATION_PATH_RULES = [
  { prefix: "/certification", module: "certifications" },
];

/** @param {string} pathname @param {{ prefix: string, exact?: boolean, module?: string, flags?: string[], always?: boolean }[]} rules */
function resolvePathRule(pathname, rules) {
  const sorted = [...rules].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const rule of sorted) {
    if (rule.exact && pathname === rule.prefix) return rule;
    if (!rule.exact && (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`))) {
      return rule;
    }
  }
  return null;
}

/**
 * @param {ReturnType<import('./systemSettings.js').mergeSystemSettings>} settings
 * @param {{ module?: string, flags?: string[], always?: boolean } | null} rule
 */
function ruleAllows(settings, rule) {
  if (!rule) return true;
  if (rule.always) return true;
  if (rule.module && !isModuleEnabled(settings, rule.module)) return false;
  for (const flag of rule.flags ?? []) {
    const value = getSettingValue(settings, flag);
    if (value === false || value === 0 || value === "") return false;
  }
  return true;
}

/** @param {ReturnType<import('./systemSettings.js').mergeSystemSettings>} settings @param {string} pathname */
export function isAdminPathAllowed(settings, pathname) {
  return ruleAllows(settings, resolvePathRule(pathname, ADMIN_PATH_RULES));
}

/** @param {ReturnType<import('./systemSettings.js').mergeSystemSettings>} settings @param {string} pathname */
export function isStudentPathAllowed(settings, pathname) {
  return ruleAllows(settings, resolvePathRule(pathname, STUDENT_PATH_RULES));
}

/** @param {ReturnType<import('./systemSettings.js').mergeSystemSettings>} settings @param {string} pathname */
export function isDepartmentPathAllowed(settings, pathname) {
  return ruleAllows(settings, resolvePathRule(pathname, DEPARTMENT_PATH_RULES));
}

/** @param {ReturnType<import('./systemSettings.js').mergeSystemSettings>} settings @param {string} pathname */
export function isInstructorPathAllowed(settings, pathname) {
  return ruleAllows(settings, resolvePathRule(pathname, INSTRUCTOR_PATH_RULES));
}

/** @param {ReturnType<import('./systemSettings.js').mergeSystemSettings>} settings @param {string} pathname */
export function isCertificationPathAllowed(settings, pathname) {
  return ruleAllows(settings, resolvePathRule(pathname, CERTIFICATION_PATH_RULES));
}

/** @param {ReturnType<import('./systemSettings.js').mergeSystemSettings>} settings */
export function isPublicVerifyAllowed(settings) {
  return settings?.certificates?.publicVerifyEnabled !== false;
}

/**
 * @param {ReturnType<import('./systemSettings.js').mergeSystemSettings>} settings
 * @param {{ to: string, module?: string, flags?: string[], settingsOnly?: boolean, pilotOnly?: boolean }[]} navItems
 */
export function filterNavItemsBySettings(settings, navItems) {
  return navItems.filter((item) => {
    if (item.module && !isModuleEnabled(settings, item.module)) return false;
    for (const flag of item.flags ?? []) {
      const value = getSettingValue(settings, flag);
      if (value === false || value === 0 || value === "") return false;
    }
    if (item.pilotOnly && settings?.features?.showPilotReleasePage === false) return false;
    return true;
  });
}

/** @param {ReturnType<import('./systemSettings.js').mergeSystemSettings>} settings @param {string} pathname @param {"admin"|"student"|"department"|"instructor"|"certification"} portal */
export function isPortalPathAllowed(settings, pathname, portal) {
  switch (portal) {
    case "admin":
      return isAdminPathAllowed(settings, pathname);
    case "student":
      return isStudentPathAllowed(settings, pathname);
    case "department":
      return isDepartmentPathAllowed(settings, pathname);
    case "instructor":
      return isInstructorPathAllowed(settings, pathname);
    case "certification":
      return isCertificationPathAllowed(settings, pathname);
    default:
      return true;
  }
}

export const MODULE_LABELS = {
  registration: "Registration",
  classes: "Classes & Scheduling",
  housing: "Housing",
  testing: "Testing",
  lms: "LMS Integration",
  certificates: "Certificates",
  certifications: "Certifications",
  skills: "Skills Evaluation",
  departments: "Departments",
  reports: "Reports",
  instructors: "Instructors",
  audit: "Audit Logs",
  digitalDashboard: "Digital Dashboard",
};

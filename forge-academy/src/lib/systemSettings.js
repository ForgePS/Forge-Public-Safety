import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { writeAuditLog } from "./auditLogs.js";

const SETTINGS_DOC_ID = "default";
const settingsRef = doc(db, "systemSettings", SETTINGS_DOC_ID);

/** @typedef {'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'time' | 'email' | 'url'} SettingsFieldType */

/**
 * @typedef {Object} SettingsFieldDef
 * @property {string} key
 * @property {string} label
 * @property {SettingsFieldType} type
 * @property {string} [hint]
 * @property {{ value: string, label: string }[]} [options]
 */

/**
 * @typedef {Object} SettingsSectionDef
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {SettingsFieldDef[]} fields
 */

export const DEFAULT_SYSTEM_SETTINGS = {
  organization: {
    academyName: "Arkansas Fire Training Academy",
    portalTitle: "Arkansas Fire Training Academy Dashboard",
    portalSubtitle: "AFTA Portal",
    supportEmail: "training@uafs.edu",
    supportPhone: "",
    logoUrl: "/afta-logo.png",
    footerText: "Arkansas Fire Training Academy — Forge Academy Pilot",
    publicVerifyBaseUrl: "",
  },
  registration: {
    moduleEnabled: true,
    requireDepartmentApproval: true,
    allowSelfRegistration: true,
    allowBulkDepartmentRegistration: true,
    defaultMealPlanRequired: false,
    maxRegistrationsPerStudent: 0,
    registrationConfirmationEmail: true,
  },
  classes: {
    moduleEnabled: true,
    defaultEnrollmentCap: 24,
    defaultWaitlistCap: 10,
    allowOnlineDelivery: true,
    allowHybridDelivery: true,
    housingDeadlineDaysBeforeStart: 14,
    attendanceRequiredPercent: 80,
    autoCloseRegistrationOnCap: true,
  },
  housing: {
    moduleEnabled: true,
    studentInstructions:
      "Report to the AFTA housing desk on arrival. Bring a photo ID and your class confirmation. Quiet hours are 10 PM – 6 AM.",
    academyNotes: "Default on-campus housing policies apply unless noted on the class record.",
    checkInTime: "15:00",
    checkOutTime: "10:00",
    allowStudentSelfCheckIn: false,
  },
  testing: {
    moduleEnabled: true,
    onlineTestingEnabled: true,
    manualGradingEnabled: true,
    challengeTestingEnabled: true,
    stateCertificationEnabled: true,
    proctorMonitorEnabled: true,
    defaultPassScore: 70,
    requireEligibilityBeforeTest: true,
    requireInstructorApproval: true,
    autoAssignRemediationOnFail: true,
    certificatePendingRelease: true,
    allowStudentRetestRequests: true,
  },
  lms: {
    enabled: false,
    providerName: "",
    apiBaseUrl: "",
    gradePassbackMode: "manual",
    notes: "",
    autoSyncEligibility: false,
    webhookSecret: "",
  },
  certificates: {
    moduleEnabled: true,
    publicVerifyEnabled: true,
    issuerName: "Arkansas Fire Training Academy",
    issuerTitle: "Director",
    requireAdminRelease: true,
    showPendingStatusToStudents: true,
  },
  certifications: {
    moduleEnabled: true,
    officerApprovalRequired: true,
    renewalReminderDays: 90,
    allowStudentUploads: true,
  },
  skills: {
    moduleEnabled: true,
    requireInstructorSignoff: true,
    allowStudentViewProgress: true,
    defaultEvaluationScale: "pass_fail",
  },
  instructors: {
    moduleEnabled: true,
    allowSelfServiceProfile: true,
    proctorAssignmentRequired: true,
    allowManualTestEntry: true,
  },
  departments: {
    moduleEnabled: true,
    complianceReportsEnabled: true,
    allowRosterExport: true,
    requireApprovalForRegistration: true,
  },
  students: {
    allowProfilePhotoUpload: false,
    showTranscriptToStudent: true,
    showTestResultsToStudent: true,
    showCertificationsToStudent: true,
  },
  notifications: {
    emailEnabled: false,
    emailFromName: "Forge Academy",
    emailFromAddress: "",
    notifyOnRegistrationSubmitted: true,
    notifyOnTestFailure: true,
    notifyOnCertificateRelease: true,
  },
  reports: {
    moduleEnabled: true,
    defaultDateRangeDays: 90,
    exportIncludesPii: true,
    allowDepartmentExports: false,
    scheduledExportsEnabled: false,
    scheduledExportFrequency: "weekly",
    scheduledExportRecipients: "",
    scheduledExportTypes: "passFail,eligibility,certificateRelease",
  },
  audit: {
    moduleEnabled: true,
    retentionDays: 365,
    logSensitiveActions: true,
    showTestingAuditConsole: true,
  },
  digitalDashboard: {
    moduleEnabled: true,
    allowPublicPlayer: true,
    virtualPlayerEnabled: true,
    mediaApprovalRequired: false,
    rssFeedsEnabled: true,
    stockMediaEnabled: true,
    unsplashAccessKey: "",
    pexelsApiKey: "",
    playerRefreshMinutes: 5,
    heartbeatIntervalSeconds: 60,
  },
  security: {
    requireStrongPasswords: true,
    sessionTimeoutMinutes: 0,
    restrictAdminToKnownDomains: false,
    allowedAdminEmailDomains: "",
  },
  features: {
    pilotMode: true,
    maintenanceMode: false,
    maintenanceMessage: "The portal is temporarily unavailable for scheduled maintenance. Please try again later.",
    announcementEnabled: false,
    announcementBanner: "",
    showPilotReleasePage: true,
  },
};

/** @param {Record<string, unknown>} stored @param {Record<string, unknown>} defaults */
function mergeSection(stored, defaults) {
  const result = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (stored[key] !== undefined && stored[key] !== null) {
      result[key] = stored[key];
    }
  }
  return result;
}

/** @param {Record<string, Record<string, unknown>>} stored */
export function mergeSystemSettings(stored = {}) {
  /** @type {Record<string, Record<string, unknown>>} */
  const merged = {};
  for (const [sectionId, defaults] of Object.entries(DEFAULT_SYSTEM_SETTINGS)) {
    merged[sectionId] = mergeSection(stored[sectionId] ?? {}, defaults);
  }
  return merged;
}

export async function getSystemSettings() {
  const snap = await getDoc(settingsRef);
  if (!snap.exists()) return mergeSystemSettings({});
  return mergeSystemSettings(snap.data());
}

/**
 * @param {string} sectionId
 * @param {Record<string, unknown>} values
 * @param {string} userId
 */
export async function saveSystemSettingsSection(sectionId, values, userId) {
  if (!(sectionId in DEFAULT_SYSTEM_SETTINGS)) {
    throw new Error(`Unknown settings section: ${sectionId}`);
  }

  const defaults = DEFAULT_SYSTEM_SETTINGS[sectionId];
  /** @type {Record<string, unknown>} */
  const payload = {};
  for (const key of Object.keys(defaults)) {
    if (values[key] === undefined) continue;
    const raw = values[key];
    if (typeof defaults[key] === "boolean") {
      payload[key] = Boolean(raw);
    } else if (typeof defaults[key] === "number") {
      payload[key] = Number(raw);
    } else if (typeof raw === "string") {
      payload[key] = raw.trim();
    } else {
      payload[key] = raw;
    }
  }

  await setDoc(
    settingsRef,
    {
      [sectionId]: payload,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );

  await writeAuditLog({
    action: "system_settings_updated",
    entityType: "systemSettings",
    entityId: sectionId,
    userId,
    details: { section: sectionId },
  });

  return mergeSection(payload, defaults);
}

/** @param {import('./roles.js').Role | null | undefined} role */
export function isModuleEnabled(settings, moduleKey) {
  const section = settings?.[moduleKey];
  if (!section) return true;
  if ("moduleEnabled" in section) return Boolean(section.moduleEnabled);
  if ("enabled" in section) return Boolean(section.enabled);
  return true;
}

/** @param {ReturnType<typeof mergeSystemSettings>} settings @param {string} path e.g. "testing.onlineTestingEnabled" */
export function getSettingValue(settings, path) {
  const [sectionId, key] = path.split(".");
  const section = settings?.[sectionId];
  if (!section || !(key in section)) return undefined;
  return section[key];
}

/** @param {Record<string, Record<string, unknown>> | null | undefined} settings */
export function isVirtualPlayerEnabled(settings) {
  return getSettingValue(settings, "digitalDashboard.virtualPlayerEnabled") !== false;
}

/** @param {Record<string, Record<string, unknown>> | null | undefined} settings */
export function isMediaApprovalRequired(settings) {
  return getSettingValue(settings, "digitalDashboard.mediaApprovalRequired") === true;
}

/** @param {Record<string, Record<string, unknown>> | null | undefined} settings */
export function isRssFeedsEnabled(settings) {
  return getSettingValue(settings, "digitalDashboard.rssFeedsEnabled") !== false;
}

/** @param {Record<string, Record<string, unknown>> | null | undefined} settings */
export function isStockMediaEnabled(settings) {
  return getSettingValue(settings, "digitalDashboard.stockMediaEnabled") !== false;
}

export const SYSTEM_SETTINGS_SECTIONS = /** @type {SettingsSectionDef[]} */ ([
  {
    id: "organization",
    title: "Organization & Branding",
    description: "Academy identity, portal titles, and public contact information.",
    fields: [
      { key: "academyName", label: "Academy name", type: "text" },
      { key: "portalTitle", label: "Admin dashboard title", type: "text" },
      { key: "portalSubtitle", label: "Portal sidebar subtitle", type: "text" },
      { key: "supportEmail", label: "Support email", type: "email" },
      { key: "supportPhone", label: "Support phone", type: "text" },
      { key: "logoUrl", label: "Logo URL", type: "url", hint: "Path or full URL to the portal logo." },
      { key: "footerText", label: "Footer text", type: "text" },
      { key: "publicVerifyBaseUrl", label: "Certificate verify base URL", type: "url", hint: "Leave blank to use the current site URL." },
    ],
  },
  {
    id: "registration",
    title: "Registration",
    description: "Student and department registration workflow controls.",
    fields: [
      { key: "moduleEnabled", label: "Enable registration module", type: "boolean" },
      { key: "requireDepartmentApproval", label: "Require department approval", type: "boolean" },
      { key: "allowSelfRegistration", label: "Allow student self-registration", type: "boolean" },
      { key: "allowBulkDepartmentRegistration", label: "Allow department bulk registration", type: "boolean" },
      { key: "defaultMealPlanRequired", label: "Default meal plan required", type: "boolean" },
      { key: "maxRegistrationsPerStudent", label: "Max active registrations per student (0 = unlimited)", type: "number" },
      { key: "registrationConfirmationEmail", label: "Send registration confirmation email", type: "boolean" },
    ],
  },
  {
    id: "classes",
    title: "Classes & Scheduling",
    description: "Default class capacity, delivery modes, and attendance rules.",
    fields: [
      { key: "moduleEnabled", label: "Enable classes module", type: "boolean" },
      { key: "defaultEnrollmentCap", label: "Default enrollment cap", type: "number" },
      { key: "defaultWaitlistCap", label: "Default waitlist cap", type: "number" },
      { key: "allowOnlineDelivery", label: "Allow online delivery", type: "boolean" },
      { key: "allowHybridDelivery", label: "Allow hybrid delivery", type: "boolean" },
      { key: "housingDeadlineDaysBeforeStart", label: "Housing deadline (days before start)", type: "number" },
      { key: "attendanceRequiredPercent", label: "Required attendance %", type: "number" },
      { key: "autoCloseRegistrationOnCap", label: "Auto-close registration at cap", type: "boolean" },
    ],
  },
  {
    id: "housing",
    title: "Housing",
    description: "On-campus housing policies and check-in instructions.",
    fields: [
      { key: "moduleEnabled", label: "Enable housing module", type: "boolean" },
      { key: "studentInstructions", label: "Student instructions", type: "textarea" },
      { key: "academyNotes", label: "Academy notes", type: "textarea" },
      { key: "checkInTime", label: "Default check-in time", type: "time" },
      { key: "checkOutTime", label: "Default check-out time", type: "time" },
      { key: "allowStudentSelfCheckIn", label: "Allow student self check-in", type: "boolean" },
    ],
  },
  {
    id: "testing",
    title: "Testing",
    description: "Exam delivery, grading, eligibility, and retest policies.",
    fields: [
      { key: "moduleEnabled", label: "Enable testing module", type: "boolean" },
      { key: "onlineTestingEnabled", label: "Enable online testing", type: "boolean" },
      { key: "manualGradingEnabled", label: "Enable manual grading queue", type: "boolean" },
      { key: "challengeTestingEnabled", label: "Enable challenge testing", type: "boolean" },
      { key: "stateCertificationEnabled", label: "Enable state certification records", type: "boolean" },
      { key: "proctorMonitorEnabled", label: "Enable live proctor monitor", type: "boolean" },
      { key: "defaultPassScore", label: "Default passing score", type: "number" },
      { key: "requireEligibilityBeforeTest", label: "Require eligibility before test", type: "boolean" },
      { key: "requireInstructorApproval", label: "Require instructor approval", type: "boolean" },
      { key: "autoAssignRemediationOnFail", label: "Auto-assign remediation on fail", type: "boolean" },
      { key: "certificatePendingRelease", label: "Certificates require admin release", type: "boolean" },
      { key: "allowStudentRetestRequests", label: "Allow student retest requests", type: "boolean" },
    ],
  },
  {
    id: "lms",
    title: "LMS Integration",
    description: "External LMS connector, completion sync, and grade passback.",
    fields: [
      { key: "enabled", label: "Enable LMS integration", type: "boolean" },
      { key: "providerName", label: "LMS provider", type: "text" },
      { key: "apiBaseUrl", label: "API base URL", type: "url" },
      {
        key: "gradePassbackMode",
        label: "Grade passback mode",
        type: "select",
        options: [
          { value: "manual", label: "Manual queue" },
          { value: "api", label: "API passback" },
        ],
      },
      { key: "autoSyncEligibility", label: "Auto-sync eligibility on import", type: "boolean" },
      { key: "webhookSecret", label: "LMS webhook secret", type: "text", hint: "Send as X-LMS-Secret header on completion webhook POSTs." },
      { key: "notes", label: "Integration notes", type: "textarea" },
    ],
  },
  {
    id: "certificates",
    title: "Certificates",
    description: "Course completion certificates and public verification.",
    fields: [
      { key: "moduleEnabled", label: "Enable certificates module", type: "boolean" },
      { key: "publicVerifyEnabled", label: "Enable public certificate verification", type: "boolean" },
      { key: "issuerName", label: "Certificate issuer name", type: "text" },
      { key: "issuerTitle", label: "Certificate issuer title", type: "text" },
      { key: "requireAdminRelease", label: "Require admin release before issued", type: "boolean" },
      { key: "showPendingStatusToStudents", label: "Show pending status to students", type: "boolean" },
    ],
  },
  {
    id: "certifications",
    title: "Certifications",
    description: "Professional certification tracking and renewals.",
    fields: [
      { key: "moduleEnabled", label: "Enable certifications module", type: "boolean" },
      { key: "officerApprovalRequired", label: "Require certification officer approval", type: "boolean" },
      { key: "renewalReminderDays", label: "Renewal reminder (days before expiry)", type: "number" },
      { key: "allowStudentUploads", label: "Allow student document uploads", type: "boolean" },
    ],
  },
  {
    id: "skills",
    title: "Skills Evaluation",
    description: "Skills sheets, templates, and instructor sign-off rules.",
    fields: [
      { key: "moduleEnabled", label: "Enable skills module", type: "boolean" },
      { key: "requireInstructorSignoff", label: "Require instructor sign-off", type: "boolean" },
      { key: "allowStudentViewProgress", label: "Students can view skills progress", type: "boolean" },
      {
        key: "defaultEvaluationScale",
        label: "Default evaluation scale",
        type: "select",
        options: [
          { value: "pass_fail", label: "Pass / Fail" },
          { value: "numeric", label: "Numeric score" },
          { value: "rubric", label: "Rubric levels" },
        ],
      },
    ],
  },
  {
    id: "instructors",
    title: "Instructors",
    description: "Instructor portal capabilities and proctor requirements.",
    fields: [
      { key: "moduleEnabled", label: "Enable instructor module", type: "boolean" },
      { key: "allowSelfServiceProfile", label: "Allow self-service profile edits", type: "boolean" },
      { key: "proctorAssignmentRequired", label: "Require proctor assignment for online tests", type: "boolean" },
      { key: "allowManualTestEntry", label: "Allow manual test score entry", type: "boolean" },
    ],
  },
  {
    id: "departments",
    title: "Departments",
    description: "Department officer portal and compliance reporting.",
    fields: [
      { key: "moduleEnabled", label: "Enable departments module", type: "boolean" },
      { key: "complianceReportsEnabled", label: "Enable compliance reports", type: "boolean" },
      { key: "allowRosterExport", label: "Allow roster export", type: "boolean" },
      { key: "requireApprovalForRegistration", label: "Department must approve registrations", type: "boolean" },
    ],
  },
  {
    id: "students",
    title: "Student Portal",
    description: "What students can see and do in their portal.",
    fields: [
      { key: "allowProfilePhotoUpload", label: "Allow profile photo upload", type: "boolean" },
      { key: "showTranscriptToStudent", label: "Show transcript to student", type: "boolean" },
      { key: "showTestResultsToStudent", label: "Show test results to student", type: "boolean" },
      { key: "showCertificationsToStudent", label: "Show certifications to student", type: "boolean" },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Email and system notification defaults.",
    fields: [
      { key: "emailEnabled", label: "Enable outbound email", type: "boolean" },
      { key: "emailFromName", label: "From name", type: "text" },
      { key: "emailFromAddress", label: "From email address", type: "email" },
      { key: "notifyOnRegistrationSubmitted", label: "Notify on registration submitted", type: "boolean" },
      { key: "notifyOnTestFailure", label: "Notify on test failure", type: "boolean" },
      { key: "notifyOnCertificateRelease", label: "Notify on certificate release", type: "boolean" },
    ],
  },
  {
    id: "reports",
    title: "Reports & Exports",
    description: "Reporting defaults and export privacy controls.",
    fields: [
      { key: "moduleEnabled", label: "Enable reports module", type: "boolean" },
      { key: "defaultDateRangeDays", label: "Default report date range (days)", type: "number" },
      { key: "exportIncludesPii", label: "Exports include PII by default", type: "boolean" },
      { key: "allowDepartmentExports", label: "Allow department self-service exports", type: "boolean" },
      { key: "scheduledExportsEnabled", label: "Enable scheduled CSV exports", type: "boolean" },
      {
        key: "scheduledExportFrequency",
        label: "Export frequency",
        type: "select",
        options: [
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
        ],
      },
      { key: "scheduledExportRecipients", label: "Export notification emails", type: "text", hint: "Comma-separated addresses (logged to email outbox when email is enabled)." },
      { key: "scheduledExportTypes", label: "Report types to export", type: "text", hint: "Comma-separated: passFail, eligibility, certificateRelease, remediation" },
    ],
  },
  {
    id: "audit",
    title: "Audit & Security Logs",
    description: "Audit retention and sensitive action logging.",
    fields: [
      { key: "moduleEnabled", label: "Enable audit logging", type: "boolean" },
      { key: "retentionDays", label: "Log retention (days)", type: "number" },
      { key: "logSensitiveActions", label: "Log sensitive admin actions", type: "boolean" },
      { key: "showTestingAuditConsole", label: "Show testing audit console", type: "boolean" },
    ],
  },
  {
    id: "digitalDashboard",
    title: "Digital Dashboard",
    description: "Campus wall displays, playlists, and public player URLs.",
    fields: [
      { key: "moduleEnabled", label: "Enable digital dashboard module", type: "boolean" },
      { key: "allowPublicPlayer", label: "Allow public display player URLs", type: "boolean" },
      {
        key: "virtualPlayerEnabled",
        label: "Enable virtual player in Forge Displays",
        type: "boolean",
        hint: "Creator-only preview player for testing content without affecting physical device heartbeats.",
      },
      {
        key: "mediaApprovalRequired",
        label: "Require media approval before publishing",
        type: "boolean",
        hint: "New uploads and RSS imports stay pending until an admin approves them.",
      },
      { key: "rssFeedsEnabled", label: "Enable RSS feed imports", type: "boolean" },
      { key: "stockMediaEnabled", label: "Enable stock media library", type: "boolean" },
      {
        key: "unsplashAccessKey",
        label: "Unsplash access key (optional)",
        type: "text",
        hint: "Optional API key for expanded stock search.",
      },
      {
        key: "pexelsApiKey",
        label: "Pexels API key (optional)",
        type: "text",
        hint: "Optional API key for expanded stock search.",
      },
      {
        key: "heartbeatIntervalSeconds",
        label: "Device heartbeat interval (seconds)",
        type: "number",
        hint: "Enterprise spec requires a heartbeat every 60 seconds.",
      },
      {
        key: "playerRefreshMinutes",
        label: "Player content refresh (minutes)",
        type: "number",
        hint: "How often wall displays reload schedules and playlists.",
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    description: "Authentication and admin access policies.",
    fields: [
      { key: "requireStrongPasswords", label: "Require strong passwords", type: "boolean" },
      { key: "sessionTimeoutMinutes", label: "Session timeout (minutes, 0 = none)", type: "number" },
      { key: "restrictAdminToKnownDomains", label: "Restrict admin accounts to allowed email domains", type: "boolean" },
      { key: "allowedAdminEmailDomains", label: "Allowed admin email domains", type: "text", hint: "Comma-separated, e.g. uafs.edu, afta.org" },
    ],
  },
  {
    id: "features",
    title: "Feature Flags & Pilot",
    description: "Maintenance mode, announcements, and pilot controls.",
    fields: [
      { key: "pilotMode", label: "Pilot mode active", type: "boolean" },
      { key: "maintenanceMode", label: "Maintenance mode", type: "boolean" },
      { key: "maintenanceMessage", label: "Maintenance message", type: "textarea" },
      { key: "announcementEnabled", label: "Show announcement banner", type: "boolean" },
      { key: "announcementBanner", label: "Announcement banner text", type: "textarea" },
      { key: "showPilotReleasePage", label: "Show pilot release checklist page", type: "boolean" },
    ],
  },
]);

import { listActiveDepartments } from "./departments.js";
import { listClassSessions } from "./classes.js";
import { listCourses } from "./courses.js";
import { getAdminAnalyticsReport } from "./reports.js";

export const PILOT_VERSION = "1.0.0-pilot";
export const PILOT_HOSTING_URL = "https://forge-academy-95f84.web.app";

/** @typedef {{ id: string, label: string, role: string, steps: string[] }} PilotTrainingModule */

/** @type {PilotTrainingModule[]} */
export const PILOT_TRAINING_MODULES = [
  {
    id: "admin",
    label: "Academy Admin",
    role: "Academy admin",
    steps: [
      "Sign in and confirm the admin dashboard shows live registration and attendance counts.",
      "Create or verify a department, student, course, and open class session.",
      "Walk a registration from student request through department approval to academy enrollment.",
      "Finalize instructor attendance, evaluate completions on the class roster, and issue certificates.",
      "Review statewide analytics under Reports and export a CSV for leadership review.",
      "Open Pilot Release and confirm all automated smoke checks pass before go-live.",
    ],
  },
  {
    id: "department",
    label: "Department Training Officer",
    role: "Department user",
    steps: [
      "Sign in and confirm roster counts match your department membership.",
      "Approve a pending registration and bulk-register at least one firefighter.",
      "Open the compliance report and verify expiring certifications display correctly.",
    ],
  },
  {
    id: "instructor",
    label: "Instructor",
    role: "Instructor",
    steps: [
      "Confirm your profile is linked under Admin → Instructors.",
      "Record and finalize attendance for a class day.",
      "Enter skill evaluations and written test scores where required.",
      "Review the closeout report and resolve any attendance, skills, or test gaps.",
    ],
  },
  {
    id: "student",
    label: "Student",
    role: "Student",
    steps: [
      "Update profile linkage if needed (admin creates the student record first).",
      "Register for an open class and track approval status on the dashboard.",
      "View transcript, skills progress, test results, certificates, and certifications.",
    ],
  },
  {
    id: "certification",
    label: "Certification Officer",
    role: "Certification officer",
    steps: [
      "Review pending certifications created after certificate issuance.",
      "Approve, deny, or renew credentials and confirm audit trail entries.",
    ],
  },
];

/** @typedef {{ id: string, label: string, description: string }} PilotManualCheck */

/** @type {PilotManualCheck[]} */
export const PILOT_MANUAL_CHECKS = [
  {
    id: "auth-roles",
    label: "Test accounts for all five roles",
    description: "Verify login works for admin, student, department, instructor, and certification officer test users.",
  },
  {
    id: "registration-flow",
    label: "End-to-end registration workflow",
    description: "Student registers → department approves → academy enrolls → student appears on class roster.",
  },
  {
    id: "attendance-closeout",
    label: "Attendance and class closeout",
    description: "Instructor finalizes attendance; admin evaluates completions and issues certificates.",
  },
  {
    id: "public-verify",
    label: "Public certificate verification",
    description: "Scan or open a certificate QR link at /verify/:code and confirm details display.",
  },
  {
    id: "reports-export",
    label: "Reports CSV export",
    description: "Download admin statewide analytics and a department compliance CSV.",
  },
  {
    id: "mobile-layout",
    label: "Mobile layout spot check",
    description: "Open student and instructor dashboards on a phone-sized viewport.",
  },
];

const MANUAL_CHECK_STORAGE_KEY = "afta-pilot-manual-checks-v1";

/** @returns {Record<string, boolean>} */
export function loadManualCheckState() {
  try {
    const raw = localStorage.getItem(MANUAL_CHECK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, boolean>} state */
export function saveManualCheckState(state) {
  localStorage.setItem(MANUAL_CHECK_STORAGE_KEY, JSON.stringify(state));
}

/**
 * @typedef {Object} PilotSmokeResult
 * @property {string} id
 * @property {string} label
 * @property {'pass' | 'fail' | 'warn'} status
 * @property {string} detail
 */

/** @returns {Promise<PilotSmokeResult[]>} */
export async function runPilotSmokeChecks() {
  const results = [];

  results.push(checkFirebaseConfig());

  try {
    const departments = await listActiveDepartments();
    results.push({
      id: "departments",
      label: "Departments readable",
      status: "pass",
      detail: `${departments.length} active department(s) found.`,
    });
  } catch (err) {
    results.push({
      id: "departments",
      label: "Departments readable",
      status: "fail",
      detail: err instanceof Error ? err.message : "Unable to read departments.",
    });
  }

  try {
    const courses = await listCourses();
    results.push({
      id: "courses",
      label: "Course catalog readable",
      status: courses.length ? "pass" : "warn",
      detail: courses.length
        ? `${courses.length} course(s) in catalog.`
        : "No courses yet — run the pilot seed script or create courses manually.",
    });
  } catch (err) {
    results.push({
      id: "courses",
      label: "Course catalog readable",
      status: "fail",
      detail: err instanceof Error ? err.message : "Unable to read courses.",
    });
  }

  try {
    const classes = await listClassSessions();
    results.push({
      id: "classes",
      label: "Class sessions readable",
      status: classes.length ? "pass" : "warn",
      detail: classes.length
        ? `${classes.length} class session(s) scheduled.`
        : "No classes scheduled — add at least one open session for pilot testing.",
    });
  } catch (err) {
    results.push({
      id: "classes",
      label: "Class sessions readable",
      status: "fail",
      detail: err instanceof Error ? err.message : "Unable to read classes.",
    });
  }

  try {
    const report = await getAdminAnalyticsReport();
    results.push({
      id: "analytics",
      label: "Analytics report generation",
      status: "pass",
      detail: `Report generated at ${new Date(report.generatedAt).toLocaleString()}.`,
    });
  } catch (err) {
    results.push({
      id: "analytics",
      label: "Analytics report generation",
      status: "fail",
      detail: err instanceof Error ? err.message : "Unable to build analytics report.",
    });
  }

  try {
    const logoResponse = await fetch("/afta-logo.png", { method: "HEAD" });
    results.push({
      id: "logo",
      label: "AFTA logo asset",
      status: logoResponse.ok ? "pass" : "fail",
      detail: logoResponse.ok ? "Logo available at /afta-logo.png." : "Logo missing from public assets.",
    });
  } catch {
    results.push({
      id: "logo",
      label: "AFTA logo asset",
      status: "warn",
      detail: "Could not verify logo asset (offline or blocked).",
    });
  }

  return results;
}

function checkFirebaseConfig() {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    return {
      id: "firebase-config",
      label: "Firebase configuration",
      status: "fail",
      detail: "VITE_FIREBASE_PROJECT_ID is not set.",
    };
  }

  return {
    id: "firebase-config",
    label: "Firebase configuration",
    status: projectId === "forge-academy-95f84" ? "pass" : "warn",
    detail:
      projectId === "forge-academy-95f84"
        ? `Connected to pilot project ${projectId}.`
        : `Project ${projectId} — confirm this is the intended pilot environment.`,
  };
}

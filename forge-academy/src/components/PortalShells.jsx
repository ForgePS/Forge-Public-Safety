import { useMemo } from "react";
import { Megaphone } from "lucide-react";
import DashboardLayout from "./DashboardLayout.jsx";
import { useSystemSettingsOptional } from "../context/SystemSettingsContext.jsx";
import { filterNavItemsBySettings } from "../lib/moduleAccess.js";

const studentNavBase = [
  { group: "Home", label: "Dashboard", to: "/student", end: true },
  { group: "Home", label: "My Profile", to: "/student/profile" },

  { group: "Training", label: "Register for Class", to: "/student/register", module: "registration", flags: ["registration.allowSelfRegistration"] },
  { group: "Training", label: "Course Catalog", to: "/student/catalog", module: "registration" },
  { group: "Training", label: "Assigned Tests", to: "/student/tests", module: "testing", flags: ["testing.onlineTestingEnabled"] },
  { group: "Training", label: "Test Results", to: "/student/test-results", module: "testing", flags: ["students.showTestResultsToStudent"] },
  { group: "Training", label: "Skills Progress", to: "/student/skills", module: "skills", flags: ["skills.allowStudentViewProgress"] },

  { group: "Records", label: "My Transcript", to: "/student/transcript", flags: ["students.showTranscriptToStudent"] },
  { group: "Records", label: "Certificates", to: "/student/certificates", module: "certificates" },
  { group: "Records", label: "Certifications", to: "/student/certifications", module: "certifications", flags: ["students.showCertificationsToStudent"] },

  { group: "Campus", label: "My Housing", to: "/student/housing", module: "housing" },
  { group: "Campus", label: "Challenge Testing", to: "/student/challenge-testing", module: "testing", flags: ["testing.challengeTestingEnabled"] },
];

export default function StudentPortalShell() {
  const settingsContext = useSystemSettingsOptional();
  const settings = settingsContext?.settings;
  const navItems = useMemo(
    () => (settings ? filterNavItemsBySettings(settings, studentNavBase) : studentNavBase),
    [settings],
  );

  return <DashboardLayout portalLabel="Student Portal" navItems={navItems} />;
}

const departmentNavBase = [
  { group: "Overview", label: "Dashboard", to: "/department", end: true },
  { group: "Members", label: "Roster", to: "/department/roster", module: "departments" },
  { group: "Members", label: "Bulk Registration", to: "/department/bulk-register", module: "registration", flags: ["registration.allowBulkDepartmentRegistration"] },
  { group: "Members", label: "Approvals", to: "/department/approvals", module: "registration", flags: ["departments.requireApprovalForRegistration"] },
  { group: "Reports", label: "Compliance Report", to: "/department/compliance", module: "departments", flags: ["departments.complianceReportsEnabled"] },
  { group: "Campus", label: "Member Housing", to: "/department/housing", module: "housing" },
];

export function DepartmentPortalShell() {
  const settingsContext = useSystemSettingsOptional();
  const settings = settingsContext?.settings;
  const navItems = useMemo(
    () => (settings ? filterNavItemsBySettings(settings, departmentNavBase) : departmentNavBase),
    [settings],
  );

  return <DashboardLayout portalLabel="Department Portal" navItems={navItems} />;
}

const instructorNavBase = [
  { group: "Overview", label: "Dashboard", to: "/instructor", end: true },
  { group: "Overview", label: "Announcements", to: "/instructor/announcements", icon: Megaphone },
  { group: "Classes", label: "My Classes", to: "/instructor/classes", module: "classes" },
  { group: "Classes", label: "Attendance", to: "/instructor/attendance", module: "classes" },
  { group: "Classes", label: "Closeout Reports", to: "/instructor/closeout", module: "classes" },
  { group: "Evaluation", label: "Skills Sheets", to: "/instructor/skills", module: "skills" },
  { group: "Evaluation", label: "Written Tests", to: "/instructor/tests", module: "testing", flags: ["instructors.allowManualTestEntry"] },
  { group: "Evaluation", label: "Live Monitor", to: "/instructor/proctor", module: "testing", flags: ["testing.proctorMonitorEnabled"] },
  { group: "Profile", label: "My Profile", to: "/instructor/profile", module: "instructors", flags: ["instructors.allowSelfServiceProfile"] },
  { group: "Campus", label: "Housing Rosters", to: "/instructor/housing", module: "housing" },
];

export function InstructorPortalShell() {
  const settingsContext = useSystemSettingsOptional();
  const settings = settingsContext?.settings;
  const navItems = useMemo(
    () => (settings ? filterNavItemsBySettings(settings, instructorNavBase) : instructorNavBase),
    [settings],
  );

  return <DashboardLayout portalLabel="Instructor Portal" navItems={navItems} />;
}

const certificationNavBase = [
  { group: "Overview", label: "Dashboard", to: "/certification", end: true, module: "certifications" },
  { group: "Review", label: "Pending Review", to: "/certification/pending", module: "certifications" },
  { group: "Review", label: "Renewals", to: "/certification/renewals", module: "certifications" },
  { group: "Reports", label: "Audit Trail", to: "/certification/audit", module: "certifications" },
];

export function CertificationPortalShell() {
  const settingsContext = useSystemSettingsOptional();
  const settings = settingsContext?.settings;
  const navItems = useMemo(
    () => (settings ? filterNavItemsBySettings(settings, certificationNavBase) : certificationNavBase),
    [settings],
  );

  return <DashboardLayout portalLabel="Certification Officer" navItems={navItems} />;
}

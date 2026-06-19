import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute, { RoleRedirect } from "./components/ProtectedRoute.jsx";
import { ROLES } from "./lib/roles.js";
import LoginPage from "./pages/LoginPage.jsx";
import UnauthorizedPage from "./pages/UnauthorizedPage.jsx";
import AdminPortalAnnouncementsPage from "./pages/admin/AdminPortalAnnouncementsPage.jsx";
import AdminDashboardPage from "./pages/dashboards/AdminDashboardPage.jsx";
import CertificationDashboardPage from "./pages/dashboards/CertificationDashboardPage.jsx";
import DepartmentDashboardPage from "./pages/dashboards/DepartmentDashboardPage.jsx";
import InstructorDashboardPage from "./pages/dashboards/InstructorDashboardPage.jsx";
import StudentDashboardPage from "./pages/dashboards/StudentDashboardPage.jsx";
import UsersListPage from "./pages/admin/UsersListPage.jsx";
import UserFormPage from "./pages/admin/UserFormPage.jsx";
import StudentFormPage from "./pages/admin/StudentFormPage.jsx";
import StudentsListPage from "./pages/admin/StudentsListPage.jsx";
import DepartmentFormPage from "./pages/admin/DepartmentFormPage.jsx";
import DepartmentsListPage from "./pages/admin/DepartmentsListPage.jsx";
import AdminDepartmentRosterPage from "./pages/admin/AdminDepartmentRosterPage.jsx";
import DepartmentRosterPage from "./pages/department/DepartmentRosterPage.jsx";
import CoursesListPage from "./pages/admin/CoursesListPage.jsx";
import CourseFormPage from "./pages/admin/CourseFormPage.jsx";
import ClassesListPage from "./pages/admin/ClassesListPage.jsx";
import ClassFormPage from "./pages/admin/ClassFormPage.jsx";
import CourseCatalogPage from "./pages/catalog/CourseCatalogPage.jsx";
import InstructorPortalAnnouncementsPage from "./pages/instructor/InstructorPortalAnnouncementsPage.jsx";
import InstructorClassesPage from "./pages/instructor/InstructorClassesPage.jsx";
import StudentRegistrationPage from "./pages/student/StudentRegistrationPage.jsx";
import AdminRegistrationsPage from "./pages/admin/AdminRegistrationsPage.jsx";
import AdminClassRosterPage from "./pages/admin/AdminClassRosterPage.jsx";
import DepartmentApprovalsPage from "./pages/department/DepartmentApprovalsPage.jsx";
import DepartmentBulkRegisterPage from "./pages/department/DepartmentBulkRegisterPage.jsx";
import DepartmentCompliancePage from "./pages/department/DepartmentCompliancePage.jsx";
import DepartmentHousingPage from "./pages/department/DepartmentHousingPage.jsx";
import InstructorAttendancePage from "./pages/instructor/InstructorAttendancePage.jsx";
import InstructorAttendanceSheetPage from "./pages/instructor/InstructorAttendanceSheetPage.jsx";
import InstructorsListPage from "./pages/admin/InstructorsListPage.jsx";
import InstructorFormPage from "./pages/admin/InstructorFormPage.jsx";
import InstructorSchedulePage from "./pages/instructor/InstructorSchedulePage.jsx";
import InstructorProfilePage from "./pages/instructor/InstructorProfilePage.jsx";
import AdminCertificatesPage from "./pages/admin/AdminCertificatesPage.jsx";
import AdminCertificateCreatePage from "./pages/admin/AdminCertificateCreatePage.jsx";
import AdminCertificateViewPage from "./pages/admin/AdminCertificateViewPage.jsx";
import CertificateTemplatesListPage from "./pages/admin/CertificateTemplatesListPage.jsx";
import CertificateTemplateFormPage from "./pages/admin/CertificateTemplateFormPage.jsx";
import StudentCertificatesPage from "./pages/student/StudentCertificatesPage.jsx";
import StudentCertificateViewPage from "./pages/student/StudentCertificateViewPage.jsx";
import CertificateVerifyPage from "./pages/CertificateVerifyPage.jsx";
import StudentProfilePage from "./pages/student/StudentProfilePage.jsx";
import StudentTranscriptPage from "./pages/student/StudentTranscriptPage.jsx";
import AdminStudentTranscriptPage from "./pages/admin/AdminStudentTranscriptPage.jsx";
import SkillTemplatesListPage from "./pages/admin/SkillTemplatesListPage.jsx";
import SkillTemplateFormPage from "./pages/admin/SkillTemplateFormPage.jsx";
import AdminClassSkillsPage from "./pages/admin/AdminClassSkillsPage.jsx";
import InstructorSkillsPage from "./pages/instructor/InstructorSkillsPage.jsx";
import InstructorClassSkillsPage from "./pages/instructor/InstructorClassSkillsPage.jsx";
import InstructorSkillEvaluationPage from "./pages/instructor/InstructorSkillEvaluationPage.jsx";
import StudentSkillsPage from "./pages/student/StudentSkillsPage.jsx";
import StudentTestResultsPage from "./pages/student/StudentTestResultsPage.jsx";
import AdminCertificationsPage from "./pages/admin/AdminCertificationsPage.jsx";
import AdminCertificationTypesPage from "./pages/admin/AdminCertificationTypesPage.jsx";
import AdminTestsListPage from "./pages/admin/AdminTestsListPage.jsx";
import AdminTestFormPage from "./pages/admin/AdminTestFormPage.jsx";
import AdminQuestionBanksPage from "./pages/admin/AdminQuestionBanksPage.jsx";
import AdminTestingHomePage from "./pages/admin/AdminTestingHomePage.jsx";
import AdminTestCategoriesPage from "./pages/admin/AdminTestCategoriesPage.jsx";
import AdminQuestionBankFormPage from "./pages/admin/AdminQuestionBankFormPage.jsx";
import AdminTestBlueprintsListPage from "./pages/admin/AdminTestBlueprintsListPage.jsx";
import AdminTestBlueprintFormPage from "./pages/admin/AdminTestBlueprintFormPage.jsx";
import AdminTestEligibilityPage from "./pages/admin/AdminTestEligibilityPage.jsx";
import AdminTestingWindowsPage from "./pages/admin/AdminTestingWindowsPage.jsx";
import AdminTestingRoomsPage from "./pages/admin/AdminTestingRoomsPage.jsx";
import AdminTestingSeatsPage from "./pages/admin/AdminTestingSeatsPage.jsx";
import AdminProctorAssignmentsPage from "./pages/admin/AdminProctorAssignmentsPage.jsx";
import AdminTestAccommodationsPage from "./pages/admin/AdminTestAccommodationsPage.jsx";
import AdminTestAssignmentsPage from "./pages/admin/AdminTestAssignmentsPage.jsx";
import AdminProctorMonitorPage from "./pages/admin/AdminProctorMonitorPage.jsx";
import StudentAssignedTestsPage from "./pages/student/StudentAssignedTestsPage.jsx";
import StudentTestTakePage from "./pages/student/StudentTestTakePage.jsx";
import InstructorProctorMonitorPage from "./pages/instructor/InstructorProctorMonitorPage.jsx";
import AdminTestingResultsHubPage from "./pages/admin/AdminTestingResultsHubPage.jsx";
import AdminManualGradingPage from "./pages/admin/AdminManualGradingPage.jsx";
import AdminTestResultsReviewPage from "./pages/admin/AdminTestResultsReviewPage.jsx";
import AdminRemediationPage from "./pages/admin/AdminRemediationPage.jsx";
import AdminRetestRequestsPage from "./pages/admin/AdminRetestRequestsPage.jsx";
import AdminCertificateReleasePage from "./pages/admin/AdminCertificateReleasePage.jsx";
import AdminQuestionAnalyticsPage from "./pages/admin/AdminQuestionAnalyticsPage.jsx";
import AdminTestingReportsPage from "./pages/admin/AdminTestingReportsPage.jsx";
import AdminStateCertificationPage from "./pages/admin/AdminStateCertificationPage.jsx";
import AdminChallengeTestingPage from "./pages/admin/AdminChallengeTestingPage.jsx";
import AdminTestingAuditPage from "./pages/admin/AdminTestingAuditPage.jsx";
import AdminLmsIntegrationPage from "./pages/admin/AdminLmsIntegrationPage.jsx";
import AdminSystemSettingsPage from "./pages/admin/AdminSystemSettingsPage.jsx";
import AdminPortalShell from "./components/AdminPortalShell.jsx";
import ModuleGuard, { VerifyModuleGuard } from "./components/ModuleGuard.jsx";
import StudentPortalShell, {
  CertificationPortalShell,
  DepartmentPortalShell,
  InstructorPortalShell,
} from "./components/PortalShells.jsx";
import { SystemSettingsRoute } from "./components/SystemSettingsRoute.jsx";
import AdminClassTestsPage from "./pages/admin/AdminClassTestsPage.jsx";
import AdminReportsPage from "./pages/admin/AdminReportsPage.jsx";
import AdminDigitalDashboardPage from "./pages/admin/AdminDigitalDashboardPage.jsx";
import DigitalDisplayPlayerPage from "./pages/DigitalDisplayPlayerPage.jsx";
import AdminPilotReleasePage from "./pages/admin/AdminPilotReleasePage.jsx";
import AdminHousingClassesPage from "./pages/admin/AdminHousingClassesPage.jsx";
import AdminRoomsListPage from "./pages/admin/AdminRoomsListPage.jsx";
import AdminRoomFormPage from "./pages/admin/AdminRoomFormPage.jsx";
import AdminClassHousingPage from "./pages/admin/AdminClassHousingPage.jsx";
import AdminHousingReportsPage from "./pages/admin/AdminHousingReportsPage.jsx";
import InstructorTestsPage from "./pages/instructor/InstructorTestsPage.jsx";
import InstructorClassTestsPage from "./pages/instructor/InstructorClassTestsPage.jsx";
import InstructorCloseoutPage from "./pages/instructor/InstructorCloseoutPage.jsx";
import InstructorHousingPage from "./pages/instructor/InstructorHousingPage.jsx";
import InstructorClassHousingPage from "./pages/instructor/InstructorClassHousingPage.jsx";
import StudentCertificationsPage from "./pages/student/StudentCertificationsPage.jsx";
import StudentHousingPage from "./pages/student/StudentHousingPage.jsx";
import StudentChallengeRequestPage from "./pages/student/StudentChallengeRequestPage.jsx";
import CertificationPendingPage from "./pages/certification/CertificationPendingPage.jsx";
import CertificationRenewalsPage from "./pages/certification/CertificationRenewalsPage.jsx";
import CertificationAuditPage from "./pages/certification/CertificationAuditPage.jsx";

function PlaceholderPage({ title }) {
  return (
    <div className="p-7">
      <h2 className="text-lg font-semibold text-[var(--color-afta-text)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--color-afta-subtle)]">Coming in a future sprint.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/verify/:validationCode"
        element={
          <VerifyModuleGuard>
            <CertificateVerifyPage />
          </VerifyModuleGuard>
        }
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/display/:displayId/:publicKey" element={<DigitalDisplayPlayerPage />} />
      <Route index element={<RoleRedirect />} />

      <Route element={<ProtectedRoute allowedRoles={[ROLES.ACADEMY_ADMIN, ROLES.SUPER_ADMIN, ROLES.CREATOR]} />}>
        <Route element={<AdminPortalShell />}>
          <Route element={<ModuleGuard portal="admin" />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/announcements" element={<AdminPortalAnnouncementsPage />} />
          <Route path="/admin/departments" element={<DepartmentsListPage />} />
          <Route path="/admin/departments/new" element={<DepartmentFormPage />} />
          <Route path="/admin/departments/:departmentId/roster" element={<AdminDepartmentRosterPage />} />
          <Route path="/admin/departments/:departmentId" element={<DepartmentFormPage />} />
          <Route path="/admin/students" element={<StudentsListPage />} />
          <Route path="/admin/students/new" element={<StudentFormPage />} />
          <Route path="/admin/students/:studentId" element={<StudentFormPage />} />
          <Route path="/admin/students/:studentId/transcript" element={<AdminStudentTranscriptPage />} />
          <Route path="/admin/users" element={<UsersListPage />} />
          <Route path="/admin/users/new" element={<UserFormPage />} />
          <Route path="/admin/users/:userId" element={<UserFormPage />} />
          <Route
            path="/admin/settings"
            element={
              <SystemSettingsRoute>
                <AdminSystemSettingsPage />
              </SystemSettingsRoute>
            }
          />
          <Route path="/admin/courses" element={<CoursesListPage />} />
          <Route path="/admin/courses/new" element={<CourseFormPage />} />
          <Route path="/admin/courses/:courseId" element={<CourseFormPage />} />
          <Route path="/admin/scheduling" element={<ClassesListPage />} />
          <Route path="/admin/scheduling/new" element={<ClassFormPage />} />
          <Route path="/admin/scheduling/:classId/roster" element={<AdminClassRosterPage />} />
          <Route path="/admin/scheduling/:classId/skills" element={<AdminClassSkillsPage />} />
          <Route path="/admin/scheduling/:classId/tests" element={<AdminClassTestsPage />} />
          <Route path="/admin/scheduling/:classId" element={<ClassFormPage />} />
          <Route path="/admin/registrations" element={<AdminRegistrationsPage />} />
          <Route path="/admin/instructors" element={<InstructorsListPage />} />
          <Route path="/admin/instructors/new" element={<InstructorFormPage />} />
          <Route path="/admin/instructors/:instructorId" element={<InstructorFormPage />} />
          <Route path="/admin/certificates" element={<AdminCertificatesPage />} />
          <Route path="/admin/certificates/new" element={<AdminCertificateCreatePage />} />
          <Route path="/admin/certificates/:certificateId/print" element={<AdminCertificateViewPage />} />
          <Route path="/admin/certificates/templates" element={<CertificateTemplatesListPage />} />
          <Route path="/admin/certificates/templates/new" element={<CertificateTemplateFormPage />} />
          <Route path="/admin/certificates/templates/:templateId" element={<CertificateTemplateFormPage />} />
          <Route path="/admin/skills/templates" element={<SkillTemplatesListPage />} />
          <Route path="/admin/skills/templates/new" element={<SkillTemplateFormPage />} />
          <Route path="/admin/skills/templates/:templateId" element={<SkillTemplateFormPage />} />
          <Route path="/admin/certifications" element={<AdminCertificationsPage />} />
          <Route path="/admin/certification-types" element={<AdminCertificationTypesPage />} />
          <Route path="/admin/tests" element={<AdminTestsListPage />} />
          <Route path="/admin/tests/new" element={<AdminTestFormPage />} />
          <Route path="/admin/tests/:testId" element={<AdminTestFormPage />} />
          <Route path="/admin/testing" element={<AdminTestingHomePage />} />
          <Route path="/admin/testing/categories" element={<AdminTestCategoriesPage />} />
          <Route path="/admin/testing/question-banks" element={<AdminQuestionBanksPage />} />
          <Route path="/admin/testing/question-banks/new" element={<AdminQuestionBankFormPage />} />
          <Route path="/admin/testing/question-banks/:bankId" element={<AdminQuestionBankFormPage />} />
          <Route path="/admin/testing/blueprints" element={<AdminTestBlueprintsListPage />} />
          <Route path="/admin/testing/blueprints/new" element={<AdminTestBlueprintFormPage />} />
          <Route path="/admin/testing/blueprints/:blueprintId" element={<AdminTestBlueprintFormPage />} />
          <Route path="/admin/testing/eligibility" element={<AdminTestEligibilityPage />} />
          <Route path="/admin/testing/windows" element={<AdminTestingWindowsPage />} />
          <Route path="/admin/testing/rooms" element={<AdminTestingRoomsPage />} />
          <Route path="/admin/testing/seats" element={<AdminTestingSeatsPage />} />
          <Route path="/admin/testing/proctors" element={<AdminProctorAssignmentsPage />} />
          <Route path="/admin/testing/accommodations" element={<AdminTestAccommodationsPage />} />
          <Route path="/admin/testing/assignments" element={<AdminTestAssignmentsPage />} />
          <Route path="/admin/testing/monitor" element={<AdminProctorMonitorPage />} />
          <Route path="/admin/testing/results-hub" element={<AdminTestingResultsHubPage />} />
          <Route path="/admin/testing/grading" element={<AdminManualGradingPage />} />
          <Route path="/admin/testing/results" element={<AdminTestResultsReviewPage />} />
          <Route path="/admin/testing/analytics" element={<AdminQuestionAnalyticsPage />} />
          <Route path="/admin/testing/exam-review" element={<AdminQuestionAnalyticsPage />} />
          <Route path="/admin/testing/remediation" element={<AdminRemediationPage />} />
          <Route path="/admin/testing/retests" element={<AdminRetestRequestsPage />} />
          <Route path="/admin/testing/certificate-release" element={<AdminCertificateReleasePage />} />
          <Route path="/admin/testing/reports" element={<AdminTestingReportsPage />} />
          <Route path="/admin/testing/state-certification" element={<AdminStateCertificationPage />} />
          <Route path="/admin/testing/challenge" element={<AdminChallengeTestingPage />} />
          <Route path="/admin/testing/audit" element={<AdminTestingAuditPage />} />
          <Route path="/admin/testing/lms-integration" element={<AdminLmsIntegrationPage />} />
          <Route path="/admin/question-banks" element={<AdminQuestionBanksPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/digital-dashboard" element={<AdminDigitalDashboardPage />} />
          <Route path="/admin/housing" element={<AdminHousingClassesPage />} />
          <Route path="/admin/housing/rooms" element={<AdminRoomsListPage />} />
          <Route path="/admin/housing/rooms/new" element={<AdminRoomFormPage />} />
          <Route path="/admin/housing/rooms/:roomId" element={<AdminRoomFormPage />} />
          <Route path="/admin/housing/reports" element={<AdminHousingReportsPage />} />
          <Route path="/admin/housing/:classId" element={<AdminClassHousingPage />} />
          <Route path="/admin/pilot" element={<AdminPilotReleasePage />} />
          <Route path="/admin/*" element={<PlaceholderPage title="Admin module" />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={ROLES.STUDENT} />}>
        <Route element={<StudentPortalShell />}>
          <Route element={<ModuleGuard portal="student" />}>
          <Route path="/student" element={<StudentDashboardPage />} />
          <Route path="/student/profile" element={<StudentProfilePage />} />
          <Route path="/student/register" element={<StudentRegistrationPage />} />
          <Route path="/student/transcript" element={<StudentTranscriptPage />} />
          <Route path="/student/skills" element={<StudentSkillsPage />} />
          <Route path="/student/test-results" element={<StudentTestResultsPage />} />
          <Route path="/student/tests" element={<StudentAssignedTestsPage />} />
          <Route path="/student/tests/:assignmentId" element={<StudentTestTakePage />} />
          <Route path="/student/challenge-testing" element={<StudentChallengeRequestPage />} />
          <Route path="/student/certifications" element={<StudentCertificationsPage />} />
          <Route path="/student/housing" element={<StudentHousingPage />} />
          <Route path="/student/certificates" element={<StudentCertificatesPage />} />
          <Route path="/student/certificates/:certificateId" element={<StudentCertificateViewPage />} />
          <Route
            path="/student/catalog"
            element={
              <CourseCatalogPage
                title="Course Catalog"
                subtitle="Browse academy courses and prerequisites"
              />
            }
          />
          <Route path="/student/*" element={<PlaceholderPage title="Student module" />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={ROLES.DEPARTMENT} />}>
        <Route element={<DepartmentPortalShell />}>
          <Route element={<ModuleGuard portal="department" />}>
          <Route path="/department" element={<DepartmentDashboardPage />} />
          <Route path="/department/roster" element={<DepartmentRosterPage />} />
          <Route path="/department/bulk-register" element={<DepartmentBulkRegisterPage />} />
          <Route path="/department/approvals" element={<DepartmentApprovalsPage />} />
          <Route path="/department/compliance" element={<DepartmentCompliancePage />} />
          <Route path="/department/housing" element={<DepartmentHousingPage />} />
          <Route path="/department/*" element={<PlaceholderPage title="Department module" />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={ROLES.INSTRUCTOR} />}>
        <Route element={<InstructorPortalShell />}>
          <Route element={<ModuleGuard portal="instructor" />}>
          <Route path="/instructor" element={<InstructorDashboardPage />} />
          <Route path="/instructor/announcements" element={<InstructorPortalAnnouncementsPage />} />
          <Route path="/instructor/classes" element={<InstructorClassesPage />} />
          <Route path="/instructor/attendance" element={<InstructorAttendancePage />} />
          <Route path="/instructor/attendance/:classId" element={<InstructorAttendanceSheetPage />} />
          <Route path="/instructor/schedule" element={<InstructorSchedulePage />} />
          <Route path="/instructor/profile" element={<InstructorProfilePage />} />
          <Route path="/instructor/skills" element={<InstructorSkillsPage />} />
          <Route path="/instructor/skills/:classId" element={<InstructorClassSkillsPage />} />
          <Route
            path="/instructor/skills/:classId/evaluate/:studentId"
            element={<InstructorSkillEvaluationPage />}
          />
          <Route path="/instructor/tests" element={<InstructorTestsPage />} />
          <Route path="/instructor/tests/:classId" element={<InstructorClassTestsPage />} />
          <Route path="/instructor/proctor" element={<InstructorProctorMonitorPage />} />
          <Route path="/instructor/closeout" element={<InstructorCloseoutPage />} />
          <Route path="/instructor/housing" element={<InstructorHousingPage />} />
          <Route path="/instructor/housing/:classId" element={<InstructorClassHousingPage />} />
          <Route path="/instructor/*" element={<PlaceholderPage title="Instructor module" />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={ROLES.CERTIFICATION_OFFICER} />}>
        <Route element={<CertificationPortalShell />}>
          <Route element={<ModuleGuard portal="certification" />}>
          <Route path="/certification" element={<CertificationDashboardPage />} />
          <Route path="/certification/pending" element={<CertificationPendingPage />} />
          <Route path="/certification/renewals" element={<CertificationRenewalsPage />} />
          <Route path="/certification/audit" element={<CertificationAuditPage />} />
          <Route path="/certification/*" element={<PlaceholderPage title="Certification module" />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

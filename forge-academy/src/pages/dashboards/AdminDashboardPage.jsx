import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Building2,
  Calendar,
  ClipboardList,
  FileBarChart,
  FileQuestion,
  GraduationCap,
  UserPlus,
  Users,
} from "lucide-react";
import { StatCard } from "../../components/PageHeader.jsx";
import PortalAnnouncementsPanel from "../../components/PortalAnnouncementsPanel.jsx";
import { PORTAL_AUDIENCES } from "../../lib/portalAnnouncements.js";
import {
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUSES,
  getRegistrationSummary,
  listPendingAcademyRegistrations,
  listRegistrations,
} from "../../lib/registrations.js";
import { countIncompleteAttendanceForAdmin } from "../../lib/attendance.js";
import { getAdminAnalyticsReport } from "../../lib/reports.js";
import { getHousingDashboardMetrics } from "../../lib/housingReports.js";
import { getTestingDashboardMetrics } from "../../lib/testGrading.js";
import { listClassSessions } from "../../lib/classes.js";
import { INSTRUCTOR_STATUSES, listInstructors } from "../../lib/instructors.js";

const QUICK_ACTIONS = [
  { label: "Add Student", to: "/admin/students/new", icon: UserPlus },
  { label: "Schedule Class", to: "/admin/scheduling/new", icon: Calendar },
  { label: "Registration Queue", to: "/admin/registrations", icon: ClipboardList },
  { label: "Issue Certificates", to: "/admin/certificates", icon: Award },
  { label: "Testing Hub", to: "/admin/testing", icon: FileQuestion },
  { label: "Generate Report", to: "/admin/reports", icon: FileBarChart },
];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatClassDate(dateString) {
  if (!dateString) return "";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function buildRegistrationBreakdown(registrations) {
  const buckets = [
    { key: "enrolled", label: "Enrolled", color: "#2563eb", statuses: [REGISTRATION_STATUSES.ENROLLED] },
    {
      key: "pending",
      label: "Pending approval",
      color: "#f59e0b",
      statuses: [REGISTRATION_STATUSES.PENDING_DEPARTMENT, REGISTRATION_STATUSES.PENDING_ACADEMY],
    },
    { key: "waitlisted", label: "Waitlisted", color: "#64748b", statuses: [REGISTRATION_STATUSES.WAITLISTED] },
    { key: "cancelled", label: "Cancelled", color: "#94a3b8", statuses: [REGISTRATION_STATUSES.CANCELLED] },
    { key: "denied", label: "Denied", color: "#c8102e", statuses: [REGISTRATION_STATUSES.DENIED] },
  ];

  const total = registrations.length || 1;
  return buckets.map((bucket) => {
    const count = registrations.filter((item) => bucket.statuses.includes(item.status)).length;
    return {
      ...bucket,
      count,
      percent: Math.round((count / total) * 100),
    };
  });
}

function DonutChart({ segments, totalLabel }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  let cursor = 0;
  const gradient = segments
    .filter((segment) => segment.count > 0)
    .map((segment) => {
      const start = cursor;
      cursor += (segment.count / Math.max(total, 1)) * 100;
      return `${segment.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div
        className="relative h-36 w-36 shrink-0 rounded-full"
        style={{ background: total > 0 ? `conic-gradient(${gradient})` : "#e2e8f0" }}
      >
        <div className="absolute inset-4 grid place-items-center rounded-full bg-[var(--color-afta-surface)] text-center">
          <p className="text-xl font-bold text-[var(--color-afta-text)]">{total}</p>
          <p className="text-[10px] text-[var(--color-afta-muted)]">{totalLabel}</p>
        </div>
      </div>
      <ul className="flex-1 space-y-2 text-sm">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[var(--color-afta-text)]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <span className="text-[var(--color-afta-muted)]">
              {segment.count} ({segment.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [activeInstructors, setActiveInstructors] = useState(0);
  const [housingMetrics, setHousingMetrics] = useState(null);
  const [testingMetrics, setTestingMetrics] = useState(null);
  const [queue, setQueue] = useState([]);
  const [attendanceIncomplete, setAttendanceIncomplete] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const today = todayString();
        const [
          analytics,
          stats,
          pending,
          incompleteAttendance,
          housing,
          testing,
          registrationRows,
          classes,
          instructors,
        ] = await Promise.all([
          getAdminAnalyticsReport(),
          getRegistrationSummary(),
          listPendingAcademyRegistrations(),
          countIncompleteAttendanceForAdmin(),
          getHousingDashboardMetrics(),
          getTestingDashboardMetrics().catch(() => null),
          listRegistrations(),
          listClassSessions(),
          listInstructors(),
        ]);
        if (!active) return;

        setReport(analytics);
        setSummary(stats);
        setRegistrations(registrationRows);
        setHousingMetrics(housing);
        setTestingMetrics(testing);
        setQueue(pending.slice(0, 5));
        setAttendanceIncomplete(incompleteAttendance);
        setActiveInstructors(
          instructors.filter((item) => item.status === INSTRUCTOR_STATUSES.ACTIVE).length,
        );
        setUpcomingClasses(
          classes
            .filter((session) => session.startDate >= today)
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
            .slice(0, 5),
        );
      } catch {
        // Keep dashboard usable if data fails to load.
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const registrationBreakdown = useMemo(
    () => buildRegistrationBreakdown(registrations),
    [registrations],
  );

  const pendingTotal = useMemo(() => {
    if (!summary) return 0;
    return summary.pendingDepartment + summary.pendingAcademy;
  }, [summary]);

  const activityBars = [
    { label: "Registrations", value: report?.summary.pendingRegistrations ?? 0, color: "#2563eb" },
    { label: "Enrolled", value: report?.summary.enrolledStudents ?? 0, color: "#c8102e" },
    { label: "Certificates", value: report?.summary.certificatesIssued ?? 0, color: "#64748b" },
  ];
  const activityMax = Math.max(...activityBars.map((item) => item.value), 1);

  const compliancePercent = report
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((report.summary.activeDepartments - (report.summary.expiringIn30Days > 0 ? 1 : 0)) /
              Math.max(report.summary.activeDepartments, 1)) *
              100,
          ),
        ),
      )
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Active Students"
            value={loading ? "…" : (report?.summary.activeStudents ?? 0)}
            sub="Students with active records"
            linkTo="/admin/students"
            linkLabel="View all students →"
            icon={Users}
          />
          <StatCard
            label="Upcoming Classes"
            value={loading ? "…" : upcomingClasses.length}
            sub={report ? `${report.summary.classesThisWeek} scheduled this week` : "Scheduled sessions"}
            linkTo="/admin/scheduling"
            linkLabel="View classes →"
            icon={Calendar}
          />
          <StatCard
            label="Active Instructors"
            value={loading ? "…" : activeInstructors}
            sub="Available to teach"
            linkTo="/admin/instructors"
            linkLabel="View instructors →"
            icon={GraduationCap}
          />
          <StatCard
            label="Certificates Issued"
            value={loading ? "…" : (report?.summary.certificatesIssued ?? 0)}
            sub="Course completion certificates"
            linkTo="/admin/certificates"
            linkLabel="View certificates →"
            icon={Award}
          />
          <StatCard
            label="Departments"
            value={loading ? "…" : (report?.summary.activeDepartments ?? 0)}
            sub="Active department accounts"
            linkTo="/admin/departments"
            linkLabel="View departments →"
            icon={Building2}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5 shadow-sm xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Training Activity Overview</h2>
              <Link to="/admin/reports" className="text-[11px] font-semibold text-[var(--color-afta-red)]">
                Full analytics →
              </Link>
            </div>
            <div className="space-y-4">
              {activityBars.map((bar) => (
                <div key={bar.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--color-afta-text)]">{bar.label}</span>
                    <span className="text-[var(--color-afta-muted)]">{bar.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${(bar.value / activityMax) * 100}%`,
                        backgroundColor: bar.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <PortalAnnouncementsPanel audience={PORTAL_AUDIENCES.ADMIN} />
        </div>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-afta-text)]">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex flex-col items-center gap-2 rounded-[12px] border border-[var(--color-afta-border)] bg-slate-50 px-3 py-4 text-center transition hover:border-[var(--color-afta-red)]/30 hover:bg-white"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--color-afta-red)] shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-afta-text)]">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-3">
          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Registrations by Status</h2>
              <Link to="/admin/registrations" className="text-[11px] font-semibold text-[var(--color-afta-red)]">
                View all →
              </Link>
            </div>
            {loading ? (
              <p className="text-sm text-[var(--color-afta-muted)]">Loading…</p>
            ) : (
              <DonutChart segments={registrationBreakdown} totalLabel="Total" />
            )}
          </section>

          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Upcoming Classes</h2>
              <Link to="/admin/scheduling" className="text-[11px] font-semibold text-[var(--color-afta-red)]">
                View all →
              </Link>
            </div>
            {loading ? (
              <p className="text-sm text-[var(--color-afta-muted)]">Loading…</p>
            ) : upcomingClasses.length === 0 ? (
              <p className="text-sm text-[var(--color-afta-muted)]">No upcoming classes scheduled.</p>
            ) : (
              <ul className="space-y-3">
                {upcomingClasses.map((session) => (
                  <li key={session.id} className="border-b border-[var(--color-afta-border)] pb-3 last:border-0 last:pb-0">
                    <Link
                      to={`/admin/scheduling/${session.id}/roster`}
                      className="flex items-start justify-between gap-3 transition hover:opacity-80"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-afta-red)]">
                          {formatClassDate(session.startDate)}
                        </p>
                        <p className="text-sm font-medium text-[var(--color-afta-text)]">{session.courseName}</p>
                        <p className="text-xs text-[var(--color-afta-muted)]">{session.location || "TBD"}</p>
                      </div>
                      <p className="shrink-0 text-xs font-semibold text-emerald-600">
                        {session.enrolledCount}/{session.enrollmentCap}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Compliance Overview</h2>
              <Link to="/admin/reports" className="text-[11px] font-semibold text-[var(--color-afta-red)]">
                View report →
              </Link>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div
                className="relative h-32 w-32 rounded-full"
                style={{
                  background: `conic-gradient(#16a34a 0% ${compliancePercent}%, #f59e0b ${compliancePercent}% ${compliancePercent + 8}%, #c8102e ${compliancePercent + 8}% 100%)`,
                }}
              >
                <div className="absolute inset-4 grid place-items-center rounded-full bg-[var(--color-afta-surface)] text-center">
                  <p className="text-lg font-bold text-[var(--color-afta-text)]">{loading ? "…" : `${compliancePercent}%`}</p>
                  <p className="text-[10px] text-[var(--color-afta-muted)]">Overall</p>
                </div>
              </div>
              <ul className="w-full space-y-2 text-xs text-[var(--color-afta-muted)]">
                <li className="flex justify-between">
                  <span>Active departments</span>
                  <span className="font-semibold text-[var(--color-afta-text)]">
                    {report?.summary.activeDepartments ?? 0}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Certs expiring in 30 days</span>
                  <span className="font-semibold text-[var(--color-afta-red)]">
                    {report?.summary.expiringIn30Days ?? 0}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Pending registrations</span>
                  <span className="font-semibold text-[var(--color-afta-text)]">{pendingTotal}</span>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Testing Executive Dashboard</h2>
            <Link to="/admin/testing/results-hub" className="text-[11px] font-semibold text-[var(--color-afta-red)]">
              Grading hub →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active Exams"
              value={loading ? "…" : (testingMetrics?.activeExams ?? 0)}
              sub={`${testingMetrics?.studentsTesting ?? 0} students testing now`}
              linkTo="/admin/testing/monitor"
              linkLabel="Live monitor →"
            />
            <StatCard
              label="Pass Rate"
              value={loading ? "…" : `${testingMetrics?.passRate ?? 0}%`}
              sub={`Avg score ${testingMetrics?.averageScore ?? 0}% · ${testingMetrics?.gradedResultsTotal ?? 0} graded`}
              linkTo="/admin/testing/results"
              linkLabel="View results →"
            />
            <StatCard
              label="Failure Rate"
              value={loading ? "…" : `${testingMetrics?.failureRate ?? 0}%`}
              sub="Across graded attempts"
              warn={(testingMetrics?.failureRate ?? 0) > 25}
            />
            <StatCard
              label="Active Proctors"
              value={loading ? "…" : (testingMetrics?.activeProctors ?? 0)}
              sub="Assigned for today"
              linkTo="/admin/testing/proctors"
              linkLabel="Proctor roster →"
            />
            <StatCard
              label="Manual Grading Queue"
              value={loading ? "…" : (testingMetrics?.manualGradingPending ?? 0)}
              sub="Awaiting review"
              warn={(testingMetrics?.manualGradingPending ?? 0) > 0}
              linkTo="/admin/testing/grading"
              linkLabel="Grading queue →"
            />
            <StatCard
              label="Question Review Alerts"
              value={loading ? "…" : (testingMetrics?.questionReviewAlerts ?? 0)}
              sub="Flagged for content review"
              warn={(testingMetrics?.questionReviewAlerts ?? 0) > 0}
              linkTo="/admin/testing/analytics"
              linkLabel="Analytics →"
            />
            <StatCard
              label="Retests Pending"
              value={loading ? "…" : (testingMetrics?.retestsPendingApproval ?? 0)}
              sub={`${testingMetrics?.remediationPending ?? 0} remediation active`}
              warn={(testingMetrics?.retestsPendingApproval ?? 0) > 0}
              linkTo="/admin/testing/retests"
              linkLabel="Retest queue →"
            />
            <StatCard
              label="Certificates Pending Release"
              value={loading ? "…" : (testingMetrics?.certificatesPendingRelease ?? 0)}
              sub={`${testingMetrics?.certificatesHeld ?? 0} held · ${testingMetrics?.challengeTestsPending ?? 0} challenge pending`}
              warn={(testingMetrics?.certificatesPendingRelease ?? 0) > 0}
              linkTo="/admin/testing/certificate-release"
              linkLabel="Release queue →"
            />
          </div>
        </section>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Operations</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            <StatCard
              label="Pending Registrations"
              value={loading ? "…" : pendingTotal}
              sub={`${summary?.pendingAcademy ?? 0} awaiting academy approval`}
              warn={(summary?.pendingAcademy ?? 0) > 0}
              linkTo="/admin/registrations"
              linkLabel="Registration queue →"
            />
            <StatCard
              label="Attendance Incomplete"
              value={loading ? "…" : attendanceIncomplete}
              sub="Class days need finalized attendance"
              warn={attendanceIncomplete > 0}
              linkTo="/admin/scheduling"
              linkLabel="Manage classes →"
            />
          </div>
        </section>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Registration Queue</h2>
            <Link to="/admin/registrations" className="text-[11px] font-semibold text-[var(--color-afta-red)]">
              View all →
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-[var(--color-afta-muted)]">Loading registration queue…</p>
          ) : queue.length === 0 ? (
            <p className="text-sm text-[var(--color-afta-muted)]">No registrations awaiting academy approval.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                    <th className="px-3 py-2 font-semibold">Student</th>
                    <th className="px-3 py-2 font-semibold">Department</th>
                    <th className="px-3 py-2 font-semibold">Course</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((registration) => (
                    <tr key={registration.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-3 py-2">
                        <Link to="/admin/registrations" className="hover:text-[#c8102e]">
                          {registration.studentName}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{registration.departmentName || "Independent"}</td>
                      <td className="px-3 py-2">{registration.courseName}</td>
                      <td className="px-3 py-2">
                        <Link to="/admin/registrations" className="hover:text-[#c8102e]">
                          {REGISTRATION_STATUS_LABELS[registration.status] ?? registration.status}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {housingMetrics ? (
          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Campus Housing</h2>
              <Link to="/admin/housing" className="text-[11px] font-semibold text-[var(--color-afta-red)]">
                Manage housing →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Need Room Assignment"
                value={housingMetrics.studentsNeedingAssignment ?? 0}
                sub="Enrolled without rooms"
                warn={(housingMetrics.studentsNeedingAssignment ?? 0) > 0}
                linkTo="/admin/housing"
                linkLabel="Assign rooms →"
              />
              <StatCard
                label="Rooms Available"
                value={housingMetrics.roomsAvailable ?? 0}
                sub="Active rooms with space"
                linkTo="/admin/housing/rooms"
                linkLabel="View rooms →"
              />
              <StatCard
                label="Rooms Full"
                value={housingMetrics.roomsFull ?? 0}
                sub="At or over capacity"
                warn={(housingMetrics.roomsFull ?? 0) > 0}
              />
              <StatCard
                label="In Maintenance"
                value={housingMetrics.roomsMaintenance ?? 0}
                sub="Unavailable rooms"
              />
              <StatCard
                label="Housing Classes"
                value={housingMetrics.upcomingHousingClasses ?? 0}
                sub="Upcoming on-campus housing"
                linkTo="/admin/housing"
                linkLabel="View classes →"
              />
            </div>
          </section>
        ) : null}
    </div>
  );
}

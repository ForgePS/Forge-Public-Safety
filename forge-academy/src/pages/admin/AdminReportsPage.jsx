import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader, { StatCard } from "../../components/PageHeader.jsx";
import {
  downloadAdminReportCsv,
  getAdminAnalyticsReport,
} from "../../lib/reports.js";
import { downloadScheduledReportExport, listScheduledReportExports } from "../../lib/scheduledReportExports.js";

export default function AdminReportsPage() {
  const [report, setReport] = useState(null);
  const [scheduledExports, setScheduledExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getAdminAnalyticsReport(), listScheduledReportExports()])
      .then(([analytics, exports]) => {
        setReport(analytics);
        setScheduledExports(exports);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load reports."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Statewide training metrics"
        actions={
          report ? (
            <button
              type="button"
              onClick={() => downloadAdminReportCsv(report)}
              className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
            >
              Download CSV
            </button>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading analytics…</p>
        ) : report ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Students Trained YTD"
                value={report.summary.studentsTrainedYtd}
                sub="Unique students with issued certificates"
              />
              <StatCard
                label="Active Departments"
                value={report.summary.activeDepartments}
                sub={`${report.summary.activeStudents} active students statewide`}
              />
              <StatCard
                label="Certificates Issued"
                value={report.summary.certificatesIssued}
                sub="Course completion certificates"
              />
              <StatCard
                label="Expiring in 30 Days"
                value={report.summary.expiringIn30Days}
                sub="Professional certifications"
                warn={report.summary.expiringIn30Days > 0}
              />
              <StatCard
                label="Classes This Week"
                value={report.summary.classesThisWeek}
                sub={report.summary.classesThisWeekDetail}
              />
              <StatCard
                label="Open Seats"
                value={report.summary.openSeats}
                sub={`Across ${report.summary.openClasses} open classes`}
              />
              <StatCard
                label="Certs Pending Review"
                value={report.summary.pendingCertifications}
                sub="Awaiting certification officer"
                warn={report.summary.pendingCertifications > 0}
              />
              <StatCard
                label="Pending Registrations"
                value={report.summary.pendingRegistrations}
                sub={`${report.summary.enrolledStudents} currently enrolled`}
                warn={report.summary.pendingRegistrations > 0}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
                <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
                  <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Registrations by department</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Active registrations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.registrationsByDepartment.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                            No registration activity yet.
                          </td>
                        </tr>
                      ) : (
                        report.registrationsByDepartment.map((row) => (
                          <tr key={row.departmentName} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                            <td className="px-4 py-3">{row.departmentName}</td>
                            <td className="px-4 py-3">{row.count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
                <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
                  <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Enrollments by course</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                        <th className="px-4 py-3">Course</th>
                        <th className="px-4 py-3">Enrolled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.enrollmentsByCourse.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                            No enrolled students yet.
                          </td>
                        </tr>
                      ) : (
                        report.enrollmentsByCourse.map((row) => (
                          <tr
                            key={`${row.courseNumber}-${row.courseName}`}
                            className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]"
                          >
                            <td className="px-4 py-3">
                              {row.courseNumber} · {row.courseName}
                            </td>
                            <td className="px-4 py-3">{row.enrolled}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <p className="text-xs text-[var(--color-afta-muted)]">
              Generated {new Date(report.generatedAt).toLocaleString()}
            </p>

            <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-afta-border)] px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Scheduled exports</h2>
                  <p className="mt-1 text-xs text-[var(--color-afta-subtle)]">
                    Automated CSV batches from system settings. Configure under{" "}
                    <Link to="/admin/settings" className="text-[#c8102e] hover:underline">
                      System Settings → Reports
                    </Link>
                    .
                  </p>
                </div>
                <Link to="/admin/testing/reports" className="app-btn-secondary px-4 py-2 text-xs">
                  Testing reports
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Rows</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledExports.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                          No scheduled exports yet.
                        </td>
                      </tr>
                    ) : (
                      scheduledExports.map((row) => (
                        <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                          <td className="px-4 py-3 text-xs text-[var(--color-afta-muted)]">
                            {row.createdAt?.toDate ? row.createdAt.toDate().toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3">{row.reportType || "—"}</td>
                          <td className="px-4 py-3">{row.rowCount ?? "—"}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => downloadScheduledReportExport(row)}
                              className="text-xs text-[#c8102e] hover:underline"
                            >
                              Download CSV
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}

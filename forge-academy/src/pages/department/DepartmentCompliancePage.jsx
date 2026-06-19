import { useEffect, useState } from "react";
import PageHeader, { StatCard } from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getDepartment } from "../../lib/departments.js";
import {
  downloadDepartmentComplianceCsv,
  getDepartmentComplianceReport,
} from "../../lib/reports.js";

export default function DepartmentCompliancePage() {
  const { user } = useAuth();
  const [department, setDepartment] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.departmentId) {
      setLoading(false);
      return;
    }

    Promise.all([getDepartment(user.departmentId), getDepartmentComplianceReport(user.departmentId)])
      .then(([dept, compliance]) => {
        setDepartment(dept);
        setReport(compliance);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load compliance report."))
      .finally(() => setLoading(false));
  }, [user?.departmentId]);

  return (
    <>
      <PageHeader
        title="Department Compliance"
        subtitle={department?.name ?? "Training compliance overview"}
        actions={
          report && department ? (
            <button
              type="button"
              onClick={() => downloadDepartmentComplianceCsv(report, department.name)}
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

        {!user?.departmentId && !loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">
            Your profile needs a linked department before compliance data can load.
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading compliance report…</p>
        ) : report ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Active Roster" value={report.summary.activeRoster} sub="Active department members" />
              <StatCard label="Members in Training" value={report.summary.membersInTraining} sub="Currently enrolled" />
              <StatCard
                label="Expiring Certifications"
                value={report.summary.expiringCertifications}
                sub="Next 60 days"
                warn={report.summary.expiringCertifications > 0}
              />
              <StatCard
                label="Pending Approvals"
                value={report.summary.pendingApprovals}
                sub="Registration requests"
                warn={report.summary.pendingApprovals > 0}
              />
            </div>

            <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Certification compliance</h2>
              {report.certificationCompliance.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--color-afta-subtle)]">
                  No certification records for this department yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {report.certificationCompliance.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-[var(--color-afta-text)]">{row.label}</span>
                      <span className="font-semibold text-[var(--color-afta-text)]">
                        {row.percent}%{" "}
                        <span className="text-xs font-normal text-[var(--color-afta-muted)]">
                          ({row.current}/{row.total})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
              <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Completions this month</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.recentCompletions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                          No completions recorded this month.
                        </td>
                      </tr>
                    ) : (
                      report.recentCompletions.map((row) => (
                        <tr
                          key={`${row.studentName}-${row.courseName}-${row.completionDate}`}
                          className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]"
                        >
                          <td className="px-4 py-3">{row.studentName}</td>
                          <td className="px-4 py-3">{row.courseName}</td>
                          <td className="px-4 py-3">{row.completionDate}</td>
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

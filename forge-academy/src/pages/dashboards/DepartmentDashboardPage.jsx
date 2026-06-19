import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader, { StatCard } from "../../components/PageHeader.jsx";
import PortalAnnouncementsPanel from "../../components/PortalAnnouncementsPanel.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { PORTAL_AUDIENCES } from "../../lib/portalAnnouncements.js";
import { getDepartment } from "../../lib/departments.js";
import {
  REGISTRATION_STATUSES,
  countPendingDepartmentApprovals,
  listRegistrationsByDepartment,
} from "../../lib/registrations.js";
import { getDepartmentRosterSummary } from "../../lib/students.js";

export default function DepartmentDashboardPage() {
  const { user } = useAuth();
  const [department, setDepartment] = useState(null);
  const [summary, setSummary] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.departmentId) {
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      try {
        const [dept, stats, pendingCount, pendingRows] = await Promise.all([
          getDepartment(user.departmentId),
          getDepartmentRosterSummary(user.departmentId),
          countPendingDepartmentApprovals(user.departmentId),
          listRegistrationsByDepartment(user.departmentId, REGISTRATION_STATUSES.PENDING_DEPARTMENT),
        ]);
        if (!active) return;
        setDepartment(dept);
        setSummary(stats);
        setPendingApprovals(pendingCount);
        setRecentRequests(pendingRows.slice(0, 5));
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load department dashboard.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user?.departmentId]);

  return (
    <>
      <PageHeader
        title="Department Dashboard"
        subtitle={department?.name ?? "Roster and approvals"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/department/compliance"
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Compliance report
            </Link>
            <Link
              to="/department/approvals"
              className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
            >
              Review approvals
            </Link>
          </div>
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
            Your user profile needs a `departmentId` linked to a department record before roster data can load.
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading department summary…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Active Roster"
                value={summary?.active ?? 0}
                sub={
                  summary
                    ? `${summary.career} career · ${summary.volunteer} volunteer`
                    : "No roster data"
                }
              />
              <StatCard label="Total Members" value={summary?.total ?? 0} sub="Assigned to this department" />
              <StatCard
                label="Inactive Members"
                value={summary?.inactive ?? 0}
                sub="Marked inactive in student records"
                warn={(summary?.inactive ?? 0) > 0}
              />
              <StatCard
                label="Pending Approvals"
                value={pendingApprovals}
                sub="Registration requests"
                warn={pendingApprovals > 0}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Pending Approvals</h2>
                <Link to="/department/approvals" className="text-[11px] font-semibold text-[#c8102e]">
                  View all →
                </Link>
              </div>
              {recentRequests.length === 0 ? (
                <p className="text-sm text-[var(--color-afta-subtle)]">No pending registration approvals.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                        <th className="px-3 py-2 font-semibold">Student</th>
                        <th className="px-3 py-2 font-semibold">Course</th>
                        <th className="px-3 py-2 font-semibold">Dates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRequests.map((registration) => (
                        <tr key={registration.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                          <td className="px-3 py-2">{registration.studentName}</td>
                          <td className="px-3 py-2">{registration.courseName}</td>
                          <td className="px-3 py-2">{registration.classStartDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </section>
              <PortalAnnouncementsPanel audience={PORTAL_AUDIENCES.DEPARTMENT} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

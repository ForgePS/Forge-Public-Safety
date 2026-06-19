import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatClassDates } from "../../lib/classes.js";
import { getInstructorCloseoutReport } from "../../lib/reports.js";

export default function InstructorCloseoutPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    getInstructorCloseoutReport(user.uid)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load closeout report."))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  return (
    <>
      <PageHeader title="Closeout Reports" subtitle="Class completion checklist status" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading closeout status…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">No assigned classes require closeout tracking.</p>
        ) : (
          <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Enrolled</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Skills</th>
                    <th className="px-4 py-3">Tests</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.classSession.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--color-afta-text)]">{row.classSession.courseName}</p>
                        <p className="text-xs text-[var(--color-afta-muted)]">{formatClassDates(row.classSession)}</p>
                      </td>
                      <td className="px-4 py-3">{row.enrolledCount}</td>
                      <td className="px-4 py-3">
                        {row.incompleteAttendanceDays ? `${row.incompleteAttendanceDays} days open` : "Complete"}
                      </td>
                      <td className="px-4 py-3">{row.skillsPending || "—"}</td>
                      <td className="px-4 py-3">{row.testsPending || "—"}</td>
                      <td className="px-4 py-3">{row.closeoutStatus}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Link to={`/instructor/attendance/${row.classSession.id}`} className="text-[#c8102e]">
                            Attendance
                          </Link>
                          <Link to={`/instructor/skills/${row.classSession.id}`} className="text-[#c8102e]">
                            Skills
                          </Link>
                          <Link to={`/instructor/tests/${row.classSession.id}`} className="text-[#c8102e]">
                            Tests
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

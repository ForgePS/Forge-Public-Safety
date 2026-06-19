import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { buildDepartmentHousingView } from "../../lib/housingReports.js";
import { ASSIGNMENT_STATUS_LABELS } from "../../lib/roomAssignments.js";

export default function DepartmentHousingPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.departmentId) {
      setLoading(false);
      return;
    }

    buildDepartmentHousingView(user.departmentId)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load housing status."))
      .finally(() => setLoading(false));
  }, [user?.departmentId]);

  return (
    <>
      <PageHeader
        title="Member Housing Status"
        subtitle="View whether department members have room assignments"
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {!user?.departmentId && !loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Your profile needs a linked department to view member housing.</p>
        ) : null}

        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading member housing…</p>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Bed</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No housing assignments for department members in upcoming housing classes.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={`${row.studentId}-${row.courseName}`} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3">{row.studentName}</td>
                      <td className="px-4 py-3">{row.courseName}</td>
                      <td className="px-4 py-3">{row.roomNumber}</td>
                      <td className="px-4 py-3">{row.bedAssignment}</td>
                      <td className="px-4 py-3">
                        {ASSIGNMENT_STATUS_LABELS[row.status] ?? row.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

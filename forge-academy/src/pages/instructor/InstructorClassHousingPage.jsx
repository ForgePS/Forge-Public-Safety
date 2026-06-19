import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getClassSession, isHousingRequired, formatClassDates } from "../../lib/classes.js";
import { buildClassHousingRoster } from "../../lib/housingReports.js";
import { ASSIGNMENT_STATUS_LABELS } from "../../lib/roomAssignments.js";

export default function InstructorClassHousingPage() {
  const { classId } = useParams();
  const { user } = useAuth();
  const [classSession, setClassSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const session = await getClassSession(classId);
        if (!session) throw new Error("Class not found.");
        if (!session.instructorIds.includes(user?.uid)) {
          throw new Error("You are not assigned to this class.");
        }
        if (!isHousingRequired(session)) {
          throw new Error("Housing is not enabled for this class.");
        }
        const rows = await buildClassHousingRoster(classId);
        if (!active) return;
        setClassSession(session);
        setRoster(rows);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load housing roster.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [classId, user?.uid]);

  if (loading) {
    return <div className="grid flex-1 place-items-center text-[var(--color-afta-subtle)]">Loading housing roster…</div>;
  }

  if (error) {
    return (
      <div className="p-7">
        <p className="text-sm text-red-700">{error}</p>
        <Link to="/instructor/housing" className="mt-4 inline-block text-sm text-[#c8102e]">
          Back to housing classes
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Housing Roster"
        subtitle={`${classSession.courseName} · ${formatClassDates(classSession)}`}
        actions={
          <Link
            to="/instructor/housing"
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Back
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <div className="overflow-x-auto rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Room</th>
                <th className="px-4 py-3 font-semibold">Bed</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((row) => (
                <tr key={row.studentId} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                  <td className="px-4 py-3">{row.studentName}</td>
                  <td className="px-4 py-3">{row.departmentName}</td>
                  <td className="px-4 py-3">{row.roomNumber}</td>
                  <td className="px-4 py-3">{row.bedAssignment}</td>
                  <td className="px-4 py-3">
                    {ASSIGNMENT_STATUS_LABELS[row.status] ?? row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

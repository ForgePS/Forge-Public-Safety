import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  ASSIGNMENT_STATUS_LABELS,
  getUpcomingAssignments,
  listAssignmentsByInstructorUserId,
} from "../../lib/instructorAssignments.js";
import { formatClassDates } from "../../lib/classes.js";

export default function InstructorSchedulePage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rows = await listAssignmentsByInstructorUserId(user.uid);
        if (active) setAssignments(rows);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load schedule.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const upcoming = useMemo(() => getUpcomingAssignments(assignments), [assignments]);

  return (
    <>
      <PageHeader title="My Schedule" subtitle="Assigned classes and teaching calendar" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading schedule…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">No upcoming assignments on your calendar.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((assignment) => (
              <article
                key={assignment.id}
                className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
              >
                <p className="font-mono text-[11px] font-bold text-[#c8102e]">{assignment.courseNumber}</p>
                <h2 className="mt-2 text-base font-semibold text-[var(--color-afta-text)]">{assignment.courseName}</h2>
                <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
                  {formatClassDates({ startDate: assignment.startDate, endDate: assignment.endDate })}
                </p>
                <p className="mt-2 text-sm text-[var(--color-afta-text)]">{assignment.location}</p>
                <p className="mt-3 text-xs uppercase text-[var(--color-afta-muted)]">
                  {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                </p>
                <Link
                  to={`/instructor/attendance/${assignment.classId}`}
                  className="mt-4 inline-flex rounded-[10px] bg-[#c8102e] px-3 py-2 text-xs font-bold text-white"
                >
                  Take attendance
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

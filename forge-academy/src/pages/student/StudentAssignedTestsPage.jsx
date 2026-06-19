import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { assignmentIsOpen, listVisibleAssignmentsForStudent } from "../../lib/testAssignments.js";
import { listRegistrationsByStudent, REGISTRATION_STATUSES } from "../../lib/registrations.js";
import { getStudentForUser } from "../../lib/students.js";

export default function StudentAssignedTestsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const student = await getStudentForUser(user);
        if (!student) throw new Error("No student profile is linked to your account.");
        const registrations = await listRegistrationsByStudent(student.id);
        const enrolledClassIds = registrations
          .filter((item) => item.status === REGISTRATION_STATUSES.ENROLLED)
          .map((item) => item.classId);
        const rows = await listVisibleAssignmentsForStudent(student.id, enrolledClassIds);
        if (active) setAssignments(rows.filter(assignmentIsOpen));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load assigned tests.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <>
      <PageHeader
        title="Assigned Tests"
        subtitle="Start your online exams in an isolated session"
        actions={
          <Link to="/student/test-results" className="app-btn-secondary px-4 py-2 text-xs">
            Test results
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading assigned tests…</p>
        ) : assignments.length === 0 ? (
          <p className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm px-5 py-8 text-center text-sm text-[var(--color-afta-subtle)]">
            No online test assignments are open right now.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {assignments.map((assignment) => (
              <article key={assignment.id} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
                <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">{assignment.testName}</h2>
                <p className="mt-2 text-xs text-[var(--color-afta-muted)]">
                  Open {assignment.openDate || "—"} through {assignment.closeDate || "—"}
                </p>
                <Link
                  to={`/student/tests/${assignment.id}`}
                  className="mt-4 inline-flex rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
                >
                  Start test
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

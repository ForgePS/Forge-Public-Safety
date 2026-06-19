import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { formatClassDates, getClassSession } from "../../lib/classes.js";
import { getCourse } from "../../lib/courses.js";
import {
  createEvaluatorAssignment,
  deleteEvaluatorAssignment,
  listEvaluatorAssignmentsByClass,
} from "../../lib/evaluatorAssignments.js";
import { listActiveInstructors } from "../../lib/instructors.js";
import {
  initializeClassSkillEvaluations,
  SKILL_EVALUATION_STATUS_LABELS,
  summarizeClassSkillDashboard,
} from "../../lib/skillEvaluations.js";

export default function AdminClassSkillsPage() {
  const { classId } = useParams();
  const [classSession, setClassSession] = useState(null);
  const [course, setCourse] = useState(null);
  const [dashboard, setDashboard] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [evaluatorUserId, setEvaluatorUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function reload() {
    const [session, instructorRows, assignmentRows, skillRows] = await Promise.all([
      getClassSession(classId),
      listActiveInstructors(),
      listEvaluatorAssignmentsByClass(classId),
      summarizeClassSkillDashboard(classId),
    ]);
    setClassSession(session);
    setInstructors(instructorRows);
    setAssignments(assignmentRows);
    setDashboard(skillRows);
    if (session?.courseId) {
      setCourse(await getCourse(session.courseId));
    }
  }

  useEffect(() => {
    if (!classId) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load class skills.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [classId]);

  async function handleInitialize() {
    setActing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await initializeClassSkillEvaluations(classId);
      await reload();
      setMessage(
        `Initialized ${result.created} evaluations for ${result.students} students (${result.skills} skills).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to initialize skill evaluations.");
    } finally {
      setActing(false);
    }
  }

  async function handleAssignEvaluator(event) {
    event.preventDefault();
    const instructor = instructors.find((item) => item.userId === evaluatorUserId);
    if (!instructor) return;

    setActing(true);
    setError(null);
    try {
      await createEvaluatorAssignment({
        classId,
        evaluatorUserId: instructor.userId,
        evaluatorName: `${instructor.firstName} ${instructor.lastName}`.trim(),
      });
      setEvaluatorUserId("");
      await reload();
      setMessage("Evaluator assigned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign evaluator.");
    } finally {
      setActing(false);
    }
  }

  async function handleRemoveAssignment(assignmentId) {
    setActing(true);
    try {
      await deleteEvaluatorAssignment(assignmentId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove assignment.");
    } finally {
      setActing(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Class Skills Dashboard"
        subtitle={
          classSession
            ? `${classSession.courseNumber} · ${formatClassDates(classSession)}`
            : "Skills evaluation progress"
        }
        backTo={`/admin/scheduling/${classId}/roster`}
        backLabel="Back to roster"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={acting || !course?.skillsRequired}
              onClick={handleInitialize}
              className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              Initialize skill sheets
            </button>
            <Link
              to={`/admin/scheduling/${classId}/tests`}
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Tests
            </Link>
            <Link
              to={`/admin/scheduling/${classId}/roster`}
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Roster
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
        {message ? (
          <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {message}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading…</p>
        ) : (
          <>
            {!course?.skillsRequired ? (
              <p className="text-sm text-[var(--color-afta-subtle)]">
                This course is not marked as skills-required. Enable skills on the course catalog entry first.
              </p>
            ) : null}

            <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Evaluator assignments</h2>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-afta-text)]">
                {assignments.length === 0 ? (
                  <li className="text-[var(--color-afta-subtle)]">No evaluators assigned yet.</li>
                ) : (
                  assignments.map((assignment) => (
                    <li key={assignment.id} className="flex items-center justify-between gap-3">
                      <span>{assignment.evaluatorName || assignment.evaluatorUserId}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="text-xs text-[#c8102e]"
                      >
                        Remove
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <form onSubmit={handleAssignEvaluator} className="mt-4 flex flex-wrap gap-2">
                <select
                  value={evaluatorUserId}
                  onChange={(event) => setEvaluatorUserId(event.target.value)}
                  className="rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)]"
                >
                  <option value="">Select instructor…</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.userId}>
                      {instructor.firstName} {instructor.lastName}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={acting || !evaluatorUserId}
                  className="rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-xs font-semibold text-[var(--color-afta-text)] disabled:opacity-60"
                >
                  Assign evaluator
                </button>
              </form>
            </section>

            <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
              <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Student skill progress</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Pass</th>
                      <th className="px-4 py-3">Pending</th>
                      <th className="px-4 py-3">Remediate</th>
                      <th className="px-4 py-3">Fail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                          Initialize skill sheets to begin tracking progress.
                        </td>
                      </tr>
                    ) : (
                      dashboard.map((row) => (
                        <tr key={row.studentId} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                          <td className="px-4 py-3 font-medium text-[var(--color-afta-text)]">{row.studentName}</td>
                          <td className="px-4 py-3">{row.summary.pass}</td>
                          <td className="px-4 py-3">{row.summary.pending}</td>
                          <td className="px-4 py-3">{row.summary.remediate}</td>
                          <td className="px-4 py-3">{row.summary.fail}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {dashboard.length ? (
              <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
                <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
                  <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Detailed evaluations</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Skill</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.flatMap((row) =>
                        row.evaluations.map((evaluation) => (
                          <tr key={evaluation.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                            <td className="px-4 py-3">{evaluation.studentName}</td>
                            <td className="px-4 py-3">{evaluation.skillName}</td>
                            <td className="px-4 py-3">
                              {evaluation.score}/{evaluation.maxScore}
                            </td>
                            <td className="px-4 py-3">
                              {SKILL_EVALUATION_STATUS_LABELS[evaluation.status] ?? evaluation.status}
                            </td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

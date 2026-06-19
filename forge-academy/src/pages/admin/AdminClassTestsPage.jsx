import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { formatClassDates, getClassSession } from "../../lib/classes.js";
import { getCourse } from "../../lib/courses.js";
import {
  initializeClassTestResults,
  summarizeClassTestDashboard,
  TEST_ATTEMPT_STATUS_LABELS,
} from "../../lib/testAttempts.js";

export default function AdminClassTestsPage() {
  const { classId } = useParams();
  const [classSession, setClassSession] = useState(null);
  const [course, setCourse] = useState(null);
  const [dashboard, setDashboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function reload() {
    const session = await getClassSession(classId);
    setClassSession(session);
    setDashboard(await summarizeClassTestDashboard(classId));
    if (session?.courseId) setCourse(await getCourse(session.courseId));
  }

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load class tests."))
      .finally(() => setLoading(false));
  }, [classId]);

  async function handleInitialize() {
    setActing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await initializeClassTestResults(classId);
      await reload();
      setMessage(`Initialized ${result.created} test result rows for ${result.students} students.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to initialize test results.");
    } finally {
      setActing(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Class Test Dashboard"
        subtitle={classSession ? `${classSession.courseNumber} · ${formatClassDates(classSession)}` : "Written exam results"}
        backTo={`/admin/scheduling/${classId}/roster`}
        backLabel="Back to roster"
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={acting || !course?.testRequired} onClick={handleInitialize} className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              Initialize test results
            </button>
            <Link to={`/admin/scheduling/${classId}/skills`} className="app-btn-secondary px-4 py-2 text-xs">Skills</Link>
            <Link to={`/admin/scheduling/${classId}/roster`} className="app-btn-secondary px-4 py-2 text-xs">Roster</Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">{message}</p> : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading…</p>
        ) : (
          <>
            {!course?.testRequired ? (
              <p className="text-sm text-[var(--color-afta-subtle)]">This course is not marked as test-required.</p>
            ) : null}

            <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Test</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Initialize test results to begin tracking scores.</td></tr>
                    ) : (
                      dashboard.flatMap((row) =>
                        row.results.map((result) => (
                          <tr key={result.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                            <td className="px-4 py-3">{result.studentName}</td>
                            <td className="px-4 py-3">{result.testName}</td>
                            <td className="px-4 py-3">{result.score}/{result.maxScore}</td>
                            <td className="px-4 py-3">{TEST_ATTEMPT_STATUS_LABELS[result.status] ?? result.status}</td>
                          </tr>
                        )),
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

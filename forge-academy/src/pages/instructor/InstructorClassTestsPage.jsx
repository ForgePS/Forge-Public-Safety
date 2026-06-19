import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatClassDates, getClassSession } from "../../lib/classes.js";
import { listTestsByCourse } from "../../lib/tests.js";
import {
  listTestResultsByClassStudent,
  submitTestScore,
  TEST_ATTEMPT_STATUS_LABELS,
} from "../../lib/testAttempts.js";
import { listEnrolledRegistrationsByClass } from "../../lib/registrations.js";

export default function InstructorClassTestsPage() {
  const { classId } = useParams();
  const { user } = useAuth();
  const [classSession, setClassSession] = useState(null);
  const [tests, setTests] = useState([]);
  const [roster, setRoster] = useState([]);
  const [resultsMap, setResultsMap] = useState({});
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function reload() {
    const session = await getClassSession(classId);
    setClassSession(session);
    const enrolled = await listEnrolledRegistrationsByClass(classId);
    setRoster(enrolled);
    const courseTests = session ? await listTestsByCourse(session.courseId) : [];
    setTests(courseTests);

    const map = {};
    const draftState = {};
    for (const registration of enrolled) {
      const results = await listTestResultsByClassStudent(classId, registration.studentId);
      map[registration.studentId] = results;
      for (const result of results) {
        draftState[`${registration.studentId}_${result.testId}`] = String(result.score || "");
      }
    }
    setResultsMap(map);
    setDrafts(draftState);
  }

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load test sheet."))
      .finally(() => setLoading(false));
  }, [classId]);

  async function handleSave(studentId, studentName, testId) {
    if (!user?.uid) return;
    const key = `${studentId}_${testId}`;
    setSavingKey(key);
    setError(null);
    setMessage(null);
    try {
      const outcome = await submitTestScore({
        classId,
        studentId,
        studentName,
        testId,
        score: Number(drafts[key] || 0),
        enteredByUid: user.uid,
      });
      await reload();
      setMessage(outcome.passed ? "Score saved — pass." : "Score saved — fail.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save score.");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <>
      <PageHeader
        title="Exam Score Entry"
        subtitle={classSession ? `${classSession.courseNumber} · ${formatClassDates(classSession)}` : "Written test scores"}
        actions={<Link to="/instructor/tests" className="app-btn-secondary px-4 py-2 text-xs">Back to tests</Link>}
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">{message}</p> : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading…</p>
        ) : tests.length === 0 ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">No active tests configured for this course. Ask academy admin to create a test definition.</p>
        ) : (
          <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.flatMap((registration) =>
                    tests.map((test) => {
                      const key = `${registration.studentId}_${test.id}`;
                      const result = (resultsMap[registration.studentId] ?? []).find((item) => item.testId === test.id);
                      return (
                        <tr key={key} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                          <td className="px-4 py-3">{registration.studentName}</td>
                          <td className="px-4 py-3">{test.name}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max={test.maxScore}
                              value={drafts[key] ?? ""}
                              onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="w-24 rounded-[8px] border border-[var(--color-afta-border)] bg-white px-2 py-1 text-[var(--color-afta-text)]"
                            />
                            <span className="ml-2 text-xs text-[var(--color-afta-muted)]">/ {test.maxScore}</span>
                          </td>
                          <td className="px-4 py-3">{result ? TEST_ATTEMPT_STATUS_LABELS[result.status] ?? result.status : "Pending"}</td>
                          <td className="px-4 py-3">
                            <button type="button" disabled={savingKey === key} onClick={() => handleSave(registration.studentId, registration.studentName, test.id)} className="text-xs text-[#c8102e]">
                              Save
                            </button>
                          </td>
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

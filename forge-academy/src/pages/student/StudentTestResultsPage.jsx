import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getStudentForUser } from "../../lib/students.js";
import { listTestResultsByStudent, PASS_FAIL_LABELS } from "../../lib/testGrading.js";

export default function StudentTestResultsPage() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const student = await getStudentForUser(user);
        if (!student) {
          if (active) setResults([]);
          return;
        }
        const rows = await listTestResultsByStudent(student.id);
        if (active) setResults(rows);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load test results.");
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
      <PageHeader title="Test Results" subtitle="Written examination history" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Attempt</th>
                  <th className="px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr>
                ) : results.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No test results on file yet.</td></tr>
                ) : (
                  results.map((result) => (
                    <tr key={result.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3 text-[var(--color-afta-text)]">{result.testName}</td>
                      <td className="px-4 py-3">{result.percentage}%</td>
                      <td className="px-4 py-3">#{result.attemptNumber}</td>
                      <td className="px-4 py-3">{PASS_FAIL_LABELS[result.passFail] ?? result.passFail}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

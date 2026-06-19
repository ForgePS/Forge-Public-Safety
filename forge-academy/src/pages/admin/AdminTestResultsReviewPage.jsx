import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField } from "../../components/StudentFormFields.jsx";
import { listAllTestResults, overrideTestScore, PASS_FAIL_LABELS } from "../../lib/testGrading.js";

export default function AdminTestResultsReviewPage() {
  const [rows, setRows] = useState([]);
  const [overrideForm, setOverrideForm] = useState({ testResultId: "", newScore: "", reason: "", name: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    listAllTestResults().then(setRows).catch((err) => setError(err instanceof Error ? err.message : "Unable to load results.")).finally(() => setLoading(false));
  }, []);

  async function handleOverride(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await overrideTestScore(overrideForm.testResultId, Number(overrideForm.newScore), overrideForm.reason, overrideForm.name);
      setMessage("Score override recorded.");
      setRows(await listAllTestResults());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to override score.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Test Results Review" subtitle="Review scores and override with documented reason" actions={<Link to="/admin/testing/results-hub" className="app-btn-secondary px-4 py-2 text-xs">Results hub</Link>} />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">{message}</p> : null}
        <form onSubmit={handleOverride} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Score override</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormField label="Test result ID" name="testResultId" value={overrideForm.testResultId} onChange={(e) => setOverrideForm((p) => ({ ...p, testResultId: e.target.value }))} required />
            <FormField label="New score (%)" name="newScore" value={overrideForm.newScore} onChange={(e) => setOverrideForm((p) => ({ ...p, newScore: e.target.value }))} required />
            <FormField label="Admin name" name="name" value={overrideForm.name} onChange={(e) => setOverrideForm((p) => ({ ...p, name: e.target.value }))} />
            <FormField label="Reason" name="reason" value={overrideForm.reason} onChange={(e) => setOverrideForm((p) => ({ ...p, reason: e.target.value }))} required />
          </div>
          <button type="submit" disabled={saving} className="mt-4 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">Apply override</button>
        </form>
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Student</th><th className="px-4 py-3">Test</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Result ID</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 text-[var(--color-afta-text)]">{row.studentName || row.studentId}</td>
                    <td className="px-4 py-3">{row.testName}</td>
                    <td className="px-4 py-3">{row.score}%</td>
                    <td className="px-4 py-3">{PASS_FAIL_LABELS[row.passFail] ?? row.passFail}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

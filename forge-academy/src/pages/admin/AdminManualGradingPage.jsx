import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ForgeBuilderPanel from "../../components/aiBuilder/ForgeBuilderPanel.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField } from "../../components/StudentFormFields.jsx";
import { useAiBuilderEnabled } from "../../lib/aiBuilder/useAiBuilderEnabled.js";
import { gradeManualQueueItem, listManualGradingQueue } from "../../lib/testGrading.js";

export default function AdminManualGradingPage() {
  const [rows, setRows] = useState([]);
  const [grades, setGrades] = useState({});
  const [graderNotes, setGraderNotes] = useState({});
  const [rubric, setRubric] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState(null);
  const aiBuilderEnabled = useAiBuilderEnabled();

  async function reload() {
    setRows(await listManualGradingQueue("pending"));
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Unable to load queue.")).finally(() => setLoading(false));
  }, []);

  async function handleGrade(row) {
    setSaving(row.id);
    setError(null);
    try {
      await gradeManualQueueItem(row.id, Number(grades[row.id] ?? 0), graderNotes[row.id] ?? "");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save grade.");
    } finally {
      setSaving("");
    }
  }

  return (
    <>
      <PageHeader title="Manual Grading Queue" subtitle="Short-answer and scenario responses awaiting review" actions={<Link to="/admin/testing/results-hub" className="app-btn-secondary px-4 py-2 text-xs">Results hub</Link>} />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        {aiBuilderEnabled ? (
          <section className="rounded-[14px] border border-violet-200 bg-violet-50/30 p-5">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Grading rubric (optional)</h2>
            <p className="mt-1 text-xs text-[var(--color-afta-subtle)]">Generate scoring criteria for short-answer items.</p>
            <div className="mt-4">
              <ForgeBuilderPanel
                defaultOpen
                targetType="gradingRubric"
                currentState={rubric ?? {}}
                onApply={(output) => setRubric(output)}
              />
            </div>
            {rubric?.criteria?.length ? (
              <ul className="mt-3 list-inside list-disc text-xs text-[var(--color-afta-muted)]">
                {rubric.criteria.map((c) => (
                  <li key={String(c.id)}>{String(c.label)} — {String(c.maxPoints)} pts</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Student</th><th className="px-4 py-3">Response</th><th className="px-4 py-3">Max pts</th><th className="px-4 py-3">Award</th><th className="px-4 py-3">AI assist</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No pending manual grading items.</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 text-[var(--color-afta-text)]">{row.studentId}</td>
                    <td className="px-4 py-3 max-w-md">{row.responseText || "—"}</td>
                    <td className="px-4 py-3">{row.maxPoints}</td>
                    <td className="px-4 py-3"><FormField label="" name={`points-${row.id}`} value={grades[row.id] ?? ""} onChange={(e) => setGrades((p) => ({ ...p, [row.id]: e.target.value }))} /></td>
                    <td className="px-4 py-3">
                      {aiBuilderEnabled ? (
                        <ForgeBuilderPanel
                          targetType="gradingAssist"
                          targetId={row.id}
                          currentState={{ pointsAwarded: grades[row.id] ?? "", graderNotes: graderNotes[row.id] ?? "" }}
                          context={{
                            responseText: row.responseText,
                            maxPoints: row.maxPoints,
                            rubric,
                            questionText: row.questionText,
                          }}
                          className="!p-2"
                          onApply={(output) => {
                            setGrades((prev) => ({ ...prev, [row.id]: String(output.pointsAwarded ?? "") }));
                            setGraderNotes((prev) => ({ ...prev, [row.id]: String(output.graderNotes ?? "") }));
                          }}
                        />
                      ) : (
                        <span className="text-xs text-[var(--color-afta-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><button type="button" disabled={saving === row.id} onClick={() => handleGrade(row)} className="text-xs text-[#c8102e]">{saving === row.id ? "Saving…" : "Save grade"}</button></td>
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

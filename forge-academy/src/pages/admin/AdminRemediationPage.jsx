import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { completeRemediation, listRemediationAssignments } from "../../lib/testGrading.js";

export default function AdminRemediationPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function reload() {
    setRows(await listRemediationAssignments());
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Unable to load remediation.")).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Remediation Assignments" subtitle="Track post-failure remediation through retest authorization" actions={<Link to="/admin/testing/results-hub" className="app-btn-secondary px-4 py-2 text-xs">Results hub</Link>} />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Student</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Notes</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No remediation assignments.</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 text-[var(--color-afta-text)]">{row.studentId}</td>
                    <td className="px-4 py-3">{row.remediationType}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">{row.notes || "—"}</td>
                    <td className="px-4 py-3">{row.status !== "completed" ? <button type="button" onClick={() => completeRemediation(row.id).then(reload)} className="text-xs text-[#c8102e]">Mark complete</button> : "Done"}</td>
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

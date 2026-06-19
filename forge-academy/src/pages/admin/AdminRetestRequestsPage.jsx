import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { listRetestRequests, reviewRetestRequest } from "../../lib/testGrading.js";

export default function AdminRetestRequestsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function reload() {
    setRows(await listRetestRequests("requested"));
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Unable to load retest requests.")).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Retest Requests" subtitle="Approve, deny, or schedule retests" actions={<Link to="/admin/testing/results-hub" className="app-btn-secondary px-4 py-2 text-xs">Results hub</Link>} />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Student</th><th className="px-4 py-3">Test</th><th className="px-4 py-3">Attempt #</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No pending retest requests.</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 text-[var(--color-afta-text)]">{row.studentId}</td>
                    <td className="px-4 py-3">{row.testId}</td>
                    <td className="px-4 py-3">{row.attemptNumber}</td>
                    <td className="px-4 py-3">{row.reason || "—"}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button type="button" onClick={() => reviewRetestRequest(row.id, "approved").then(reload)} className="text-xs text-green-400">Approve</button>
                      <button type="button" onClick={() => reviewRetestRequest(row.id, "denied").then(reload)} className="text-xs text-[#c8102e]">Deny</button>
                    </td>
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

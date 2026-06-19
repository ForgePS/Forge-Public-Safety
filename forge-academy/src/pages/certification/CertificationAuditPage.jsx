import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import { listCertificationAuditLog } from "../../lib/studentCertifications.js";

export default function CertificationAuditPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listCertificationAuditLog()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load audit trail."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Audit Trail" subtitle="Certification lifecycle actions" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No audit entries yet.</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3">{row.studentName || "—"}</td>
                      <td className="px-4 py-3">{row.action}</td>
                      <td className="px-4 py-3">{row.priorStatus || "—"}</td>
                      <td className="px-4 py-3">{row.newStatus || "—"}</td>
                      <td className="px-4 py-3">{row.notes || "—"}</td>
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

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { listModuleDefinitions } from "../../lib/moduleDefinitions.js";

const KIND_LABELS = {
  checkoff: "Equipment checkoff",
  inventory: "Inventory",
  inspection: "Inspection",
  custom: "Custom form",
};

export default function AdminModuleDefinitionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listModuleDefinitions()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load modules."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="RMS Module Definitions"
        subtitle="Data-driven checkoffs, inventory, inspections, and custom forms (RMS rollout)"
        actions={
          <Link to="/admin/module-definitions/new" className="app-btn-primary px-4 py-2 text-xs">
            New module
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Kind</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No module definitions yet.</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-afta-border)]">
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3">{KIND_LABELS[row.kind] ?? row.kind}</td>
                      <td className="px-4 py-3 capitalize">{row.status ?? "draft"}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/module-definitions/${row.id}`} className="text-xs text-[#c8102e]">Edit</Link>
                        {" · "}
                        <Link to={`/admin/module-definitions/${row.id}/submit`} className="text-xs text-[#c8102e]">Submit</Link>
                      </td>
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

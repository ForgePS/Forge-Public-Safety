import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { AUDIT_ACTION_LABELS, exportTestingAuditLogsCsv, listTestingAuditLogs } from "../../lib/auditLogs.js";

export default function AdminTestingAuditPage() {
  const [rows, setRows] = useState([]);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    listTestingAuditLogs({
      maxRows: 300,
      actionFilter: actionFilter || undefined,
      entityTypeFilter: entityFilter || undefined,
    })
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load audit logs."))
      .finally(() => setLoading(false));
  }, [actionFilter, entityFilter]);

  const actionOptions = useMemo(
    () => Object.entries(AUDIT_ACTION_LABELS).sort((a, b) => a[1].localeCompare(b[1])),
    [],
  );

  return (
    <>
      <PageHeader
        title="Testing Audit Log"
        subtitle="Immutable history of grading, releases, retests, and challenge decisions"
        actions={
          <>
            <button
              type="button"
              disabled={exporting || loading}
              onClick={async () => {
                setExporting(true);
                setError(null);
                try {
                  await exportTestingAuditLogsCsv({
                    maxRows: 1000,
                    actionFilter: actionFilter || undefined,
                    entityTypeFilter: entityFilter || undefined,
                  });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Unable to export audit log.");
                } finally {
                  setExporting(false);
                }
              }}
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
            <Link to="/admin/testing/results-hub" className="app-btn-secondary px-4 py-2 text-xs">
              Results hub
            </Link>
          </>
        }
      />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="app-error">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="app-input w-auto py-2 text-xs"
          >
            <option value="">All actions</option>
            {actionOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value)}
            placeholder="Filter by entity type…"
            className="app-input w-full max-w-xs py-2 text-xs"
          />
        </div>

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-4 py-3">User</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No audit entries match your filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3 text-xs text-[var(--color-afta-muted)]">
                        {row.createdAt?.toDate
                          ? row.createdAt.toDate().toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{AUDIT_ACTION_LABELS[row.action] ?? row.action}</td>
                      <td className="px-4 py-3">{row.entityType || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.entityId || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.userId || "system"}</td>
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

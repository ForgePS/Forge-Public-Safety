import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { listMaintenanceModules, MODULE_STATUS_LABELS, MODULE_KIND_LABELS } from "../lib/maintenanceModules.js";

export default function TemplatesListPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => { listMaintenanceModules().then(setRows); }, []);

  return (
    <>
      <PageHeader
        title="Maintenance Templates"
        subtitle="Fully editable checkoff, inspection, and inventory forms"
        actions={<Link to="/templates/new" className="app-btn-primary inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New Template</Link>}
      />
      <div className="flex-1 overflow-y-auto p-6 lg:p-7">
        <div className="app-panel overflow-x-auto">
          <table className="app-table">
            <thead><tr><th>Name</th><th>Kind</th><th>Subject</th><th>Sections</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-[11px] text-[var(--color-fleet-muted)]">{m.description}</p>
                  </td>
                  <td>{MODULE_KIND_LABELS[m.kind] ?? m.kind}</td>
                  <td className="capitalize">{m.subjectType}</td>
                  <td>{m.sections?.length ?? 0} sections</td>
                  <td><StatusBadge status={m.status} label={MODULE_STATUS_LABELS[m.status]} /></td>
                  <td className="space-x-2">
                    <Link to={`/templates/${m.id}`} className="text-xs font-semibold text-[var(--color-fleet-red)] hover:underline">Edit</Link>
                    <Link to={`/templates/${m.id}/perform`} className="text-xs font-semibold text-[var(--color-fleet-muted)] hover:underline">Perform</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

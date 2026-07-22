import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { listApparatus, APPARATUS_STATUS_LABELS, APPARATUS_TYPE_LABELS } from "../lib/apparatus.js";

export default function ApparatusListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    listApparatus().then((data) => { setRows(data); setLoading(false); });
  }, []);

  const filtered = rows.filter((a) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return a.unitNumber.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.stationName.toLowerCase().includes(q);
  });

  return (
    <>
      <PageHeader
        title="Apparatus"
        subtitle="Fleet apparatus registry"
        actions={
          <Link to="/apparatus/new" className="app-btn-primary inline-flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Apparatus
          </Link>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 lg:p-7">
        <div className="mb-4">
          <input className="app-input max-w-sm" placeholder="Search apparatus…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        {loading ? <p className="text-sm text-[var(--color-fleet-muted)]">Loading…</p> : (
          <div className="app-panel overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Unit #</th><th>Name</th><th>Type</th><th>Station</th><th>Status</th><th>Mileage</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="font-semibold">{a.unitNumber}</td>
                    <td>{a.name}</td>
                    <td>{APPARATUS_TYPE_LABELS[a.type] ?? a.type}</td>
                    <td>{a.stationName}</td>
                    <td><StatusBadge status={a.status} label={APPARATUS_STATUS_LABELS[a.status]} /></td>
                    <td>{a.mileage.toLocaleString()}</td>
                    <td><Link to={`/apparatus/${a.id}`} className="text-xs font-semibold text-[var(--color-fleet-red)] hover:underline">Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

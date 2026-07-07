import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { listEquipment, EQUIPMENT_STATUS_LABELS, EQUIPMENT_CATEGORY_LABELS } from "../lib/equipment.js";

export default function EquipmentListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEquipment().then((data) => { setRows(data); setLoading(false); });
  }, []);

  return (
    <>
      <PageHeader title="Equipment" subtitle="Tools, PPE, and inventory" actions={<Link to="/equipment/new" className="app-btn-primary inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Equipment</Link>} />
      <div className="flex-1 overflow-y-auto p-6 lg:p-7">
        {loading ? <p className="text-sm text-[var(--color-fleet-muted)]">Loading…</p> : (
          <div className="app-panel overflow-x-auto">
            <table className="app-table">
              <thead><tr><th>Name</th><th>SKU</th><th>Category</th><th>Location</th><th>Qty / Par</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className="font-semibold">{e.name}</td>
                    <td>{e.sku}</td>
                    <td>{EQUIPMENT_CATEGORY_LABELS[e.category] ?? e.category}</td>
                    <td>{e.location || e.apparatusName || e.stationName}</td>
                    <td>{e.quantity} / {e.parLevel}</td>
                    <td><StatusBadge status={e.status} label={EQUIPMENT_STATUS_LABELS[e.status]} /></td>
                    <td><Link to={`/equipment/${e.id}`} className="text-xs font-semibold text-[var(--color-fleet-red)] hover:underline">Edit</Link></td>
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

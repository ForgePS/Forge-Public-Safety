import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { listWorkOrders, WORK_ORDER_STATUS_LABELS, WORK_ORDER_PRIORITY_LABELS } from "../lib/workOrders.js";

export default function WorkOrdersListPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => { listWorkOrders().then(setRows); }, []);

  const filtered = filter === "all" ? rows : rows.filter((w) => w.status === filter);

  return (
    <>
      <PageHeader title="Work Orders" subtitle="Corrective and preventive maintenance tasks" actions={<Link to="/work-orders/new" className="app-btn-primary inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New Work Order</Link>} />
      <div className="flex-1 overflow-y-auto p-6 lg:p-7">
        <div className="mb-4 flex gap-2">
          {["all", "open", "in_progress", "completed"].map((f) => (
            <button key={f} type="button" className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === f ? "bg-[var(--color-fleet-red)] text-white" : "bg-white border border-[var(--color-fleet-border)] text-[var(--color-fleet-muted)]"}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : WORK_ORDER_STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="app-panel overflow-x-auto">
          <table className="app-table">
            <thead><tr><th>WO #</th><th>Title</th><th>Apparatus</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Due</th><th></th></tr></thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id}>
                  <td className="font-mono text-xs font-semibold">{w.workOrderNumber}</td>
                  <td>{w.title}</td>
                  <td>{w.apparatusName}</td>
                  <td><StatusBadge status={w.priority} label={WORK_ORDER_PRIORITY_LABELS[w.priority]} /></td>
                  <td><StatusBadge status={w.status} label={WORK_ORDER_STATUS_LABELS[w.status]} /></td>
                  <td>{w.assignedToName || "—"}</td>
                  <td>{w.dueDate}</td>
                  <td><Link to={`/work-orders/${w.id}`} className="text-xs font-semibold text-[var(--color-fleet-red)] hover:underline">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

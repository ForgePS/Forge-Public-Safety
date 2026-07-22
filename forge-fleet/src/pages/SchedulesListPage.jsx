import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { listMaintenanceSchedules, getScheduleDueStatus, SCHEDULE_FREQUENCY_LABELS, SCHEDULE_STATUS_LABELS } from "../lib/maintenanceSchedules.js";

export default function SchedulesListPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => { listMaintenanceSchedules().then(setRows); }, []);

  return (
    <>
      <PageHeader title="Maintenance Schedules" subtitle="Recurring maintenance assignments" actions={<Link to="/schedules/new" className="app-btn-primary inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New Schedule</Link>} />
      <div className="flex-1 overflow-y-auto p-6 lg:p-7">
        <div className="app-panel overflow-x-auto">
          <table className="app-table">
            <thead><tr><th>Schedule</th><th>Template</th><th>Apparatus</th><th>Frequency</th><th>Next Due</th><th>Due Status</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((s) => {
                const dueStatus = getScheduleDueStatus(s);
                return (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.name}</td>
                    <td>{s.moduleName}</td>
                    <td>{s.apparatusName}</td>
                    <td>{SCHEDULE_FREQUENCY_LABELS[s.frequency]}</td>
                    <td>{s.nextDueDate}</td>
                    <td><StatusBadge status={dueStatus} /></td>
                    <td><StatusBadge status={s.status} label={SCHEDULE_STATUS_LABELS[s.status]} /></td>
                    <td><Link to={`/schedules/${s.id}`} className="text-xs font-semibold text-[var(--color-fleet-red)] hover:underline">Edit</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

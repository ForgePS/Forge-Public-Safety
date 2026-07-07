import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { listMaintenanceRecords, RECORD_STATUS_LABELS } from "../lib/maintenanceRecords.js";

export default function RecordsListPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => { listMaintenanceRecords().then(setRows); }, []);

  return (
    <>
      <PageHeader title="Maintenance Records" subtitle="Completed checkoffs, inspections, and submissions" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-7">
        <div className="app-panel overflow-x-auto">
          <table className="app-table">
            <thead><tr><th>Date</th><th>Template</th><th>Apparatus / Equipment</th><th>Performed By</th><th>Passed</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.performedDate}</td>
                  <td className="font-semibold">{r.moduleName}</td>
                  <td>{r.apparatusName || r.equipmentName}</td>
                  <td>{r.performedByName}</td>
                  <td>{r.passed ? <span className="text-green-700 font-semibold">✓ Pass</span> : <span className="text-red-600 font-semibold">✗ Fail</span>}</td>
                  <td><StatusBadge status={r.status} label={RECORD_STATUS_LABELS[r.status]} /></td>
                  <td><Link to={`/records/${r.id}`} className="text-xs font-semibold text-[var(--color-fleet-red)] hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

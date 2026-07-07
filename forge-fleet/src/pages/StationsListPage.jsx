import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { listStations, STATION_STATUS_LABELS } from "../lib/stations.js";

export default function StationsListPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => { listStations().then(setRows); }, []);

  return (
    <>
      <PageHeader title="Stations" subtitle="Fire stations and facilities" actions={<Link to="/stations/new" className="app-btn-primary inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Station</Link>} />
      <div className="flex-1 overflow-y-auto p-6 lg:p-7">
        <div className="app-panel overflow-x-auto">
          <table className="app-table">
            <thead><tr><th>Name</th><th>Department</th><th>Address</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold">{s.name}</td>
                  <td>{s.departmentName}</td>
                  <td>{s.address}</td>
                  <td><StatusBadge status={s.status} label={STATION_STATUS_LABELS[s.status]} /></td>
                  <td><Link to={`/stations/${s.id}`} className="text-xs font-semibold text-[var(--color-fleet-red)] hover:underline">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { listDepartments, DEPARTMENT_STATUS_LABELS } from "../lib/departments.js";

export default function DepartmentsListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDepartments().then((data) => { setRows(data); setLoading(false); });
  }, []);

  return (
    <>
      <PageHeader title="Departments" subtitle="Fire departments and organizations" actions={<Link to="/departments/new" className="app-btn-primary inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Department</Link>} />
      <div className="flex-1 overflow-y-auto p-6 lg:p-7">
        <div className="app-panel overflow-x-auto">
          <table className="app-table">
            <thead><tr><th>Name</th><th>FDID</th><th>RMS ID</th><th>Status</th><th>Phone</th><th></th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td className="font-semibold">{d.name}</td>
                  <td>{d.fdid}</td>
                  <td className="font-mono text-xs">{d.rmsDepartmentId}</td>
                  <td><StatusBadge status={d.status} label={DEPARTMENT_STATUS_LABELS[d.status]} /></td>
                  <td>{d.phone}</td>
                  <td><Link to={`/departments/${d.id}`} className="text-xs font-semibold text-[var(--color-fleet-red)] hover:underline">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

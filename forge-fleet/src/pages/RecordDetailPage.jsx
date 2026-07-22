import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ModuleFormRenderer from "../components/ModuleFormRenderer.jsx";
import { getMaintenanceRecord, approveMaintenanceRecord, RECORD_STATUS_LABELS } from "../lib/maintenanceRecords.js";
import { getMaintenanceModule, toModuleDefinition } from "../lib/maintenanceModules.js";
import { useParams } from "react-router-dom";

export default function RecordDetailPage() {
  const { recordId } = useParams();
  const [record, setRecord] = useState(null);
  const [definition, setDefinition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMaintenanceRecord(recordId).then(async (r) => {
      if (!r) { setLoading(false); return; }
      setRecord(r);
      const mod = await getMaintenanceModule(r.moduleId);
      if (mod) setDefinition(toModuleDefinition(mod));
      setLoading(false);
    });
  }, [recordId]);

  async function handleApprove() {
    await approveMaintenanceRecord(recordId);
    setRecord((prev) => prev ? { ...prev, status: "approved" } : prev);
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!record) return <div className="p-6 text-red-600">Record not found.</div>;

  return (
    <>
      <PageHeader title={record.moduleName} subtitle={`Performed ${record.performedDate} by ${record.performedByName}`} backTo="/records" actions={record.status === "submitted" ? <button type="button" className="app-btn-primary" onClick={handleApprove}>Approve</button> : null} />
      <div className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-6">
        <div className="app-panel grid gap-4 p-5 sm:grid-cols-4">
          <div><p className="app-label">Apparatus</p><p className="text-sm font-semibold">{record.apparatusName || "—"}</p></div>
          <div><p className="app-label">Mileage</p><p className="text-sm font-semibold">{record.mileageAtService?.toLocaleString()}</p></div>
          <div><p className="app-label">Result</p><p className="text-sm font-semibold">{record.passed ? "Pass" : "Fail"}</p></div>
          <div><p className="app-label">Status</p><StatusBadge status={record.status} label={RECORD_STATUS_LABELS[record.status]} /></div>
        </div>
        {definition ? (
          <div className="app-panel p-5">
            <h2 className="mb-4 text-sm font-semibold">Submitted Values</h2>
            <ModuleFormRenderer definition={definition} values={record.values} readOnly />
          </div>
        ) : null}
        {record.notes ? <div className="app-panel p-5"><p className="app-label">Notes</p><p className="text-sm">{record.notes}</p></div> : null}
        <Link to="/records" className="app-btn-secondary inline-block">Back to Records</Link>
      </div>
    </>
  );
}

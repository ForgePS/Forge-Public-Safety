import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../components/FormFields.jsx";
import {
  WORK_ORDER_TYPES, WORK_ORDER_TYPE_LABELS, WORK_ORDER_PRIORITIES, WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUSES, WORK_ORDER_STATUS_LABELS,
  createWorkOrder, getWorkOrder, updateWorkOrder, completeWorkOrder,
} from "../lib/workOrders.js";
import { listApparatus } from "../lib/apparatus.js";
import { writeAuditEntry, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../lib/maintenanceAuditLog.js";
import { useAuth } from "../context/AuthContext.jsx";

const emptyForm = {
  title: "", description: "", type: WORK_ORDER_TYPES.CORRECTIVE, priority: WORK_ORDER_PRIORITIES.NORMAL,
  status: WORK_ORDER_STATUSES.OPEN, apparatusId: "", apparatusName: "", equipmentId: "", equipmentName: "",
  assignedTo: "", assignedToName: "", reportedByName: "", rmsPersonId: "",
  dueDate: "", estimatedCost: "0", actualCost: "0", vendor: "", notes: "",
};

export default function WorkOrderFormPage() {
  const { workOrderId } = useParams();
  const isNew = !workOrderId || workOrderId === "new";
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [workOrderNumber, setWorkOrderNumber] = useState("");
  const [apparatus, setApparatus] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { listApparatus().then(setApparatus); }, []);

  useEffect(() => {
    if (isNew) {
      setForm((prev) => ({ ...prev, reportedByName: user?.displayName ?? "" }));
      return;
    }
    getWorkOrder(workOrderId).then((w) => {
      if (!w) { setError("Not found."); setLoading(false); return; }
      setWorkOrderNumber(w.workOrderNumber);
      setForm({
        title: w.title, description: w.description, type: w.type, priority: w.priority, status: w.status,
        apparatusId: w.apparatusId, apparatusName: w.apparatusName, equipmentId: w.equipmentId, equipmentName: w.equipmentName,
        assignedTo: w.assignedTo, assignedToName: w.assignedToName, reportedByName: w.reportedByName, rmsPersonId: w.rmsPersonId,
        dueDate: w.dueDate, estimatedCost: String(w.estimatedCost), actualCost: String(w.actualCost), vendor: w.vendor, notes: w.notes,
      });
      setLoading(false);
    });
  }, [isNew, workOrderId, user]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "apparatusId") next.apparatusName = apparatus.find((a) => a.id === value)?.name ?? "";
      return next;
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, estimatedCost: Number(form.estimatedCost), actualCost: Number(form.actualCost), reportedBy: user?.uid ?? "" };
      if (isNew) {
        const id = await createWorkOrder(payload);
        await writeAuditEntry({ action: AUDIT_ACTIONS.CREATED, entityType: AUDIT_ENTITY_TYPES.WORK_ORDER, entityId: id, entityLabel: form.title, actorName: user?.displayName, actorUid: user?.uid });
        navigate(`/work-orders/${id}`);
      } else {
        await updateWorkOrder(workOrderId, payload);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed."); }
    finally { setSaving(false); }
  }

  async function handleComplete() {
    await completeWorkOrder(workOrderId);
    setForm((prev) => ({ ...prev, status: WORK_ORDER_STATUSES.COMPLETED }));
    await writeAuditEntry({ action: AUDIT_ACTIONS.COMPLETED, entityType: AUDIT_ENTITY_TYPES.WORK_ORDER, entityId: workOrderId, entityLabel: form.title, actorName: user?.displayName, actorUid: user?.uid });
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <>
      <PageHeader title={isNew ? "New Work Order" : workOrderNumber} backTo="/work-orders" actions={!isNew && form.status !== WORK_ORDER_STATUSES.COMPLETED ? <button type="button" className="app-btn-primary" onClick={handleComplete}>Mark Complete</button> : null} />
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-6">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <FormSection title="Work Order">
          <FormField label="Title" name="title" value={form.title} onChange={handleChange} required />
          <FormSelect label="Type" name="type" value={form.type} onChange={handleChange} options={Object.entries(WORK_ORDER_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <FormSelect label="Priority" name="priority" value={form.priority} onChange={handleChange} options={Object.entries(WORK_ORDER_PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <FormSelect label="Status" name="status" value={form.status} onChange={handleChange} options={Object.entries(WORK_ORDER_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <FormSelect label="Apparatus" name="apparatusId" value={form.apparatusId} onChange={handleChange} options={[{ value: "", label: "— None —" }, ...apparatus.map((a) => ({ value: a.id, label: `${a.unitNumber} — ${a.name}` }))]} />
          <FormField label="Due Date" name="dueDate" type="date" value={form.dueDate} onChange={handleChange} />
          <div className="sm:col-span-2"><FormTextarea label="Description" name="description" value={form.description} onChange={handleChange} /></div>
        </FormSection>
        <FormSection title="Assignment & Cost">
          <FormField label="Assigned To" name="assignedToName" value={form.assignedToName} onChange={handleChange} />
          <FormField label="RMS Person ID" name="rmsPersonId" value={form.rmsPersonId} onChange={handleChange} hint="For RMS integration" />
          <FormField label="Vendor" name="vendor" value={form.vendor} onChange={handleChange} />
          <FormField label="Estimated Cost" name="estimatedCost" type="number" value={form.estimatedCost} onChange={handleChange} />
          <FormField label="Actual Cost" name="actualCost" type="number" value={form.actualCost} onChange={handleChange} />
          <div className="sm:col-span-2"><FormTextarea label="Notes" name="notes" value={form.notes} onChange={handleChange} /></div>
        </FormSection>
        <div className="flex gap-3">
          <button type="submit" className="app-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <Link to="/work-orders" className="app-btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  );
}

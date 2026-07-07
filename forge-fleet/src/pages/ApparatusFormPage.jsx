import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../components/FormFields.jsx";
import {
  APPARATUS_STATUSES, APPARATUS_STATUS_LABELS, APPARATUS_TYPES, APPARATUS_TYPE_LABELS,
  createApparatus, getApparatus, updateApparatus, deleteApparatus,
} from "../lib/apparatus.js";
import { listDepartments } from "../lib/departments.js";
import { listStations } from "../lib/stations.js";
import { writeAuditEntry, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../lib/maintenanceAuditLog.js";
import { useAuth } from "../context/AuthContext.jsx";

const emptyForm = {
  unitNumber: "", name: "", type: APPARATUS_TYPES.ENGINE, status: APPARATUS_STATUSES.IN_SERVICE,
  departmentId: "", departmentName: "", stationId: "", stationName: "",
  rmsApparatusId: "", vin: "", year: "", make: "", model: "",
  mileage: "0", pumpHours: "0", licensePlate: "", notes: "",
};

export default function ApparatusFormPage() {
  const { apparatusId } = useParams();
  const isNew = !apparatusId || apparatusId === "new";
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [departments, setDepartments] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listDepartments(), listStations()]).then(([d, s]) => { setDepartments(d); setStations(s); });
  }, []);

  useEffect(() => {
    if (isNew) return;
    getApparatus(apparatusId).then((a) => {
      if (!a) { setError("Apparatus not found."); setLoading(false); return; }
      setForm({
        unitNumber: a.unitNumber, name: a.name, type: a.type, status: a.status,
        departmentId: a.departmentId, departmentName: a.departmentName,
        stationId: a.stationId, stationName: a.stationName,
        rmsApparatusId: a.rmsApparatusId, vin: a.vin, year: a.year, make: a.make, model: a.model,
        mileage: String(a.mileage), pumpHours: String(a.pumpHours),
        licensePlate: a.licensePlate, notes: a.notes,
      });
      setLoading(false);
    });
  }, [isNew, apparatusId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "departmentId") {
        const dept = departments.find((d) => d.id === value);
        next.departmentName = dept?.name ?? "";
      }
      if (name === "stationId") {
        const station = stations.find((s) => s.id === value);
        next.stationName = station?.name ?? "";
      }
      return next;
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = { ...form, mileage: Number(form.mileage), pumpHours: Number(form.pumpHours) };
    try {
      if (isNew) {
        const id = await createApparatus(payload);
        await writeAuditEntry({ action: AUDIT_ACTIONS.CREATED, entityType: AUDIT_ENTITY_TYPES.APPARATUS, entityId: id, entityLabel: form.unitNumber, actorName: user?.displayName, actorUid: user?.uid });
        navigate(`/apparatus/${id}`);
      } else {
        await updateApparatus(apparatusId, payload);
        await writeAuditEntry({ action: AUDIT_ACTIONS.UPDATED, entityType: AUDIT_ENTITY_TYPES.APPARATUS, entityId: apparatusId, entityLabel: form.unitNumber, actorName: user?.displayName, actorUid: user?.uid });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this apparatus?")) return;
    await deleteApparatus(apparatusId);
    navigate("/apparatus");
  }

  if (loading) return <div className="p-6 text-sm text-[var(--color-fleet-muted)]">Loading…</div>;

  const filteredStations = stations.filter((s) => !form.departmentId || s.departmentId === form.departmentId);

  return (
    <>
      <PageHeader
        title={isNew ? "New Apparatus" : `Edit ${form.unitNumber}`}
        backTo="/apparatus"
        actions={!isNew ? <button type="button" className="app-btn-danger" onClick={handleDelete}>Delete</button> : null}
      />
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-6">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <FormSection title="Identification">
          <FormField label="Unit Number" name="unitNumber" value={form.unitNumber} onChange={handleChange} required />
          <FormField label="Name" name="name" value={form.name} onChange={handleChange} />
          <FormSelect label="Type" name="type" value={form.type} onChange={handleChange} options={Object.entries(APPARATUS_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <FormSelect label="Status" name="status" value={form.status} onChange={handleChange} options={Object.entries(APPARATUS_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <FormField label="RMS Apparatus ID" name="rmsApparatusId" value={form.rmsApparatusId} onChange={handleChange} hint="For RMS integration" />
          <FormField label="License Plate" name="licensePlate" value={form.licensePlate} onChange={handleChange} />
        </FormSection>
        <FormSection title="Assignment">
          <FormSelect label="Department" name="departmentId" value={form.departmentId} onChange={handleChange} required options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          <FormSelect label="Station" name="stationId" value={form.stationId} onChange={handleChange} required options={filteredStations.map((s) => ({ value: s.id, label: s.name }))} />
        </FormSection>
        <FormSection title="Vehicle Details">
          <FormField label="Year" name="year" value={form.year} onChange={handleChange} />
          <FormField label="Make" name="make" value={form.make} onChange={handleChange} />
          <FormField label="Model" name="model" value={form.model} onChange={handleChange} />
          <FormField label="VIN" name="vin" value={form.vin} onChange={handleChange} />
          <FormField label="Mileage" name="mileage" type="number" value={form.mileage} onChange={handleChange} />
          <FormField label="Pump Hours" name="pumpHours" type="number" value={form.pumpHours} onChange={handleChange} />
        </FormSection>
        <FormSection title="Notes">
          <div className="sm:col-span-2"><FormTextarea label="Notes" name="notes" value={form.notes} onChange={handleChange} /></div>
        </FormSection>
        <div className="flex gap-3">
          <button type="submit" className="app-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <Link to="/apparatus" className="app-btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  );
}

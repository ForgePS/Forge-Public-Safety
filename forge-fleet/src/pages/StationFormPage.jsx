import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../components/FormFields.jsx";
import { STATION_STATUSES, STATION_STATUS_LABELS, createStation, getStation, updateStation } from "../lib/stations.js";
import { listDepartments } from "../lib/departments.js";

const emptyForm = { name: "", departmentId: "", departmentName: "", rmsStationId: "", address: "", status: STATION_STATUSES.ACTIVE, notes: "" };

export default function StationFormPage() {
  const { stationId } = useParams();
  const isNew = !stationId || stationId === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { listDepartments().then(setDepartments); }, []);

  useEffect(() => {
    if (isNew) return;
    getStation(stationId).then((s) => {
      if (!s) { setError("Not found."); setLoading(false); return; }
      setForm({ name: s.name, departmentId: s.departmentId, departmentName: s.departmentName, rmsStationId: s.rmsStationId, address: s.address, status: s.status, notes: s.notes });
      setLoading(false);
    });
  }, [isNew, stationId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "departmentId") next.departmentName = departments.find((d) => d.id === value)?.name ?? "";
      return next;
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) { const id = await createStation(form); navigate(`/stations/${id}`); }
      else { await updateStation(stationId, form); }
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed."); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <>
      <PageHeader title={isNew ? "New Station" : `Edit ${form.name}`} backTo="/stations" />
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-6">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <FormSection title="Station">
          <FormField label="Name" name="name" value={form.name} onChange={handleChange} required />
          <FormSelect label="Department" name="departmentId" value={form.departmentId} onChange={handleChange} required options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          <FormField label="RMS Station ID" name="rmsStationId" value={form.rmsStationId} onChange={handleChange} />
          <FormField label="Address" name="address" value={form.address} onChange={handleChange} />
          <FormSelect label="Status" name="status" value={form.status} onChange={handleChange} options={Object.entries(STATION_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <div className="sm:col-span-2"><FormTextarea label="Notes" name="notes" value={form.notes} onChange={handleChange} /></div>
        </FormSection>
        <div className="flex gap-3">
          <button type="submit" className="app-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <Link to="/stations" className="app-btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  );
}

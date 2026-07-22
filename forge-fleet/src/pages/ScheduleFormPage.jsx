import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../components/FormFields.jsx";
import {
  SCHEDULE_FREQUENCIES, SCHEDULE_FREQUENCY_LABELS, SCHEDULE_STATUSES, SCHEDULE_STATUS_LABELS,
  createMaintenanceSchedule, getMaintenanceSchedule, updateMaintenanceSchedule, markScheduleCompleted,
} from "../lib/maintenanceSchedules.js";
import { listMaintenanceModules } from "../lib/maintenanceModules.js";
import { listApparatus } from "../lib/apparatus.js";

const emptyForm = {
  name: "", moduleId: "", moduleName: "", apparatusId: "", apparatusName: "",
  equipmentId: "", equipmentName: "", frequency: SCHEDULE_FREQUENCIES.MONTHLY,
  intervalDays: "30", intervalMileage: "0", intervalHours: "0",
  nextDueDate: "", status: SCHEDULE_STATUSES.ACTIVE, notes: "",
};

export default function ScheduleFormPage() {
  const { scheduleId } = useParams();
  const isNew = !scheduleId || scheduleId === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [modules, setModules] = useState([]);
  const [apparatus, setApparatus] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listMaintenanceModules(), listApparatus()]).then(([m, a]) => { setModules(m); setApparatus(a); });
  }, []);

  useEffect(() => {
    if (isNew) return;
    getMaintenanceSchedule(scheduleId).then((s) => {
      if (!s) { setError("Not found."); setLoading(false); return; }
      setForm({
        name: s.name, moduleId: s.moduleId, moduleName: s.moduleName,
        apparatusId: s.apparatusId, apparatusName: s.apparatusName,
        equipmentId: s.equipmentId, equipmentName: s.equipmentName,
        frequency: s.frequency, intervalDays: String(s.intervalDays),
        intervalMileage: String(s.intervalMileage), intervalHours: String(s.intervalHours),
        nextDueDate: s.nextDueDate, status: s.status, notes: s.notes,
      });
      setLoading(false);
    });
  }, [isNew, scheduleId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "moduleId") next.moduleName = modules.find((m) => m.id === value)?.name ?? "";
      if (name === "apparatusId") next.apparatusName = apparatus.find((a) => a.id === value)?.name ?? "";
      return next;
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, intervalDays: Number(form.intervalDays), intervalMileage: Number(form.intervalMileage), intervalHours: Number(form.intervalHours) };
      if (isNew) { const id = await createMaintenanceSchedule(payload); navigate(`/schedules/${id}`); }
      else { await updateMaintenanceSchedule(scheduleId, payload); }
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed."); }
    finally { setSaving(false); }
  }

  async function handleMarkComplete() {
    const today = new Date().toISOString().slice(0, 10);
    await markScheduleCompleted(scheduleId, today);
    const updated = await getMaintenanceSchedule(scheduleId);
    if (updated) setForm((prev) => ({ ...prev, nextDueDate: updated.nextDueDate }));
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <>
      <PageHeader title={isNew ? "New Schedule" : `Edit ${form.name}`} backTo="/schedules" actions={!isNew ? <button type="button" className="app-btn-secondary" onClick={handleMarkComplete}>Mark Completed Today</button> : null} />
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-6">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <FormSection title="Schedule">
          <FormField label="Name" name="name" value={form.name} onChange={handleChange} required />
          <FormSelect label="Template" name="moduleId" value={form.moduleId} onChange={handleChange} required options={modules.map((m) => ({ value: m.id, label: m.name }))} />
          <FormSelect label="Apparatus" name="apparatusId" value={form.apparatusId} onChange={handleChange} options={[{ value: "", label: "— None —" }, ...apparatus.map((a) => ({ value: a.id, label: `${a.unitNumber} — ${a.name}` }))]} />
          <FormSelect label="Frequency" name="frequency" value={form.frequency} onChange={handleChange} options={Object.entries(SCHEDULE_FREQUENCY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <FormField label="Interval (days)" name="intervalDays" type="number" value={form.intervalDays} onChange={handleChange} />
          <FormField label="Next Due Date" name="nextDueDate" type="date" value={form.nextDueDate} onChange={handleChange} />
          <FormSelect label="Status" name="status" value={form.status} onChange={handleChange} options={Object.entries(SCHEDULE_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <div className="sm:col-span-2"><FormTextarea label="Notes" name="notes" value={form.notes} onChange={handleChange} /></div>
        </FormSection>
        <div className="flex gap-3">
          <button type="submit" className="app-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <Link to="/schedules" className="app-btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  );
}

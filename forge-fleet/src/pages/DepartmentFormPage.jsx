import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../components/FormFields.jsx";
import { DEPARTMENT_STATUSES, DEPARTMENT_STATUS_LABELS, createDepartment, getDepartment, updateDepartment, deleteDepartment } from "../lib/departments.js";

const emptyForm = { name: "", fdid: "", rmsDepartmentId: "", status: DEPARTMENT_STATUSES.ACTIVE, address: "", phone: "", notes: "" };

export default function DepartmentFormPage() {
  const { departmentId } = useParams();
  const isNew = !departmentId || departmentId === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isNew) return;
    getDepartment(departmentId).then((d) => {
      if (!d) { setError("Not found."); setLoading(false); return; }
      setForm({ name: d.name, fdid: d.fdid, rmsDepartmentId: d.rmsDepartmentId, status: d.status, address: d.address, phone: d.phone, notes: d.notes });
      setLoading(false);
    });
  }, [isNew, departmentId]);

  function handleChange(e) { setForm((prev) => ({ ...prev, [e.target.name]: e.target.value })); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) { const id = await createDepartment(form); navigate(`/departments/${id}`); }
      else { await updateDepartment(departmentId, form); }
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed."); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <>
      <PageHeader title={isNew ? "New Department" : `Edit ${form.name}`} backTo="/departments" />
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-6">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <FormSection title="Department">
          <FormField label="Name" name="name" value={form.name} onChange={handleChange} required />
          <FormField label="FDID" name="fdid" value={form.fdid} onChange={handleChange} hint="Fire Department ID" />
          <FormField label="RMS Department ID" name="rmsDepartmentId" value={form.rmsDepartmentId} onChange={handleChange} hint="For RMS integration" />
          <FormSelect label="Status" name="status" value={form.status} onChange={handleChange} options={Object.entries(DEPARTMENT_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <FormField label="Address" name="address" value={form.address} onChange={handleChange} />
          <FormField label="Phone" name="phone" value={form.phone} onChange={handleChange} />
          <div className="sm:col-span-2"><FormTextarea label="Notes" name="notes" value={form.notes} onChange={handleChange} /></div>
        </FormSection>
        <div className="flex gap-3">
          <button type="submit" className="app-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <Link to="/departments" className="app-btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  );
}

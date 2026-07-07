import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../components/FormFields.jsx";
import ModuleDefinitionEditor from "../components/ModuleDefinitionEditor.jsx";
import {
  MODULE_KINDS, MODULE_KIND_LABELS, MODULE_STATUSES, MODULE_STATUS_LABELS,
  SUBJECT_TYPES, SUBJECT_TYPE_LABELS,
  emptyMaintenanceModule, createMaintenanceModule, getMaintenanceModule, updateMaintenanceModule, deleteMaintenanceModule,
} from "../lib/maintenanceModules.js";

export default function TemplateFormPage() {
  const { templateId } = useParams();
  const isNew = !templateId || templateId === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyMaintenanceModule());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isNew) return;
    getMaintenanceModule(templateId).then((m) => {
      if (!m) { setError("Not found."); setLoading(false); return; }
      setForm(m);
      setLoading(false);
    });
  }, [isNew, templateId]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const id = await createMaintenanceModule(form);
        navigate(`/templates/${id}`);
      } else {
        await updateMaintenanceModule(templateId, form);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this template?")) return;
    await deleteMaintenanceModule(templateId);
    navigate("/templates");
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <>
      <PageHeader
        title={isNew ? "New Maintenance Template" : `Edit ${form.name}`}
        subtitle="Build fully customizable maintenance forms"
        backTo="/templates"
        actions={!isNew ? <button type="button" className="app-btn-danger" onClick={handleDelete}>Delete</button> : null}
      />
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-6">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <FormSection title="Template Info">
          <FormField label="Name" name="name" value={form.name} onChange={handleChange} required />
          <FormSelect label="Kind" name="kind" value={form.kind} onChange={handleChange} options={MODULE_KINDS.map((k) => ({ value: k, label: MODULE_KIND_LABELS[k] }))} />
          <FormSelect label="Status" name="status" value={form.status} onChange={handleChange} options={Object.entries(MODULE_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <FormSelect label="Subject Type" name="subjectType" value={form.subjectType} onChange={handleChange} options={Object.entries(SUBJECT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <div className="sm:col-span-2"><FormTextarea label="Description" name="description" value={form.description} onChange={handleChange} /></div>
        </FormSection>

        <section className="app-panel p-5">
          <h2 className="mb-4 text-sm font-semibold">Form Sections & Fields</h2>
          <p className="mb-4 text-[11px] text-[var(--color-fleet-muted)]">Add, edit, reorder, and remove sections and fields. All field types from the RMS ModuleDefinition schema are supported.</p>
          <ModuleDefinitionEditor
            sections={form.sections}
            onChange={(sections) => setForm((prev) => ({ ...prev, sections }))}
          />
        </section>

        <div className="flex gap-3">
          <button type="submit" className="app-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Template"}</button>
          {!isNew ? <Link to={`/templates/${templateId}/perform`} className="app-btn-secondary">Perform Checkoff</Link> : null}
          <Link to="/templates" className="app-btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  );
}

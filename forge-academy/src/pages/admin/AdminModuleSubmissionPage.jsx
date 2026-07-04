import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ModuleFormRenderer from "../../components/aiBuilder/ModuleFormRenderer.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormTextarea } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getModuleDefinition } from "../../lib/moduleDefinitions.js";
import { createModuleSubmission } from "../../lib/moduleSubmissions.js";

export default function AdminModuleSubmissionPage() {
  const { moduleId } = useParams();
  const { user } = useAuth();

  const [definition, setDefinition] = useState(null);
  const [values, setValues] = useState({});
  const [subjectLabel, setSubjectLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    getModuleDefinition(moduleId)
      .then((record) => {
        if (!record) throw new Error("Module not found.");
        setDefinition(record);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load module."))
      .finally(() => setLoading(false));
  }, [moduleId]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!definition) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const id = await createModuleSubmission(
        {
          moduleDefinitionId: moduleId,
          moduleKind: definition.kind,
          values,
          subjectLabel,
          notes,
        },
        user?.uid ?? "",
      );
      setMessage(`Submission saved (${id}).`);
      setValues({});
      setSubjectLabel("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-7 text-sm text-[var(--color-afta-subtle)]">Loading…</div>;
  }

  if (!definition) {
    return <div className="p-7 text-sm text-red-700">{error || "Module not found."}</div>;
  }

  return (
    <>
      <PageHeader
        title={`Submit — ${definition.name}`}
        subtitle="Mobile-friendly field data collection for RMS modules"
        backTo={`/admin/module-definitions/${moduleId}`}
        backLabel="Edit module"
        actions={
          <Link to="/admin/module-definitions" className="app-btn-secondary px-4 py-2 text-xs">
            All modules
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-5 shadow-sm">
          <FormField
            label="Subject / apparatus / location"
            name="subjectLabel"
            value={subjectLabel}
            onChange={(event) => setSubjectLabel(event.target.value)}
            placeholder="e.g. Engine 12 — daily check"
          />
          <ModuleFormRenderer
            definition={definition}
            values={values}
            onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
          />
          <FormTextarea
            label="Notes"
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <button type="submit" disabled={saving} className="app-btn-primary px-4 py-2 text-xs">
            {saving ? "Submitting…" : "Submit record"}
          </button>
        </form>
      </div>
    </>
  );
}

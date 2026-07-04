import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ForgeBuilderPanel from "../../components/aiBuilder/ForgeBuilderPanel.jsx";
import ModuleFormRenderer from "../../components/aiBuilder/ModuleFormRenderer.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useAiBuilderEnabled } from "../../lib/aiBuilder/useAiBuilderEnabled.js";
import {
  createModuleDefinition,
  getModuleDefinition,
  updateModuleDefinition,
} from "../../lib/moduleDefinitions.js";
import { defaultModuleDefinition } from "@forgeps/ai-builder/rms";

const KIND_OPTIONS = [
  { value: "checkoff", label: "Equipment checkoff", targetType: "moduleCheckoff" },
  { value: "inventory", label: "Inventory", targetType: "moduleInventory" },
  { value: "inspection", label: "Inspection", targetType: "moduleInspection" },
  { value: "custom", label: "Custom form", targetType: "moduleCustom" },
];

export default function AdminModuleDefinitionFormPage() {
  const { moduleId } = useParams();
  const isNew = !moduleId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const aiBuilderEnabled = useAiBuilderEnabled();

  const [form, setForm] = useState(() => defaultModuleDefinition());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const targetType = useMemo(
    () => KIND_OPTIONS.find((item) => item.value === form.kind)?.targetType ?? "moduleCustom",
    [form.kind],
  );

  useEffect(() => {
    if (isNew) return;
    let active = true;
    getModuleDefinition(moduleId)
      .then((record) => {
        if (!record) throw new Error("Module not found.");
        if (active) setForm({ ...defaultModuleDefinition(), ...record });
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load module.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isNew, moduleId]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        kind: form.kind,
        description: form.description,
        status: form.status ?? "draft",
        product: "rms",
        sections: form.sections ?? [],
        rules: form.rules ?? {},
        scope: form.scope ?? {},
        subject: form.subject ?? {},
        views: form.views ?? {},
      };
      if (isNew) {
        const id = await createModuleDefinition(payload, user?.uid ?? "");
        navigate(`/admin/module-definitions/${id}`);
      } else {
        await updateModuleDefinition(moduleId, payload, user?.uid ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save module.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-7 text-sm text-[var(--color-afta-subtle)]">Loading module…</div>;
  }

  return (
    <>
      <PageHeader
        title={isNew ? "New RMS module" : "Edit RMS module"}
        subtitle="Schema-first forms for checkoffs, inventory, and inspections"
        backTo="/admin/module-definitions"
        backLabel="All modules"
      />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        <form onSubmit={handleSave} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-5 shadow-sm">
          <FormSection title="Module details">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Name"
                name="name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
              <FormSelect
                label="Kind"
                name="kind"
                value={form.kind}
                onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))}
              >
                {KIND_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </FormSelect>
              <FormSelect
                label="Status"
                name="status"
                value={form.status ?? "draft"}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </FormSelect>
            </div>
            <FormTextarea
              label="Description"
              name="description"
              value={form.description ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </FormSection>

          {aiBuilderEnabled ? (
            <div className="mt-4">
              <ForgeBuilderPanel
                targetType={targetType}
                targetId={moduleId ?? ""}
                currentState={form}
                context={{ product: "rms", module: "moduleDefinitions", kind: form.kind }}
                onApply={(output) => {
                  setForm((prev) => ({
                    ...prev,
                    name: String(output.name ?? prev.name),
                    description: String(output.description ?? prev.description),
                    kind: String(output.kind ?? prev.kind),
                    sections: Array.isArray(output.sections) ? output.sections : prev.sections,
                    rules: output.rules && typeof output.rules === "object" ? output.rules : prev.rules,
                  }));
                }}
              />
            </div>
          ) : null}

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">Form preview</h3>
            <div className="mt-3">
              <ModuleFormRenderer definition={form} readOnly />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="app-btn-primary px-4 py-2 text-xs">
              {saving ? "Saving…" : "Save module"}
            </button>
            {!isNew ? (
              <Link to={`/admin/module-definitions/${moduleId}/submit`} className="app-btn-secondary px-4 py-2 text-xs">
                Field submission
              </Link>
            ) : null}
          </div>
        </form>
      </div>
    </>
  );
}

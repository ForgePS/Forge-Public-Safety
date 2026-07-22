import { MODULE_FIELD_TYPES } from "@forgeps/ai-builder/rms";
import { Plus, Trash2, GripVertical } from "lucide-react";

const FIELD_TYPE_OPTIONS = MODULE_FIELD_TYPES.map((t) => ({
  value: t,
  label: t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

/**
 * Fully editable ModuleDefinition section/field builder.
 * @param {{ sections: Object[], onChange: (sections: Object[]) => void }} props
 */
export default function ModuleDefinitionEditor({ sections, onChange }) {
  const safeSections = Array.isArray(sections) ? sections : [];

  function updateSections(next) {
    onChange(next);
  }

  function addSection() {
    const id = `section-${safeSections.length + 1}`;
    updateSections([...safeSections, { id, title: `Section ${safeSections.length + 1}`, items: [] }]);
  }

  function removeSection(sectionIndex) {
    updateSections(safeSections.filter((_, i) => i !== sectionIndex));
  }

  function updateSection(sectionIndex, patch) {
    updateSections(safeSections.map((s, i) => (i === sectionIndex ? { ...s, ...patch } : s)));
  }

  function addField(sectionIndex) {
    const section = safeSections[sectionIndex];
    const items = Array.isArray(section.items) ? section.items : [];
    const key = `field_${items.length + 1}`;
    updateSection(sectionIndex, {
      items: [...items, { key, label: `Field ${items.length + 1}`, type: "text", required: false }],
    });
  }

  function updateField(sectionIndex, fieldIndex, patch) {
    const section = safeSections[sectionIndex];
    const items = (section.items ?? []).map((f, fi) => (fi === fieldIndex ? { ...f, ...patch } : f));
    updateSection(sectionIndex, { items });
  }

  function removeField(sectionIndex, fieldIndex) {
    const section = safeSections[sectionIndex];
    updateSection(sectionIndex, { items: (section.items ?? []).filter((_, fi) => fi !== fieldIndex) });
  }

  return (
    <div className="space-y-4">
      {safeSections.map((section, si) => (
        <div key={section.id ?? si} className="app-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-[var(--color-fleet-subtle)]" />
            <input
              className="app-input flex-1 font-semibold"
              value={section.title ?? ""}
              onChange={(e) => updateSection(si, { title: e.target.value })}
              placeholder="Section title"
            />
            <button type="button" className="app-btn-danger" onClick={() => removeSection(si)}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {(section.items ?? []).map((field, fi) => (
              <div key={field.key ?? fi} className="grid gap-2 rounded-lg border border-[var(--color-fleet-border)] bg-slate-50 p-3 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <span className="app-label">Key</span>
                  <input
                    className="app-input font-mono text-xs"
                    value={field.key ?? ""}
                    onChange={(e) => updateField(si, fi, { key: e.target.value.replace(/\s/g, "_").toLowerCase() })}
                  />
                </div>
                <div className="sm:col-span-4">
                  <span className="app-label">Label</span>
                  <input
                    className="app-input"
                    value={field.label ?? ""}
                    onChange={(e) => updateField(si, fi, { label: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <span className="app-label">Type</span>
                  <select
                    className="app-input"
                    value={field.type ?? "text"}
                    onChange={(e) => updateField(si, fi, { type: e.target.value })}
                  >
                    {FIELD_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2 sm:col-span-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={Boolean(field.required)}
                      onChange={(e) => updateField(si, fi, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <button type="button" className="app-btn-danger ml-auto" onClick={() => removeField(si, fi)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {field.type === "select" ? (
                  <div className="sm:col-span-12">
                    <span className="app-label">Options (comma-separated)</span>
                    <input
                      className="app-input"
                      value={Array.isArray(field.options) ? field.options.join(", ") : String(field.options ?? "")}
                      onChange={(e) => updateField(si, fi, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                      placeholder="Pass, Fail, N/A"
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <button type="button" className="app-btn-secondary mt-3" onClick={() => addField(si)}>
            <Plus className="mr-1 inline h-3.5 w-3.5" />
            Add Field
          </button>
        </div>
      ))}

      <button type="button" className="app-btn-primary" onClick={addSection}>
        <Plus className="mr-1 inline h-3.5 w-3.5" />
        Add Section
      </button>
    </div>
  );
}

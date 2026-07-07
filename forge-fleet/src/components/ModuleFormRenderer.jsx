/**
 * Enhanced module form renderer supporting all ModuleDefinition field types.
 * @param {{ definition: Record<string, unknown>, values?: Record<string, unknown>, onChange?: (key: string, value: unknown) => void, readOnly?: boolean }} props
 */
export default function ModuleFormRenderer({ definition, values = {}, onChange, readOnly = false }) {
  const sections = Array.isArray(definition?.sections) ? definition.sections : [];

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const sec = /** @type {Record<string, unknown>} */ (section);
        const items = Array.isArray(sec.items) ? sec.items : [];
        return (
          <fieldset key={String(sec.id)} className="rounded-[10px] border border-[var(--color-fleet-border)] p-4">
            <legend className="px-1 text-sm font-semibold text-[var(--color-fleet-text)]">{String(sec.title ?? "Section")}</legend>
            <div className="mt-3 space-y-3">
              {items.map((item) => {
                const field = /** @type {Record<string, unknown>} */ (item);
                const key = String(field.key ?? "");
                const type = String(field.type ?? "text");
                const label = String(field.label ?? key);
                const value = values[key] ?? "";
                const required = Boolean(field.required);

                if (type === "boolean" || type === "pass_fail") {
                  return (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={Boolean(value)}
                        onChange={(e) => onChange?.(key, e.target.checked)}
                      />
                      <span>{label}{required ? " *" : ""}</span>
                    </label>
                  );
                }

                if (type === "textarea") {
                  return (
                    <label key={key} className="block text-sm">
                      <span className="app-label">{label}{required ? " *" : ""}</span>
                      <textarea
                        className="app-input min-h-[72px]"
                        disabled={readOnly}
                        value={String(value)}
                        onChange={(e) => onChange?.(key, e.target.value)}
                      />
                    </label>
                  );
                }

                if (type === "select") {
                  const options = Array.isArray(field.options) ? field.options : [];
                  return (
                    <label key={key} className="block text-sm">
                      <span className="app-label">{label}{required ? " *" : ""}</span>
                      <select
                        className="app-input"
                        disabled={readOnly}
                        value={String(value)}
                        onChange={(e) => onChange?.(key, e.target.value)}
                      >
                        <option value="">— Select —</option>
                        {options.map((opt) => (
                          <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
                        ))}
                      </select>
                    </label>
                  );
                }

                if (type === "photo") {
                  return (
                    <label key={key} className="block text-sm">
                      <span className="app-label">{label}{required ? " *" : ""}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={readOnly}
                        className="app-input"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onChange?.(key, file.name);
                        }}
                      />
                      {value ? <span className="mt-1 block text-[11px] text-[var(--color-fleet-muted)]">{String(value)}</span> : null}
                    </label>
                  );
                }

                if (type === "signature") {
                  return (
                    <label key={key} className="block text-sm">
                      <span className="app-label">{label}{required ? " *" : ""}</span>
                      <input
                        className="app-input italic"
                        disabled={readOnly}
                        placeholder="Type full name as signature"
                        value={String(value)}
                        onChange={(e) => onChange?.(key, e.target.value)}
                      />
                    </label>
                  );
                }

                const inputType = type === "number" ? "number" : type === "date" ? "date" : type === "time" ? "time" : "text";

                return (
                  <label key={key} className="block text-sm">
                    <span className="app-label">{label}{required ? " *" : ""}</span>
                    <input
                      className="app-input"
                      type={inputType}
                      disabled={readOnly}
                      value={String(value)}
                      onChange={(e) => onChange?.(key, type === "number" ? Number(e.target.value) : e.target.value)}
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

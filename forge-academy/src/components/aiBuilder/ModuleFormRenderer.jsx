/**
 * Renders a data-driven module form from ModuleDefinition sections.
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
          <fieldset key={String(sec.id)} className="rounded-[10px] border border-[var(--color-afta-border)] p-4">
            <legend className="px-1 text-sm font-semibold text-[var(--color-afta-text)]">{String(sec.title ?? "Section")}</legend>
            <div className="mt-3 space-y-3">
              {items.map((item) => {
                const field = /** @type {Record<string, unknown>} */ (item);
                const key = String(field.key ?? "");
                const type = String(field.type ?? "text");
                const label = String(field.label ?? key);
                const value = values[key] ?? "";

                if (type === "boolean" || type === "pass_fail") {
                  return (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={Boolean(value)}
                        onChange={(e) => onChange?.(key, e.target.checked)}
                      />
                      {label}
                    </label>
                  );
                }

                if (type === "textarea") {
                  return (
                    <label key={key} className="block text-sm">
                      <span className="app-label">{label}</span>
                      <textarea
                        className="app-input min-h-[72px]"
                        disabled={readOnly}
                        value={String(value)}
                        onChange={(e) => onChange?.(key, e.target.value)}
                      />
                    </label>
                  );
                }

                return (
                  <label key={key} className="block text-sm">
                    <span className="app-label">{label}</span>
                    <input
                      className="app-input"
                      type={type === "number" ? "number" : "text"}
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

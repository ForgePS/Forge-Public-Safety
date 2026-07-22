/**
 * @param {{ label: string, name: string, type?: string, value: string, onChange: import('react').ChangeEventHandler, required?: boolean, placeholder?: string, hint?: string, disabled?: boolean }} props
 */
export function FormField({ label, name, type = "text", value, onChange, required, placeholder, hint, disabled }) {
  return (
    <label className="block">
      <span className="app-label">{label}{required ? " *" : ""}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className="app-input"
      />
      {hint ? <span className="mt-1 block text-[11px] text-[var(--color-fleet-muted)]">{hint}</span> : null}
    </label>
  );
}

/**
 * @param {{ label: string, name: string, value: string, onChange: import('react').ChangeEventHandler, options?: { value: string, label: string }[], required?: boolean, disabled?: boolean, children?: import('react').ReactNode }} props
 */
export function FormSelect({ label, name, value, onChange, options, required, disabled, children }) {
  return (
    <label className="block">
      <span className="app-label">{label}{required ? " *" : ""}</span>
      <select name={name} value={value} onChange={onChange} required={required} disabled={disabled} className="app-input">
        {children}
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

/**
 * @param {{ label: string, name: string, value: string, onChange: import('react').ChangeEventHandler, required?: boolean, rows?: number, disabled?: boolean }} props
 */
export function FormTextarea({ label, name, value, onChange, required, rows = 3, disabled }) {
  return (
    <label className="block">
      <span className="app-label">{label}{required ? " *" : ""}</span>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        rows={rows}
        disabled={disabled}
        className="app-input min-h-[72px]"
      />
    </label>
  );
}

/**
 * @param {{ title: string, children: import('react').ReactNode, actions?: import('react').ReactNode }} props
 */
export function FormSection({ title, children, actions }) {
  return (
    <section className="app-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--color-fleet-text)]">{title}</h2>
        {actions}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

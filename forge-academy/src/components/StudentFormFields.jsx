const inputClassName = "app-input";

const labelClassName = "app-label";

/**
 * @param {{
 *   label: string,
 *   name: string,
 *   type?: string,
 *   value: string,
 *   onChange: import('react').ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
 *   required?: boolean,
 *   placeholder?: string,
 *   hint?: string,
 *   hint?: string,
 *   onBlur?: import('react').FocusEventHandler<HTMLInputElement>,
 *   disabled?: boolean,
 * }} props
 */
export function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  required,
  placeholder,
  hint,
  onBlur,
  disabled,
}) {
  return (
    <label className="block">
      <span className={labelClassName}>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName}
      />
      {hint ? <span className="mt-1 block text-[11px] text-[var(--color-afta-muted)]">{hint}</span> : null}
    </label>
  );
}

/**
 * @param {{
 *   label: string,
 *   name: string,
 *   value: string,
 *   onChange: import('react').ChangeEventHandler<HTMLSelectElement>,
 *   options?: { value: string, label: string }[],
 *   required?: boolean,
 *   disabled?: boolean,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function FormSelect({ label, name, value, onChange, options, required, disabled, children }) {
  return (
    <label className="block">
      <span className={labelClassName}>
        {label}
        {required ? " *" : ""}
      </span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={inputClassName}
      >
        {children ??
          options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
      </select>
    </label>
  );
}

/**
 * @param {{
 *   label: string,
 *   name: string,
 *   value: string,
 *   onChange: import('react').ChangeEventHandler<HTMLTextAreaElement>,
 *   rows?: number,
 * }} props
 */
export function FormTextarea({ label, name, value, onChange, rows = 4 }) {
  return (
    <label className="block">
      <span className={labelClassName}>{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className={inputClassName}
      />
    </label>
  );
}

export function FormSection({ title, children }) {
  return (
    <section className="app-panel p-5">
      <h2 className="mb-4 text-sm font-semibold text-[var(--color-afta-text)]">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/**
 * @param {{ matches: { student: import('../lib/students.js').StudentRecord, reasons: string[] }[] }} props
 */
export function DuplicateAlert({ matches }) {
  if (!matches.length) return null;

  return (
    <div className="app-error">
      <p className="font-semibold">Possible duplicate records</p>
      <ul className="mt-2 space-y-1">
        {matches.map(({ student, reasons }) => (
          <li key={student.id}>
            {student.lastName}, {student.firstName} · FEMA SID {student.femaSid} · matched on{" "}
            {reasons.join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

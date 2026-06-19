/**
 * @param {{
 *   selectedCount: number,
 *   onClear: () => void,
 *   children: import('react').ReactNode,
 *   message?: string,
 *   emptyHint?: string,
 * }} props
 */
export default function BulkEditBar({
  selectedCount,
  onClear,
  children,
  message,
  emptyHint = "Select rows using the checkboxes in the table below, then apply bulk changes here.",
}) {
  const active = selectedCount > 0;

  return (
    <section
      className={`rounded-[14px] border p-4 transition-colors ${
        active
          ? "sticky top-4 z-20 border-[#c8102e]/40 bg-[var(--color-afta-surface)] shadow-lg shadow-black/30"
          : "border-[var(--color-afta-border)] bg-[var(--color-afta-surface)]/80"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm font-semibold ${active ? "text-[var(--color-afta-text)]" : "text-[var(--color-afta-subtle)]"}`}>
          {active ? (
            <>
              {selectedCount} selected
              {message ? <span className="ml-2 font-normal text-[var(--color-afta-subtle)]">{message}</span> : null}
            </>
          ) : (
            <>Bulk edit — {emptyHint}</>
          )}
        </p>
        {active ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
          >
            Clear selection
          </button>
        ) : null}
      </div>
      <div className={active ? "" : "pointer-events-none opacity-45"} aria-hidden={!active}>
        {children}
      </div>
    </section>
  );
}

const fieldClassName =
  "rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50";

/**
 * @param {{
 *   label: string,
 *   value: string,
 *   onChange: import('react').ChangeEventHandler<HTMLSelectElement>,
 *   options: { value: string, label: string }[],
 *   disabled?: boolean,
 * }} props
 */
export function BulkSelectField({ label, value, onChange, options, disabled }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--color-afta-muted)]">
      {label}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={fieldClassName}
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
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
 *   type?: string,
 *   value: string,
 *   onChange: import('react').ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>,
 *   disabled?: boolean,
 *   multiline?: boolean,
 * }} props
 */
export function BulkInputField({ label, type = "text", value, onChange, disabled, multiline }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--color-afta-muted)]">
      {label}
      {multiline ? (
        <textarea
          value={value}
          onChange={onChange}
          disabled={disabled}
          rows={2}
          className={fieldClassName}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={fieldClassName}
        />
      )}
    </label>
  );
}

export function bulkResultMessage(results) {
  const succeeded = results.filter((item) => item.success).length;
  const failed = results.length - succeeded;
  if (failed === 0) return `Updated ${succeeded} record${succeeded === 1 ? "" : "s"}.`;
  return `Updated ${succeeded}; ${failed} failed.`;
}

import { Search } from "lucide-react";

/**
 * @param {{ label: string, active?: boolean, count?: number, onClick?: () => void }} props
 */
export function LibraryFilterPill({ label, active = false, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-[var(--color-afta-red)] bg-red-50 text-[var(--color-afta-red)]"
          : "border-[var(--color-afta-border)] bg-white text-[var(--color-afta-muted)] hover:border-slate-300 hover:text-[var(--color-afta-text)]"
      }`}
    >
      {label}
      {count != null && count > 0 ? (
        <span className="rounded-full bg-[var(--color-afta-red)] px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>
      ) : null}
    </button>
  );
}

/**
 * @param {{
 *   title: string,
 *   query?: string,
 *   onQueryChange?: (value: string) => void,
 *   searchPlaceholder?: string,
 *   actions?: import('react').ReactNode,
 *   filters?: import('react').ReactNode,
 *   totalItems?: number,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function DigitalDashboardLibraryShell({
  title,
  query = "",
  onQueryChange,
  searchPlaceholder = "Search",
  actions,
  filters,
  totalItems,
  children,
}) {
  return (
    <section className="app-panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-afta-border)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[var(--color-afta-text)]">{title}</h2>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>

      <div className="flex flex-col gap-3 border-b border-[var(--color-afta-border)] px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {onQueryChange ? (
            <label className="relative block min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-subtle)]" />
              <input
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="app-input pl-9"
              />
            </label>
          ) : null}
          {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
        </div>
        {totalItems != null ? (
          <p className="text-xs font-medium text-[var(--color-afta-muted)]">
            {totalItems} total item{totalItems === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {children}

      {totalItems != null ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-afta-border)] bg-slate-50 px-5 py-3 text-xs text-[var(--color-afta-muted)]">
          <span>{totalItems} total item{totalItems === 1 ? "" : "s"}</span>
          <span>Forge Displays · page 1 of 1</span>
        </footer>
      ) : null}
    </section>
  );
}

/** @param {{ active: boolean, label?: string }} props */
export function LibraryStatusBadge({ active, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
        active ? "text-green-700" : "text-amber-700"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? "bg-green-500" : "bg-amber-500"}`} />
      {label || (active ? "Active" : "Inactive")}
    </span>
  );
}

/** @param {{ children: import('react').ReactNode }} props */
export function LibraryGroupTag({ children }) {
  return (
    <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
      {children}
    </span>
  );
}

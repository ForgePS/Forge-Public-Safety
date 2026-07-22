import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * @param {{ title: string, subtitle?: string, backTo?: string, backLabel?: string, actions?: import('react').ReactNode }} props
 */
export default function PageHeader({ title, subtitle, backTo, backLabel = "Back", actions }) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--color-fleet-border)] bg-[var(--color-fleet-surface)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-7">
      <div>
        {backTo ? (
          <Link to={backTo} className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-fleet-muted)] hover:text-[var(--color-fleet-red)]">
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        ) : null}
        <h1 className="text-lg font-semibold text-[var(--color-fleet-text)]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--color-fleet-muted)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

/**
 * @param {{ label: string, value: string | number, sub?: string, warn?: boolean, linkTo?: string, linkLabel?: string, icon?: import('react').ComponentType }} props
 */
export function StatCard({ label, value, sub, warn, linkTo, linkLabel, icon: Icon }) {
  return (
    <article className="app-panel flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-fleet-muted)]">{label}</p>
        {Icon ? (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-[var(--color-fleet-red)]">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--color-fleet-text)]">{value}</p>
      {sub ? <p className={`mt-1 text-[11px] ${warn ? "text-[var(--color-fleet-red)]" : "text-[var(--color-fleet-subtle)]"}`}>{sub}</p> : null}
      {linkTo && linkLabel ? (
        <Link to={linkTo} className="mt-3 text-xs font-semibold text-[var(--color-fleet-red)] hover:underline">{linkLabel}</Link>
      ) : null}
    </article>
  );
}

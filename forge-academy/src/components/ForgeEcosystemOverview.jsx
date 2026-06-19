import { CAMPUS_SIGNAGE_SUMMARY, FORGE_ECOSYSTEM_PRODUCTS, INTEGRATION_PRINCIPLES } from "../lib/forgeEcosystem.js";

/**
 * @param {{
 *   variant?: "compact" | "full",
 *   showCampusNote?: boolean,
 * }} props
 */
export default function ForgeEcosystemOverview({ variant = "full", showCampusNote = false }) {
  if (variant === "compact" && showCampusNote) {
    return (
      <div className="rounded-[12px] border border-[var(--color-afta-border)] bg-slate-50 px-4 py-3 text-sm text-[var(--color-afta-muted)]">
        <p className="font-semibold text-[var(--color-afta-text)]">Campus Signage</p>
        <p className="mt-1 text-xs leading-relaxed">{CAMPUS_SIGNAGE_SUMMARY}</p>
        <a
          href="https://github.com/ForgePS/Dashboard"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-semibold text-[var(--color-afta-red)] hover:underline"
        >
          ForgePS/Dashboard (RMS-fed displays) →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {showCampusNote ? (
        <div className="rounded-[12px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-semibold">Campus Signage in Forge Academy</p>
          <p className="mt-1 text-xs leading-relaxed">{CAMPUS_SIGNAGE_SUMMARY}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {FORGE_ECOSYSTEM_PRODUCTS.map((product) => (
          <section
            key={product.id}
            className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">{product.name}</h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-afta-muted)]">{product.description}</p>
            <ul className="mt-3 space-y-1 text-xs text-[var(--color-afta-text)]">
              {product.owns.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[var(--color-afta-red)]">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
              {product.appUrl ? (
                <a href={product.appUrl} target="_blank" rel="noreferrer" className="text-[var(--color-afta-red)] hover:underline">
                  Open app →
                </a>
              ) : null}
              {product.repoUrl ? (
                <a href={product.repoUrl} target="_blank" rel="noreferrer" className="text-[var(--color-afta-red)] hover:underline">
                  Repository →
                </a>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      {variant === "full" ? (
        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">Integration principles</h3>
          <ul className="mt-4 space-y-3">
            {INTEGRATION_PRINCIPLES.map((item) => (
              <li key={item.title} className="rounded-[10px] border border-[var(--color-afta-border)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--color-afta-text)]">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--color-afta-muted)]">{item.detail}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[var(--color-afta-muted)]">
            Full architecture: <code className="rounded bg-slate-100 px-1">docs/ARCHITECTURE.md</code>,{" "}
            <code className="rounded bg-slate-100 px-1">docs/INTEGRATION.md</code>,{" "}
            <code className="rounded bg-slate-100 px-1">docs/API_CONTRACTS.md</code>. Dashboard repo templates:{" "}
            <code className="rounded bg-slate-100 px-1">docs/for-dashboard/</code>
          </p>
        </section>
      ) : null}
    </div>
  );
}

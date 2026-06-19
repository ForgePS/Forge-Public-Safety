/** Forge Public Safety login branding — shared visual language with Forge RMS. */

export const FORGE_LOGO_TAGLINE_SRC = "/forge-logo-tagline-clear.png";

export function ForgeWordmark() {
  return (
    <div className="text-center">
      <img
        src={FORGE_LOGO_TAGLINE_SRC}
        alt="Forge Public Safety — One Platform. Every Mission."
        className="mx-auto h-auto w-full max-w-[340px] object-contain"
      />
    </div>
  );
}

/**
 * @param {{ logoSrc?: string, logoAlt?: string, title: string, subtitle?: string }} props
 */
export function ForgeOrgBadge({ logoSrc = "/afta-logo.png", logoAlt = "", title, subtitle }) {
  return (
    <div className="forge-login-org-badge flex items-center gap-3 rounded-xl border px-4 py-3">
      <img src={logoSrc} alt={logoAlt} className="h-11 w-11 object-contain" />
      <div className="min-w-0 text-left">
        <p className="forge-login-org-title truncate text-sm font-bold">{title}</p>
        {subtitle ? <p className="forge-login-org-subtitle truncate text-xs">{subtitle}</p> : null}
      </div>
    </div>
  );
}

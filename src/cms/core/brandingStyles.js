export function brandingStylesFromBranding(branding) {
  if (!branding) return {};
  const c = branding.colors || {};
  const f = branding.fonts || {};
  return {
    "--cms-primary": c.primary,
    "--cms-secondary": c.secondary,
    "--cms-accent": c.accent,
    "--cms-bg": c.background,
    "--cms-bg-alt": c.backgroundAlt,
    "--cms-text": c.text,
    "--cms-text-muted": c.textMuted,
    "--cms-link": c.link,
    "--cms-button": c.button,
    "--cms-button-text": c.buttonText,
    "--cms-border": c.border,
    "--cms-font-heading": f.heading,
    "--cms-font-body": f.body,
    "--cms-container-width": branding.styles?.containerWidth || "1280px",
  };
}

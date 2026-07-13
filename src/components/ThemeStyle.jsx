import { useEffect } from "react";
import { useContent } from "../data/ContentContext.jsx";

// Friendly font key -> { stack, google } where `google` is the family spec for
// the Google Fonts CSS2 API (null for system/web-safe fonts that need no load).
const FONT_MAP = {
  system: { stack: `"Segoe UI", system-ui, -apple-system, sans-serif`, google: null },
  Inter: { stack: `'Inter', system-ui, sans-serif`, google: "Inter:wght@400;500;600;700;800" },
  Poppins: { stack: `'Poppins', sans-serif`, google: "Poppins:wght@400;500;600;700;800" },
  Montserrat: { stack: `'Montserrat', sans-serif`, google: "Montserrat:wght@400;500;600;700;800" },
  Roboto: { stack: `'Roboto', sans-serif`, google: "Roboto:wght@400;500;700;900" },
  "Open Sans": { stack: `'Open Sans', sans-serif`, google: "Open+Sans:wght@400;500;600;700;800" },
  Lato: { stack: `'Lato', sans-serif`, google: "Lato:wght@400;700;900" },
  Nunito: { stack: `'Nunito', sans-serif`, google: "Nunito:wght@400;500;600;700;800;900" },
  Raleway: { stack: `'Raleway', sans-serif`, google: "Raleway:wght@400;500;600;700;800" },
  "Work Sans": { stack: `'Work Sans', sans-serif`, google: "Work+Sans:wght@400;500;600;700;800" },
  Oswald: { stack: `'Oswald', sans-serif`, google: "Oswald:wght@400;500;600;700" },
  "Bebas Neue": { stack: `'Bebas Neue', sans-serif`, google: "Bebas+Neue" },
  "Playfair Display": { stack: `'Playfair Display', serif`, google: "Playfair+Display:wght@400;500;600;700;800;900" },
  Merriweather: { stack: `'Merriweather', serif`, google: "Merriweather:wght@400;700;900" },
  "Roboto Slab": { stack: `'Roboto Slab', serif`, google: "Roboto+Slab:wght@400;500;600;700;800" },
  Georgia: { stack: `Georgia, 'Times New Roman', serif`, google: null },
};

const DEFAULTS = {
  typography: {
    headingFont: "system",
    bodyFont: "system",
    textScale: "100%",
    headingWeight: "700",
    headingCase: "none",
  },
  colors: {
    accent: "#f97316",
    background: "#000000",
    text: "#f8fafc",
    muted: "#94a3b8",
    panel: "#111827",
    border: "#1e293b",
    navy: "#0f172a",
  },
};

function font(key) {
  return FONT_MAP[key] || FONT_MAP.system;
}

// Applies the editable theme site-wide: sets CSS variables (so every Tailwind
// utility using them updates), loads the chosen Google fonts, and applies base
// body/heading rules. Runs for visitors (static content) and live in the editor.
export default function ThemeStyle() {
  const content = useContent();
  const t = content.theme || {};
  const typo = { ...DEFAULTS.typography, ...(t.typography || {}) };
  const colors = { ...DEFAULTS.colors, ...(t.colors || {}) };

  const headingFont = font(typo.headingFont);
  const bodyFont = font(typo.bodyFont);

  useEffect(() => {
    // 1) Load Google fonts for whichever families were selected.
    const specs = [headingFont.google, bodyFont.google].filter(Boolean);
    const unique = [...new Set(specs)];
    let link = document.getElementById("forge-fonts");
    if (unique.length) {
      const href =
        "https://fonts.googleapis.com/css2?" +
        unique.map((s) => `family=${s}`).join("&") +
        "&display=swap";
      if (!link) {
        link = document.createElement("link");
        link.id = "forge-fonts";
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      if (link.href !== href) link.href = href;
    } else if (link) {
      link.remove();
    }

    // 2) Set CSS variables inline on <html> so they beat the stylesheet :root.
    const root = document.documentElement;
    const setVar = (k, v) => root.style.setProperty(k, v);
    setVar("--font-sans", bodyFont.stack);
    setVar("--font-heading", headingFont.stack);
    setVar("--color-forge-orange", colors.accent);
    setVar("--color-forge-navy", colors.navy);
    setVar("--color-forge-panel", colors.panel);
    setVar("--color-forge-border", colors.border);
    setVar("--color-forge-muted", colors.muted);
    root.style.fontSize = typo.textScale;

    // 3) Base rules that target elements (not just variables).
    const css = `
      body { background: ${colors.background} !important; color: ${colors.text}; font-family: var(--font-sans); }
      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-heading);
        font-weight: ${typo.headingWeight};
        text-transform: ${typo.headingCase};
      }
    `;
    let style = document.getElementById("forge-theme");
    if (!style) {
      style = document.createElement("style");
      style.id = "forge-theme";
      document.head.appendChild(style);
    }
    style.textContent = css;
  }, [
    headingFont.stack,
    headingFont.google,
    bodyFont.stack,
    bodyFont.google,
    typo.textScale,
    typo.headingWeight,
    typo.headingCase,
    colors.accent,
    colors.navy,
    colors.panel,
    colors.border,
    colors.muted,
    colors.background,
    colors.text,
  ]);

  return null;
}

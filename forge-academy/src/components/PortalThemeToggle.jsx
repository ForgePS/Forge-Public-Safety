import { Moon, Sun } from "lucide-react";
import { usePortalTheme } from "../context/PortalThemeContext.jsx";

/**
 * @param {{ compact?: boolean, className?: string }} props
 */
export default function PortalThemeToggle({ compact = false, className = "" }) {
  const { isDark, toggleTheme } = usePortalTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={[
        "portal-theme-toggle inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] font-semibold text-[var(--color-afta-muted)] transition hover:text-[var(--color-afta-text)]",
        compact ? "px-2.5 py-1.5 text-[10px]" : "px-3 py-2 text-xs",
        className,
      ].join(" ")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-3.5 w-3.5" aria-hidden /> : <Moon className="h-3.5 w-3.5" aria-hidden />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

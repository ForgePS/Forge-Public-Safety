import { Moon, Sun } from "lucide-react";

/** RMS-style login theme switch — shows the mode you can switch to. */
export function ForgeLoginThemeToggle({ isDark, onToggle }) {
  return (
    <div className="mb-6 flex justify-center">
      <button
        type="button"
        onClick={onToggle}
        className="forge-login-theme-toggle"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
        <span>{isDark ? "Light" : "Dark"}</span>
      </button>
    </div>
  );
}

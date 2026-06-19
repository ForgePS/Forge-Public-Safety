import { useEffect, useState } from "react";

const STORAGE_KEY = "forge-login-theme";

function readStoredTheme() {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

export function useForgeLoginTheme() {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);
    document.body.classList.add("forge-login-active");
    document.body.dataset.forgeLoginTheme = theme;
    return () => {
      document.body.classList.remove("forge-login-active");
      delete document.body.dataset.forgeLoginTheme;
    };
  }, [theme]);

  function toggleTheme() {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
  };
}

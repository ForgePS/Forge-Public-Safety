import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SYSTEM_SETTINGS,
  getSettingValue,
  getSystemSettings,
  isModuleEnabled,
  mergeSystemSettings,
  saveSystemSettingsSection,
} from "../lib/systemSettings.js";

/** @typedef {ReturnType<typeof mergeSystemSettings>} SystemSettings */

const SystemSettingsContext = createContext(null);

export function SystemSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => mergeSystemSettings({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getSystemSettings();
      setSettings(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load system settings.");
      setSettings(mergeSystemSettings({}));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** @param {string} sectionId @param {Record<string, unknown>} values @param {string} userId */
  const saveSection = useCallback(async (sectionId, values, userId) => {
    const saved = await saveSystemSettingsSection(sectionId, values, userId);
    setSettings((current) => ({
      ...current,
      [sectionId]: saved,
    }));
    return saved;
  }, []);

  const value = useMemo(
    () => ({
      settings,
      loading,
      error,
      reload,
      saveSection,
      isModuleEnabled: (moduleKey) => isModuleEnabled(settings, moduleKey),
      getValue: (path) => getSettingValue(settings, path),
      defaults: DEFAULT_SYSTEM_SETTINGS,
    }),
    [settings, loading, error, reload, saveSection],
  );

  return <SystemSettingsContext.Provider value={value}>{children}</SystemSettingsContext.Provider>;
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error("useSystemSettings must be used within SystemSettingsProvider.");
  }
  return context;
}

/** Safe hook for components that may render outside the provider. */
export function useSystemSettingsOptional() {
  return useContext(SystemSettingsContext);
}

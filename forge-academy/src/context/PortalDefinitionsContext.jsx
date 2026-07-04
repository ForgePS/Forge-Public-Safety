import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  listPortalDefinitions,
  portalDefinitionsBySlug,
} from "../lib/portalDefinitions.js";

/** @typedef {import('../lib/portalDefinitions.js').PortalDefinition} PortalDefinition */

const PortalDefinitionsContext = createContext(null);

export function PortalDefinitionsProvider({ children }) {
  const [portals, setPortals] = useState(/** @type {PortalDefinition[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listPortalDefinitions();
      setPortals(rows.filter((portal) => portal.status === "active"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load custom portals.");
      setPortals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const bySlug = useMemo(() => portalDefinitionsBySlug(portals), [portals]);

  const value = useMemo(
    () => ({
      portals,
      bySlug,
      loading,
      error,
      reload,
    }),
    [portals, bySlug, loading, error, reload],
  );

  return <PortalDefinitionsContext.Provider value={value}>{children}</PortalDefinitionsContext.Provider>;
}

export function usePortalDefinitions() {
  const context = useContext(PortalDefinitionsContext);
  if (!context) {
    throw new Error("usePortalDefinitions must be used within PortalDefinitionsProvider.");
  }
  return context;
}

export function usePortalDefinitionsOptional() {
  return useContext(PortalDefinitionsContext);
}

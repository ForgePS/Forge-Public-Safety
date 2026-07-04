import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  customRolesById,
  listPortalRoleDefinitions,
} from "../lib/portalRoleDefinitions.js";
import { ALL_ROLES, ROLE_LABELS } from "../lib/roles.js";

/** @typedef {import('../lib/portalRoleDefinitions.js').PortalRoleDefinition} PortalRoleDefinition */

const PortalRolesContext = createContext(null);

export function PortalRolesProvider({ children }) {
  const [customRoles, setCustomRoles] = useState(/** @type {PortalRoleDefinition[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listPortalRoleDefinitions();
      setCustomRoles(rows.filter((role) => role.status === "active"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load custom roles.");
      setCustomRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const customById = useMemo(() => customRolesById(customRoles), [customRoles]);

  const roleOptions = useMemo(
    () => [
      ...ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role], isCustom: false })),
      ...customRoles.map((role) => ({ value: role.id, label: role.label, isCustom: true })),
    ],
    [customRoles],
  );

  const value = useMemo(
    () => ({
      customRoles,
      customById,
      roleOptions,
      loading,
      error,
      reload,
      getRoleLabel(role) {
        if (!role) return "";
        if (ROLE_LABELS[role]) return ROLE_LABELS[role];
        return customById[role]?.label ?? role;
      },
      getRolePortalType(role) {
        if (!role) return null;
        return customById[role]?.portalType ?? null;
      },
    }),
    [customRoles, customById, roleOptions, loading, error, reload],
  );

  return <PortalRolesContext.Provider value={value}>{children}</PortalRolesContext.Provider>;
}

export function usePortalRoles() {
  const context = useContext(PortalRolesContext);
  if (!context) {
    throw new Error("usePortalRoles must be used within PortalRolesProvider.");
  }
  return context;
}

export function usePortalRolesOptional() {
  return useContext(PortalRolesContext);
}

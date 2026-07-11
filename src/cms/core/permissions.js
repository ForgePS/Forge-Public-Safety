import { DEFAULT_ROLES } from "./constants.js";

export function hasPermission(userRole, permission, roles = DEFAULT_ROLES) {
  if (!userRole) return false;
  const role = roles.find((r) => r.id === userRole);
  if (!role) return false;
  if (role.permissions.includes("*")) return true;

  return role.permissions.some((p) => {
    if (p === permission) return true;
    if (p.endsWith(".*")) {
      const prefix = p.slice(0, -2);
      return permission.startsWith(prefix);
    }
    if (p.endsWith(".read") && permission.endsWith(".read")) {
      const prefix = p.slice(0, -5);
      return permission.startsWith(prefix);
    }
    return false;
  });
}

export function canEdit(userRole, resource, roles) {
  return hasPermission(userRole, `${resource}.edit`, roles) || hasPermission(userRole, `${resource}.*`, roles);
}

export function canPublish(userRole, roles) {
  return hasPermission(userRole, "pages.publish", roles) || hasPermission(userRole, "pages.*", roles);
}

export function canDelete(userRole, resource, roles) {
  return hasPermission(userRole, `${resource}.delete`, roles) || hasPermission(userRole, `${resource}.*`, roles);
}

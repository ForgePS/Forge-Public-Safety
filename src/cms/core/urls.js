/**
 * Normalize CMS / admin href values so domains without a protocol
 * do not become relative routes like /admin/forgepublicsafety.com
 */

const PROTOCOL_RE = /^(https?:|mailto:|tel:|sms:|data:|blob:|#|\/\/)/i;
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+([/:?#].*)?$/i;

export function normalizeHref(raw, { fallback = "/" } = {}) {
  if (raw == null) return fallback;
  let value = String(raw).trim();
  if (!value) return fallback;

  // Strip accidental wrapping quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  if (!value) return fallback;

  if (PROTOCOL_RE.test(value)) return value;

  // Domain-like values pasted without https://
  if (DOMAIN_RE.test(value) || value.toLowerCase().startsWith("www.")) {
    return `https://${value}`;
  }

  // Internal paths must be absolute from site root
  if (value.startsWith("/")) return value;
  return `/${value.replace(/^\/+/, "")}`;
}

export function isExternalHref(raw) {
  const href = normalizeHref(raw, { fallback: "" });
  if (!href) return false;
  return /^(https?:|mailto:|tel:|sms:|\/\/)/i.test(href);
}

export function hrefOpenInNewTab(raw, explicitNewTab) {
  if (typeof explicitNewTab === "boolean") return explicitNewTab;
  return isExternalHref(raw);
}

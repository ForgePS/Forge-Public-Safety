import { getFirestore } from "firebase-admin/firestore";

function normalize(value) {
  return String(value ?? "").trim();
}

export async function getHubSettings() {
  const db = getFirestore();
  const [defaultSnap, aftaSnap] = await Promise.all([
    db.doc("systemSettings/default").get(),
    db.doc("systemSettings/afta-pilot").get(),
  ]);
  const rms = {
    ...(defaultSnap.exists ? defaultSnap.data()?.rms ?? {} : {}),
    ...(aftaSnap.exists ? aftaSnap.data()?.rms ?? {} : {}),
  };
  return {
    enabled: Boolean(rms.enabled),
    hubEnabled: rms.hubEnabled !== false && Boolean(normalize(rms.hubBaseUrl)),
    hubBaseUrl: normalize(rms.hubBaseUrl).replace(/\/$/, ""),
    hubBearerToken: normalize(rms.hubBearerToken),
    hubSecret: normalize(rms.hubSecret),
    outboundSecret: normalize(rms.outboundSecret),
    webhookSecret: normalize(rms.webhookSecret),
    tenantId: normalize(rms.tenantId) || "forge-platform",
    forgeDepartmentId: normalize(rms.forgeDepartmentId),
  };
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown }} [options]
 */
export async function hubFetch(path, options = {}) {
  const settings = await getHubSettings();
  if (!settings.hubBaseUrl) {
    throw new Error("Integration Hub base URL is not configured.");
  }

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (settings.hubBearerToken) {
    headers.Authorization = `Bearer ${settings.hubBearerToken}`;
  }
  if (settings.hubSecret) {
    headers["X-Integration-Secret"] = settings.hubSecret;
  }

  const response = await fetch(`${settings.hubBaseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Hub ${response.status}: ${text.slice(0, 300)}`);
  }
  return json;
}

/** @param {Record<string, unknown>} event */
export async function publishHubEvent(event) {
  return hubFetch("/api/integrations/v1/events", { method: "POST", body: event });
}

export async function fetchHubSyncStatus() {
  return hubFetch("/api/integrations/v1/sync/status");
}

/** @param {Record<string, unknown>} body */
export async function requestHubResync(body) {
  return hubFetch("/api/integrations/v1/sync/resync", { method: "POST", body });
}

/** @param {Record<string, unknown>} person */
export async function resolvePersonIdentityViaHub(person) {
  const settings = await getHubSettings();
  if (!settings.hubBaseUrl || settings.hubEnabled === false) {
    return { hubConfigured: false, ok: false };
  }
  const result = await hubFetch("/api/integrations/v1/identity/resolve", {
    method: "POST",
    body: { ...person, sourceSystem: person.sourceSystem || "academy" },
  });
  return { hubConfigured: true, ...result };
}

/** @param {string} personId @param {Record<string, unknown>} [body] */
export async function verifyPersonIdentityViaHub(personId, body = {}) {
  return hubFetch(`/api/integrations/v1/identity/${encodeURIComponent(personId)}/verify`, {
    method: "POST",
    body,
  });
}

/** @param {string} reviewId @param {Record<string, unknown>} body */
export async function resolveDuplicateReviewViaHub(reviewId, body) {
  return hubFetch(`/api/integrations/v1/identity/duplicates/${encodeURIComponent(reviewId)}/resolve`, {
    method: "POST",
    body,
  });
}

/** @param {string} personId @param {Record<string, unknown>} body */
export async function requestFemaSidCorrectionViaHub(personId, body) {
  return hubFetch(
    `/api/integrations/v1/identity/${encodeURIComponent(personId)}/fema-sid/corrections`,
    { method: "POST", body },
  );
}

/** @param {string} correctionId @param {Record<string, unknown>} [body] */
export async function approveFemaSidCorrectionViaHub(correctionId, body = {}) {
  return hubFetch(
    `/api/integrations/v1/identity/fema-sid/corrections/${encodeURIComponent(correctionId)}/approve`,
    { method: "POST", body },
  );
}

/** @param {string} correctionId @param {Record<string, unknown>} [body] */
export async function rejectFemaSidCorrectionViaHub(correctionId, body = {}) {
  return hubFetch(
    `/api/integrations/v1/identity/fema-sid/corrections/${encodeURIComponent(correctionId)}/reject`,
    { method: "POST", body },
  );
}

/** Forward RMS roster people to Hub personnel endpoint. */
export async function forwardRosterToHub(people, options = {}) {
  const settings = await getHubSettings();
  const forgeDepartmentId = normalize(options.forgeDepartmentId) || settings.forgeDepartmentId || "forge-platform";
  return hubFetch(`/api/integrations/v1/departments/${encodeURIComponent(forgeDepartmentId)}/personnel`, {
    method: "POST",
    body: {
      people: people.map((person) => ({
        ...person,
        forgeDepartmentId,
        tenantId: options.tenantId || settings.tenantId,
      })),
    },
  });
}

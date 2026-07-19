/**
 * Hub runtime config. Secrets prefer Secret Manager when HUB_USE_SECRET_MANAGER=true.
 */

function env(name, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

export const config = {
  port: Number(env("PORT", "8080")),
  projectId: env("GOOGLE_CLOUD_PROJECT", env("GCLOUD_PROJECT", "forge-academy-95f84")),
  /** When unset, hub stores state in the same Firestore project under hub* collections. */
  hubFirestoreDatabase: env("HUB_FIRESTORE_DATABASE", "(default)"),
  mode: env("HUB_PIPELINE_MODE", "inline"), // inline | gcp
  pubsubInboundTopic: env("HUB_PUBSUB_INBOUND", "hub.inbound"),
  pubsubAcademyTopic: env("HUB_PUBSUB_ACADEMY", "hub.outbound.academy"),
  pubsubRmsTopic: env("HUB_PUBSUB_RMS", "hub.outbound.rms"),
  tasksQueue: env("HUB_TASKS_QUEUE", "hub-retry"),
  tasksLocation: env("HUB_TASKS_LOCATION", "us-central1"),
  academyCommandUrl: env(
    "HUB_ACADEMY_COMMAND_URL",
    "https://us-central1-forge-academy-95f84.cloudfunctions.net/hubAcademyCommand",
  ),
  rmsCommandUrl: env(
    "HUB_RMS_COMMAND_URL",
    "https://us-central1-rms-dashboard-7562e.cloudfunctions.net/hubRmsCommand",
  ),
  integrationSecret: env("HUB_INTEGRATION_SECRET"),
  academyServiceToken: env("HUB_ACADEMY_SERVICE_TOKEN"),
  rmsServiceToken: env("HUB_RMS_SERVICE_TOKEN"),
  useSecretManager: env("HUB_USE_SECRET_MANAGER") === "true",
  secretNames: {
    integrationSecret: env("HUB_SECRET_INTEGRATION", "hub-integration-secret"),
    academyToken: env("HUB_SECRET_ACADEMY_TOKEN", "hub-academy-service-token"),
    rmsToken: env("HUB_SECRET_RMS_TOKEN", "hub-rms-service-token"),
  },
  maxRetries: Number(env("HUB_MAX_RETRIES", "5")),
};

let secretsCache = null;
let secretsCachedAt = 0;
const SECRETS_TTL_MS = 60_000;

/** Read Academy RMS Integration secrets from Firestore when env/Secret Manager are empty. */
async function loadSecretsFromFirestore() {
  try {
    const { initStore } = await import("./store/firestore.js");
    const db = initStore();
    const [defaultSnap, aftaSnap] = await Promise.all([
      db.doc("systemSettings/default").get(),
      db.doc("systemSettings/afta-pilot").get(),
    ]);
    const rms = {
      ...(defaultSnap.exists ? defaultSnap.data()?.rms ?? {} : {}),
      ...(aftaSnap.exists ? aftaSnap.data()?.rms ?? {} : {}),
    };
    const shared = String(rms.hubSecret || rms.hubBearerToken || rms.outboundSecret || rms.webhookSecret || "").trim();
    return {
      integrationSecret: shared,
      academyServiceToken: String(rms.hubBearerToken || shared).trim(),
      rmsServiceToken: shared,
    };
  } catch {
    return { integrationSecret: "", academyServiceToken: "", rmsServiceToken: "" };
  }
}

export async function loadSecrets() {
  if (secretsCache && Date.now() - secretsCachedAt < SECRETS_TTL_MS) return secretsCache;

  let base = {
    integrationSecret: config.integrationSecret,
    academyServiceToken: config.academyServiceToken,
    rmsServiceToken: config.rmsServiceToken,
  };

  if (config.useSecretManager) {
    try {
      const { SecretManagerServiceClient } = await import("@google-cloud/secret-manager");
      const client = new SecretManagerServiceClient();
      async function readSecret(name) {
        const resource = `projects/${config.projectId}/secrets/${name}/versions/latest`;
        const [version] = await client.accessSecretVersion({ name: resource });
        return version.payload?.data?.toString("utf8")?.trim() ?? "";
      }
      base = {
        integrationSecret: (await readSecret(config.secretNames.integrationSecret)) || base.integrationSecret,
        academyServiceToken: (await readSecret(config.secretNames.academyToken)) || base.academyServiceToken,
        rmsServiceToken: (await readSecret(config.secretNames.rmsToken)) || base.rmsServiceToken,
      };
    } catch {
      // fall through to Firestore / env
    }
  }

  if (!base.integrationSecret || !base.academyServiceToken) {
    const fromFs = await loadSecretsFromFirestore();
    base = {
      integrationSecret: base.integrationSecret || fromFs.integrationSecret,
      academyServiceToken: base.academyServiceToken || fromFs.academyServiceToken,
      rmsServiceToken: base.rmsServiceToken || fromFs.rmsServiceToken,
    };
  }

  secretsCache = base;
  secretsCachedAt = Date.now();
  return secretsCache;
}

/** Force next loadSecrets() to re-read (after settings change). */
export function clearSecretsCache() {
  secretsCache = null;
  secretsCachedAt = 0;
}

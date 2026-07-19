import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase.js";
import { writeAuditLog } from "./auditLogs.js";
import { getSystemSettings, saveSystemSettingsSection } from "./systemSettings.js";
import {
  FORGE_ACADEMY_PROJECT_ID,
  FORGE_RMS_HOSTING_URL,
  FORGE_RMS_PLATFORM_TENANT_ID,
} from "./forgeEcosystem.js";
import {
  filterRecordsByAcademy,
  getStoredActiveAcademyId,
} from "./academyTenancy.js";
import { DEFAULT_ACADEMY_ID } from "../data/defaultAcademy.js";

const SETTINGS_DOC = "default";
const settingsRef = doc(db, "rmsIntegrationSettings", SETTINGS_DOC);
const rosterSyncRef = collection(db, "rmsRosterSyncLog");
const trainingSyncRef = collection(db, "rmsTrainingSyncLog");

const DEFAULT_RMS_FUNCTIONS_URL = "https://us-central1-rms-dashboard-7562e.cloudfunctions.net";
const DEFAULT_ACADEMY_FUNCTIONS_URL = `https://us-central1-${FORGE_ACADEMY_PROJECT_ID}.cloudfunctions.net`;

/**
 * @typedef {Object} RmsIntegrationSettings
 * @property {boolean} enabled
 * @property {string} apiBaseUrl
 * @property {string} webhookSecret
 * @property {string} outboundSecret
 * @property {boolean} autoCreateStudents
 * @property {boolean} syncTrainingOnCertificateRelease
 * @property {string} defaultAcademyId
 * @property {string} tenantId
 * @property {boolean} mapDepartmentsOnSync
 * @property {string} hubBaseUrl
 * @property {string} hubBearerToken
 * @property {string} hubSecret
 * @property {boolean} hubEnabled
 * @property {string} forgeDepartmentId
 * @property {string} notes
 */

export function getDefaultRmsIntegrationSettings() {
  return {
    enabled: false,
    apiBaseUrl: DEFAULT_RMS_FUNCTIONS_URL,
    tenantId: FORGE_RMS_PLATFORM_TENANT_ID,
    webhookSecret: "",
    outboundSecret: "",
    autoCreateStudents: true,
    mapDepartmentsOnSync: false,
    syncTrainingOnCertificateRelease: true,
    defaultAcademyId: "",
    hubBaseUrl: "",
    hubBearerToken: "",
    hubSecret: "",
    hubEnabled: true,
    forgeDepartmentId: FORGE_RMS_PLATFORM_TENANT_ID,
    notes: "",
  };
}

/** @param {unknown} error */
function isPermissionDenied(error) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "permission-denied" || error.code === "functions/permission-denied"),
  );
}

/** @param {string} [academyId] */
export async function getRmsIntegrationSettings(academyId = getStoredActiveAcademyId()) {
  const settings = await getSystemSettings(academyId || DEFAULT_ACADEMY_ID);
  const rms = settings.rms ?? {};
  const defaults = getDefaultRmsIntegrationSettings();
  return {
    enabled: Boolean(rms.enabled),
    apiBaseUrl: rms.apiBaseUrl ?? defaults.apiBaseUrl,
    webhookSecret: rms.webhookSecret ?? "",
    outboundSecret: rms.outboundSecret ?? "",
    autoCreateStudents: rms.autoCreateStudents !== false,
    mapDepartmentsOnSync: rms.mapDepartmentsOnSync === true,
    syncTrainingOnCertificateRelease: rms.syncTrainingOnCertificateRelease !== false,
    defaultAcademyId: rms.defaultAcademyId ?? "",
    tenantId: rms.tenantId ?? defaults.tenantId,
    hubBaseUrl: rms.hubBaseUrl ?? "",
    hubBearerToken: rms.hubBearerToken ?? "",
    hubSecret: rms.hubSecret ?? "",
    hubEnabled: rms.hubEnabled !== false,
    forgeDepartmentId: rms.forgeDepartmentId ?? defaults.forgeDepartmentId,
    notes: rms.notes ?? "",
  };
}

/**
 * @param {Partial<RmsIntegrationSettings>} input
 * @param {string} userId
 * @param {string} [academyId]
 */
export async function saveRmsIntegrationSettings(input, userId, academyId = getStoredActiveAcademyId()) {
  const targetAcademyId = academyId || DEFAULT_ACADEMY_ID;
  await saveSystemSettingsSection("rms", input, userId, targetAcademyId);
  // Functions still read systemSettings/default — mirror hub-critical fields there.
  await saveSystemSettingsSection("rms", input, userId, "default");

  await setDoc(
    settingsRef,
    {
      ...input,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );

  try {
    await writeAuditLog({
      action: "rms_settings_updated",
      entityType: "rmsIntegrationSettings",
      entityId: SETTINGS_DOC,
      userId,
    });
  } catch (error) {
    if (!isPermissionDenied(error)) throw error;
  }
}

export function getRmsIntegrationEndpoints() {
  return {
    rmsHostingUrl: FORGE_RMS_HOSTING_URL,
    rmsFunctionsBase: DEFAULT_RMS_FUNCTIONS_URL,
    academyPersonnelWebhook: `${DEFAULT_ACADEMY_FUNCTIONS_URL}/rmsPersonnelWebhook`,
    academyHubCommand: `${DEFAULT_ACADEMY_FUNCTIONS_URL}/hubAcademyCommand`,
    academyPullRosterCallable: "pullRosterFromRmsCallable",
    hubApiBase: "/api/integrations/v1",
  };
}

export async function listRmsRosterSyncLog() {
  try {
    const snap = await getDocs(query(rosterSyncRef, orderBy("receivedAt", "desc"), limit(25)));
    return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch (error) {
    if (isPermissionDenied(error)) return [];
    throw error;
  }
}

export async function listRmsTrainingSyncLog(academyId = getStoredActiveAcademyId()) {
  try {
    const snap = await getDocs(query(trainingSyncRef, orderBy("createdAt", "desc"), limit(50)));
    return filterRecordsByAcademy(
      snap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        academyId: item.data().academyId ?? "",
      })),
      academyId,
    );
  } catch (error) {
    if (isPermissionDenied(error)) return [];
    throw error;
  }
}

/** @param {string} userId */
export async function pullRosterFromRms(userId) {
  const callable = httpsCallable(functions, "pullRosterFromRmsCallable");
  const result = await callable({});
  try {
    await writeAuditLog({
      action: "rms_roster_pulled",
      entityType: "rmsRosterSyncLog",
      userId,
      details: result.data ?? {},
    });
  } catch (error) {
    if (!isPermissionDenied(error)) throw error;
  }
  return result.data;
}

export async function getHubSyncStatus() {
  const callable = httpsCallable(functions, "getHubSyncStatusCallable");
  const result = await callable({});
  return result.data;
}

/** @param {Record<string, unknown>} body @param {string} userId */
export async function requestHubResync(body, userId) {
  const callable = httpsCallable(functions, "requestHubResyncCallable");
  const result = await callable(body || {});
  try {
    await writeAuditLog({
      action: "hub_resync_requested",
      entityType: "hubSyncFailures",
      userId,
      details: body || {},
    });
  } catch (error) {
    if (!isPermissionDenied(error)) throw error;
  }
  return result.data;
}

/** @param {Record<string, unknown>} body */
export async function resolveHubDuplicateReview(body) {
  const callable = httpsCallable(functions, "resolveHubDuplicateReviewCallable");
  const result = await callable(body || {});
  return result.data;
}

/** @param {string} personId @param {Record<string, unknown>} [body] */
export async function verifyHubPersonIdentity(personId, body = {}) {
  const callable = httpsCallable(functions, "verifyHubPersonIdentityCallable");
  const result = await callable({ ...body, personId });
  return result.data;
}

/** @param {string} personId @param {{ newFemaSid: string, reason: string }} body */
export async function requestHubFemaSidCorrection(personId, body) {
  const callable = httpsCallable(functions, "requestHubFemaSidCorrectionCallable");
  const result = await callable({ ...body, personId });
  return result.data;
}

/** @param {string} correctionId */
export async function approveHubFemaSidCorrection(correctionId) {
  const callable = httpsCallable(functions, "approveHubFemaSidCorrectionCallable");
  const result = await callable({ correctionId });
  return result.data;
}

/** @param {string} correctionId @param {string} [reason] */
export async function rejectHubFemaSidCorrection(correctionId, reason) {
  const callable = httpsCallable(functions, "rejectHubFemaSidCorrectionCallable");
  const result = await callable({ correctionId, reason });
  return result.data;
}

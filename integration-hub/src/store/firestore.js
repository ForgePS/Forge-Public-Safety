import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { config } from "../config.js";

let ready = false;

export function initStore() {
  if (!ready) {
    if (!getApps().length) {
      initializeApp({ projectId: config.projectId });
    }
    ready = true;
  }
  return getFirestore();
}

export function db() {
  return initStore();
}

export { FieldValue };

export const COLLECTIONS = {
  identities: "hubIdentities",
  connections: "hubConnections",
  events: "hubEvents",
  syncState: "hubSyncState",
  duplicateReviews: "hubDuplicateReviews",
  auditLogs: "hubAuditLogs",
  syncFailures: "hubSyncFailures",
  reconcileReports: "hubReconcileReports",
  identityMerges: "hubIdentityMerges",
  femaSidCorrections: "hubFemaSidCorrections",
};

import { createStore } from "./dataStore.js";

export const AUDIT_ACTIONS = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
  STATUS_CHANGED: "status_changed",
  COMPLETED: "completed",
  SUBMITTED: "submitted",
  APPROVED: "approved",
};

export const AUDIT_ENTITY_TYPES = {
  APPARATUS: "apparatus",
  EQUIPMENT: "equipment",
  DEPARTMENT: "department",
  STATION: "station",
  MODULE: "maintenanceModule",
  SCHEDULE: "maintenanceSchedule",
  WORK_ORDER: "workOrder",
  RECORD: "maintenanceRecord",
};

/**
 * @typedef {Object} AuditEntry
 * @property {string} id
 * @property {string} action
 * @property {string} entityType
 * @property {string} entityId
 * @property {string} entityLabel
 * @property {string} actorName
 * @property {string} actorUid
 * @property {string} details
 * @property {string} timestamp
 */

const store = createStore("maintenanceAuditLog", mapAuditEntry);

function mapAuditEntry(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    action: String(data.action ?? ""),
    entityType: String(data.entityType ?? ""),
    entityId: String(data.entityId ?? ""),
    entityLabel: String(data.entityLabel ?? ""),
    actorName: String(data.actorName ?? ""),
    actorUid: String(data.actorUid ?? ""),
    details: String(data.details ?? ""),
    timestamp: String(data.timestamp ?? data.createdAt ?? ""),
  };
}

/** @returns {Promise<AuditEntry[]>} */
export async function listAuditEntries() {
  const rows = await store.list();
  return rows.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
}

/** @param {number} [limit] */
export async function listRecentAuditEntries(limit = 50) {
  const rows = await listAuditEntries();
  return rows.slice(0, limit);
}

/**
 * @param {{
 *   action: string,
 *   entityType: string,
 *   entityId: string,
 *   entityLabel?: string,
 *   actorName?: string,
 *   actorUid?: string,
 *   details?: string,
 * }} input
 */
export async function writeAuditEntry(input) {
  await store.create({
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel ?? "",
    actorName: input.actorName ?? "System",
    actorUid: input.actorUid ?? "",
    details: input.details ?? "",
    timestamp: new Date().toISOString(),
  });
}

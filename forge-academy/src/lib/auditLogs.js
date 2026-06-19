import { addDoc, collection, getDocs, limit, query, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

/**
 * @typedef {Object} AuditLogRecord
 * @property {string} id
 * @property {string} action
 * @property {string} entityType
 * @property {string} entityId
 * @property {Record<string, unknown>} details
 * @property {string} userId
 * @property {import('firebase/firestore').Timestamp | null} createdAt
 */

const auditLogsRef = collection(db, "auditLogs");

function mapAuditLog(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    action: data.action ?? "",
    entityType: data.entityType ?? "",
    entityId: data.entityId ?? "",
    details: data.details && typeof data.details === "object" ? data.details : {},
    userId: data.userId ?? "",
    createdAt: data.createdAt ?? null,
  };
}

/**
 * @param {{
 *   action: string,
 *   entityType: string,
 *   entityId?: string,
 *   details?: Record<string, unknown>,
 *   userId: string,
 * }} input
 */
export async function writeAuditLog(input) {
  if (!input.action?.trim()) return;
  await addDoc(auditLogsRef, {
    action: input.action.trim(),
    entityType: input.entityType ?? "",
    entityId: input.entityId ?? "",
    details: input.details ?? {},
    userId: input.userId ?? "",
    createdAt: serverTimestamp(),
  });
}

/** @param {number} [maxRows] */
export async function listRecentAuditLogs(maxRows = 100) {
  const snap = await getDocs(query(auditLogsRef, limit(maxRows)));
  return snap.docs
    .map((item) => mapAuditLog(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => {
      const aMs = a.createdAt?.toMillis?.() ?? 0;
      const bMs = b.createdAt?.toMillis?.() ?? 0;
      return bMs - aMs;
    });
}

const TESTING_AUDIT_ACTIONS = new Set([
  "manual_grade_entered",
  "score_override",
  "remediation_completed",
  "retest_requested",
  "retest_approved",
  "retest_denied",
  "certificate_released",
  "certificate_held",
  "certificate_denied",
  "state_certification_recorded",
  "challenge_test_requested",
  "challenge_test_approved",
  "challenge_test_denied",
  "challenge_test_completed",
  "test_published",
  "test_assignment_created",
  "lms_settings_updated",
  "lms_completions_imported",
  "lms_eligibility_synced",
  "lms_grade_passback_queued",
  "system_settings_updated",
]);

/** @param {{ maxRows?: number, actionFilter?: string, entityTypeFilter?: string }} [options] */
export async function listTestingAuditLogs(options = {}) {
  const { maxRows = 250, actionFilter = "", entityTypeFilter = "" } = options;
  const rows = await listRecentAuditLogs(maxRows);
  return rows.filter((row) => {
    if (actionFilter && row.action !== actionFilter) return false;
    if (entityTypeFilter && row.entityType !== entityTypeFilter) return false;
    if (!actionFilter && !entityTypeFilter) {
      return (
        TESTING_AUDIT_ACTIONS.has(row.action) ||
        row.entityType.toLowerCase().includes("test") ||
        row.entityType.toLowerCase().includes("certificate") ||
        row.entityType.toLowerCase().includes("challenge") ||
        row.entityType.toLowerCase().includes("lms") ||
        row.entityType === "systemSettings"
      );
    }
    return true;
  });
}

export const AUDIT_ACTION_LABELS = {
  manual_grade_entered: "Manual grade entered",
  score_override: "Score override",
  remediation_completed: "Remediation completed",
  retest_requested: "Retest requested",
  retest_approved: "Retest approved",
  retest_denied: "Retest denied",
  certificate_released: "Certificate released",
  certificate_held: "Certificate held",
  certificate_denied: "Certificate denied",
  state_certification_recorded: "State certification recorded",
  challenge_test_requested: "Challenge test requested",
  challenge_test_approved: "Challenge test approved",
  challenge_test_denied: "Challenge test denied",
  challenge_test_completed: "Challenge test completed",
  lms_settings_updated: "LMS settings updated",
  lms_completions_imported: "LMS completions imported",
  lms_eligibility_synced: "LMS eligibility synced",
  lms_grade_passback_queued: "LMS grade passback queued",
  system_settings_updated: "System settings updated",
};

function formatAuditTimestamp(createdAt) {
  if (createdAt?.toDate) return createdAt.toDate().toISOString();
  return "";
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

/** @param {AuditLogRecord[]} rows */
export function downloadAuditLogsCsv(filename, rows) {
  const headers = ["Timestamp", "Action", "Action Label", "Entity Type", "Entity ID", "User ID", "Details JSON"];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        formatAuditTimestamp(row.createdAt),
        row.action,
        AUDIT_ACTION_LABELS[row.action] ?? row.action,
        row.entityType,
        row.entityId,
        row.userId,
        JSON.stringify(row.details ?? {}),
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** @param {{ maxRows?: number, actionFilter?: string, entityTypeFilter?: string }} [options] */
export async function exportTestingAuditLogsCsv(options = {}) {
  const rows = await listTestingAuditLogs(options);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadAuditLogsCsv(`testing-audit-log-${stamp}.csv`, rows);
  return rows.length;
}

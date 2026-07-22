import { createStore } from "./dataStore.js";

export const RECORD_STATUSES = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const RECORD_STATUS_LABELS = {
  [RECORD_STATUSES.DRAFT]: "Draft",
  [RECORD_STATUSES.SUBMITTED]: "Submitted",
  [RECORD_STATUSES.APPROVED]: "Approved",
  [RECORD_STATUSES.REJECTED]: "Rejected",
};

/**
 * @typedef {Object} MaintenanceRecord
 * @property {string} id
 * @property {string} moduleId
 * @property {string} moduleName
 * @property {string} moduleKind
 * @property {string} apparatusId
 * @property {string} apparatusName
 * @property {string} equipmentId
 * @property {string} equipmentName
 * @property {string} workOrderId
 * @property {string} scheduleId
 * @property {string} status
 * @property {string} performedBy
 * @property {string} performedByName
 * @property {string} rmsPersonId
 * @property {string} performedDate
 * @property {number} mileageAtService
 * @property {number} hoursAtService
 * @property {Object} values
 * @property {string} notes
 * @property {boolean} passed
 */

const store = createStore("maintenanceRecords", mapRecord);

function mapRecord(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    moduleId: String(data.moduleId ?? ""),
    moduleName: String(data.moduleName ?? ""),
    moduleKind: String(data.moduleKind ?? ""),
    apparatusId: String(data.apparatusId ?? ""),
    apparatusName: String(data.apparatusName ?? ""),
    equipmentId: String(data.equipmentId ?? ""),
    equipmentName: String(data.equipmentName ?? ""),
    workOrderId: String(data.workOrderId ?? ""),
    scheduleId: String(data.scheduleId ?? ""),
    status: data.status ?? RECORD_STATUSES.DRAFT,
    performedBy: String(data.performedBy ?? ""),
    performedByName: String(data.performedByName ?? ""),
    rmsPersonId: String(data.rmsPersonId ?? ""),
    performedDate: String(data.performedDate ?? ""),
    mileageAtService: Number(data.mileageAtService ?? 0),
    hoursAtService: Number(data.hoursAtService ?? 0),
    values: data.values && typeof data.values === "object" ? data.values : {},
    notes: String(data.notes ?? ""),
    passed: Boolean(data.passed),
  };
}

/** @returns {Promise<MaintenanceRecord[]>} */
export async function listMaintenanceRecords() {
  const rows = await store.list();
  return rows.sort((a, b) => (b.performedDate || "").localeCompare(a.performedDate || ""));
}

/** @param {string} recordId */
export async function getMaintenanceRecord(recordId) {
  return store.get(recordId);
}

/** @param {string} apparatusId */
export async function listRecordsByApparatus(apparatusId) {
  const rows = await store.list();
  return rows.filter((r) => r.apparatusId === apparatusId);
}

/** @param {string} moduleId */
export async function listRecordsByModule(moduleId) {
  const rows = await store.list();
  return rows.filter((r) => r.moduleId === moduleId);
}

/** @param {Omit<MaintenanceRecord, 'id'>} input */
export async function createMaintenanceRecord(input) {
  validateRecord(input);
  const today = new Date().toISOString().slice(0, 10);
  return store.create({
    ...input,
    performedDate: input.performedDate || today,
    status: input.status || RECORD_STATUSES.SUBMITTED,
  });
}

/** @param {string} recordId @param {Partial<MaintenanceRecord>} input */
export async function updateMaintenanceRecord(recordId, input) {
  validateRecord(input, { partial: true });
  await store.update(recordId, input);
}

/** @param {string} recordId */
export async function deleteMaintenanceRecord(recordId) {
  await store.remove(recordId);
}

/** @param {string} recordId */
export async function approveMaintenanceRecord(recordId) {
  await store.update(recordId, { status: RECORD_STATUSES.APPROVED });
}

/** @param {Partial<MaintenanceRecord>} input @param {{ partial?: boolean }} [options] */
function validateRecord(input, options = {}) {
  const { partial = false } = options;
  if (!partial || input.moduleId != null) {
    if (!String(input.moduleId ?? "").trim()) throw new Error("Maintenance template is required.");
  }
}

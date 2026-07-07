import { createStore } from "./dataStore.js";

export const WORK_ORDER_PRIORITIES = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  CRITICAL: "critical",
};

export const WORK_ORDER_PRIORITY_LABELS = {
  [WORK_ORDER_PRIORITIES.LOW]: "Low",
  [WORK_ORDER_PRIORITIES.NORMAL]: "Normal",
  [WORK_ORDER_PRIORITIES.HIGH]: "High",
  [WORK_ORDER_PRIORITIES.CRITICAL]: "Critical",
};

export const WORK_ORDER_STATUSES = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  ON_HOLD: "on_hold",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const WORK_ORDER_STATUS_LABELS = {
  [WORK_ORDER_STATUSES.OPEN]: "Open",
  [WORK_ORDER_STATUSES.IN_PROGRESS]: "In Progress",
  [WORK_ORDER_STATUSES.ON_HOLD]: "On Hold",
  [WORK_ORDER_STATUSES.COMPLETED]: "Completed",
  [WORK_ORDER_STATUSES.CANCELLED]: "Cancelled",
};

export const WORK_ORDER_TYPES = {
  PREVENTIVE: "preventive",
  CORRECTIVE: "corrective",
  INSPECTION: "inspection",
  EMERGENCY: "emergency",
};

export const WORK_ORDER_TYPE_LABELS = {
  [WORK_ORDER_TYPES.PREVENTIVE]: "Preventive",
  [WORK_ORDER_TYPES.CORRECTIVE]: "Corrective",
  [WORK_ORDER_TYPES.INSPECTION]: "Inspection",
  [WORK_ORDER_TYPES.EMERGENCY]: "Emergency",
};

/**
 * @typedef {Object} WorkOrderRecord
 * @property {string} id
 * @property {string} workOrderNumber
 * @property {string} title
 * @property {string} description
 * @property {string} type
 * @property {string} priority
 * @property {string} status
 * @property {string} apparatusId
 * @property {string} apparatusName
 * @property {string} equipmentId
 * @property {string} equipmentName
 * @property {string} scheduleId
 * @property {string} moduleId
 * @property {string} assignedTo
 * @property {string} assignedToName
 * @property {string} reportedBy
 * @property {string} reportedByName
 * @property {string} rmsPersonId
 * @property {string} openedDate
 * @property {string} dueDate
 * @property {string} completedDate
 * @property {number} estimatedCost
 * @property {number} actualCost
 * @property {string} vendor
 * @property {string} notes
 */

const store = createStore("workOrders", mapWorkOrder);

let workOrderCounter = 1000;

function mapWorkOrder(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    workOrderNumber: String(data.workOrderNumber ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    type: data.type ?? WORK_ORDER_TYPES.CORRECTIVE,
    priority: data.priority ?? WORK_ORDER_PRIORITIES.NORMAL,
    status: data.status ?? WORK_ORDER_STATUSES.OPEN,
    apparatusId: String(data.apparatusId ?? ""),
    apparatusName: String(data.apparatusName ?? ""),
    equipmentId: String(data.equipmentId ?? ""),
    equipmentName: String(data.equipmentName ?? ""),
    scheduleId: String(data.scheduleId ?? ""),
    moduleId: String(data.moduleId ?? ""),
    assignedTo: String(data.assignedTo ?? ""),
    assignedToName: String(data.assignedToName ?? ""),
    reportedBy: String(data.reportedBy ?? ""),
    reportedByName: String(data.reportedByName ?? ""),
    rmsPersonId: String(data.rmsPersonId ?? ""),
    openedDate: String(data.openedDate ?? ""),
    dueDate: String(data.dueDate ?? ""),
    completedDate: String(data.completedDate ?? ""),
    estimatedCost: Number(data.estimatedCost ?? 0),
    actualCost: Number(data.actualCost ?? 0),
    vendor: String(data.vendor ?? ""),
    notes: String(data.notes ?? ""),
  };
}

/** @returns {Promise<WorkOrderRecord[]>} */
export async function listWorkOrders() {
  const rows = await store.list();
  return rows.sort((a, b) => (b.openedDate || "").localeCompare(a.openedDate || ""));
}

/** @param {string} workOrderId */
export async function getWorkOrder(workOrderId) {
  return store.get(workOrderId);
}

/** @param {string} status */
export async function listWorkOrdersByStatus(status) {
  const rows = await store.list();
  return rows.filter((w) => w.status === status);
}

/** @param {string} apparatusId */
export async function listWorkOrdersByApparatus(apparatusId) {
  const rows = await store.list();
  return rows.filter((w) => w.apparatusId === apparatusId);
}

function generateWorkOrderNumber() {
  workOrderCounter += 1;
  const year = new Date().getFullYear();
  return `WO-${year}-${String(workOrderCounter).padStart(4, "0")}`;
}

/** @param {Omit<WorkOrderRecord, 'id' | 'workOrderNumber'>} input */
export async function createWorkOrder(input) {
  validateWorkOrder(input);
  const today = new Date().toISOString().slice(0, 10);
  return store.create({
    ...input,
    workOrderNumber: generateWorkOrderNumber(),
    openedDate: input.openedDate || today,
    status: input.status || WORK_ORDER_STATUSES.OPEN,
  });
}

/** @param {string} workOrderId @param {Partial<WorkOrderRecord>} input */
export async function updateWorkOrder(workOrderId, input) {
  validateWorkOrder(input, { partial: true });
  await store.update(workOrderId, input);
}

/** @param {string} workOrderId */
export async function deleteWorkOrder(workOrderId) {
  await store.remove(workOrderId);
}

/** @param {string} workOrderId */
export async function completeWorkOrder(workOrderId) {
  const today = new Date().toISOString().slice(0, 10);
  await store.update(workOrderId, {
    status: WORK_ORDER_STATUSES.COMPLETED,
    completedDate: today,
  });
}

/** @param {Partial<WorkOrderRecord>} input @param {{ partial?: boolean }} [options] */
function validateWorkOrder(input, options = {}) {
  const { partial = false } = options;
  if (!partial || input.title != null) {
    if (!String(input.title ?? "").trim()) throw new Error("Work order title is required.");
  }
}

import { createStore } from "./dataStore.js";

export const SCHEDULE_FREQUENCIES = {
  DAILY: "daily",
  WEEKLY: "weekly",
  BIWEEKLY: "biweekly",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  SEMIANNUAL: "semiannual",
  ANNUAL: "annual",
  MILEAGE: "mileage",
  HOURS: "hours",
  CUSTOM: "custom",
};

export const SCHEDULE_FREQUENCY_LABELS = {
  [SCHEDULE_FREQUENCIES.DAILY]: "Daily",
  [SCHEDULE_FREQUENCIES.WEEKLY]: "Weekly",
  [SCHEDULE_FREQUENCIES.BIWEEKLY]: "Bi-weekly",
  [SCHEDULE_FREQUENCIES.MONTHLY]: "Monthly",
  [SCHEDULE_FREQUENCIES.QUARTERLY]: "Quarterly",
  [SCHEDULE_FREQUENCIES.SEMIANNUAL]: "Semi-annual",
  [SCHEDULE_FREQUENCIES.ANNUAL]: "Annual",
  [SCHEDULE_FREQUENCIES.MILEAGE]: "By Mileage",
  [SCHEDULE_FREQUENCIES.HOURS]: "By Hours",
  [SCHEDULE_FREQUENCIES.CUSTOM]: "Custom",
};

export const SCHEDULE_STATUSES = {
  ACTIVE: "active",
  PAUSED: "paused",
  INACTIVE: "inactive",
};

export const SCHEDULE_STATUS_LABELS = {
  [SCHEDULE_STATUSES.ACTIVE]: "Active",
  [SCHEDULE_STATUSES.PAUSED]: "Paused",
  [SCHEDULE_STATUSES.INACTIVE]: "Inactive",
};

/**
 * @typedef {Object} MaintenanceScheduleRecord
 * @property {string} id
 * @property {string} name
 * @property {string} moduleId
 * @property {string} moduleName
 * @property {string} apparatusId
 * @property {string} apparatusName
 * @property {string} equipmentId
 * @property {string} equipmentName
 * @property {string} frequency
 * @property {number} intervalDays
 * @property {number} intervalMileage
 * @property {number} intervalHours
 * @property {string} lastCompletedDate
 * @property {string} nextDueDate
 * @property {number} lastCompletedMileage
 * @property {number} nextDueMileage
 * @property {number} lastCompletedHours
 * @property {number} nextDueHours
 * @property {string} status
 * @property {string} notes
 */

const store = createStore("maintenanceSchedules", mapSchedule);

function mapSchedule(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    name: String(data.name ?? ""),
    moduleId: String(data.moduleId ?? ""),
    moduleName: String(data.moduleName ?? ""),
    apparatusId: String(data.apparatusId ?? ""),
    apparatusName: String(data.apparatusName ?? ""),
    equipmentId: String(data.equipmentId ?? ""),
    equipmentName: String(data.equipmentName ?? ""),
    frequency: data.frequency ?? SCHEDULE_FREQUENCIES.MONTHLY,
    intervalDays: Number(data.intervalDays ?? 30),
    intervalMileage: Number(data.intervalMileage ?? 0),
    intervalHours: Number(data.intervalHours ?? 0),
    lastCompletedDate: String(data.lastCompletedDate ?? ""),
    nextDueDate: String(data.nextDueDate ?? ""),
    lastCompletedMileage: Number(data.lastCompletedMileage ?? 0),
    nextDueMileage: Number(data.nextDueMileage ?? 0),
    lastCompletedHours: Number(data.lastCompletedHours ?? 0),
    nextDueHours: Number(data.nextDueHours ?? 0),
    status: data.status ?? SCHEDULE_STATUSES.ACTIVE,
    notes: String(data.notes ?? ""),
  };
}

/** @returns {Promise<MaintenanceScheduleRecord[]>} */
export async function listMaintenanceSchedules() {
  const rows = await store.list();
  return rows.sort((a, b) => (a.nextDueDate || "9999").localeCompare(b.nextDueDate || "9999"));
}

/** @param {string} scheduleId */
export async function getMaintenanceSchedule(scheduleId) {
  return store.get(scheduleId);
}

/** @param {string} apparatusId */
export async function listSchedulesByApparatus(apparatusId) {
  const rows = await store.list();
  return rows.filter((s) => s.apparatusId === apparatusId);
}

/** @param {MaintenanceScheduleRecord} schedule */
export function getScheduleDueStatus(schedule) {
  const today = new Date().toISOString().slice(0, 10);
  if (!schedule.nextDueDate) return "scheduled";
  if (schedule.nextDueDate < today) return "overdue";
  const dueDate = new Date(schedule.nextDueDate);
  const now = new Date(today);
  const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return "due_soon";
  return "scheduled";
}

/** @param {Omit<MaintenanceScheduleRecord, 'id'>} input */
export async function createMaintenanceSchedule(input) {
  validateSchedule(input);
  const nextDueDate = input.nextDueDate || computeNextDueDate(input.frequency, input.intervalDays);
  return store.create({
    ...input,
    nextDueDate,
  });
}

/** @param {string} scheduleId @param {Partial<MaintenanceScheduleRecord>} input */
export async function updateMaintenanceSchedule(scheduleId, input) {
  validateSchedule(input, { partial: true });
  await store.update(scheduleId, input);
}

/** @param {string} scheduleId */
export async function deleteMaintenanceSchedule(scheduleId) {
  await store.remove(scheduleId);
}

/** @param {string} scheduleId @param {string} completedDate */
export async function markScheduleCompleted(scheduleId, completedDate) {
  const schedule = await store.get(scheduleId);
  if (!schedule) throw new Error("Schedule not found.");
  const nextDueDate = computeNextDueDate(schedule.frequency, schedule.intervalDays, completedDate);
  await store.update(scheduleId, {
    lastCompletedDate: completedDate,
    nextDueDate,
  });
}

/** @param {string} frequency @param {number} intervalDays @param {string} [fromDate] */
export function computeNextDueDate(frequency, intervalDays, fromDate) {
  const base = fromDate ? new Date(fromDate) : new Date();
  const days = {
    [SCHEDULE_FREQUENCIES.DAILY]: 1,
    [SCHEDULE_FREQUENCIES.WEEKLY]: 7,
    [SCHEDULE_FREQUENCIES.BIWEEKLY]: 14,
    [SCHEDULE_FREQUENCIES.MONTHLY]: 30,
    [SCHEDULE_FREQUENCIES.QUARTERLY]: 90,
    [SCHEDULE_FREQUENCIES.SEMIANNUAL]: 180,
    [SCHEDULE_FREQUENCIES.ANNUAL]: 365,
  }[frequency] ?? intervalDays ?? 30;

  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

/** @param {Partial<MaintenanceScheduleRecord>} input @param {{ partial?: boolean }} [options] */
function validateSchedule(input, options = {}) {
  const { partial = false } = options;
  if (!partial || input.name != null) {
    if (!String(input.name ?? "").trim()) throw new Error("Schedule name is required.");
  }
  if (!partial || input.moduleId != null) {
    if (!String(input.moduleId ?? "").trim()) throw new Error("Maintenance template is required.");
  }
}

/**
 * RMS integration layer — export payloads and API contract stubs.
 * Designed for future integration with Forge RMS (separate Firebase project).
 *
 * @see forge-fleet/docs/RMS_INTEGRATION.md
 */

/**
 * @typedef {Object} RmsApparatusExport
 * @property {string} rmsApparatusId
 * @property {string} unitNumber
 * @property {string} name
 * @property {string} status
 * @property {string} rmsDepartmentId
 * @property {string} rmsStationId
 * @property {number} mileage
 * @property {number} pumpHours
 * @property {string} lastMaintenanceDate
 * @property {string} nextMaintenanceDue
 */

/**
 * @typedef {Object} RmsMaintenanceWebhookPayload
 * @property {string} event
 * @property {string} timestamp
 * @property {string} rmsDepartmentId
 * @property {Object} data
 */

const RMS_API_BASE = import.meta.env.VITE_RMS_API_BASE_URL ?? "";
const RMS_SECRET = import.meta.env.VITE_RMS_INTEGRATION_SECRET ?? "";

export const RMS_WEBHOOK_EVENTS = {
  APPARATUS_STATUS_CHANGED: "apparatus.status_changed",
  WORK_ORDER_CREATED: "work_order.created",
  WORK_ORDER_COMPLETED: "work_order.completed",
  MAINTENANCE_RECORD_SUBMITTED: "maintenance_record.submitted",
  SCHEDULE_OVERDUE: "schedule.overdue",
};

/**
 * @param {import('./apparatus.js').ApparatusRecord} apparatus
 * @param {{ lastMaintenanceDate?: string, nextMaintenanceDue?: string }} [maintenance]
 * @returns {RmsApparatusExport}
 */
export function toRmsApparatusExport(apparatus, maintenance = {}) {
  return {
    rmsApparatusId: apparatus.rmsApparatusId || apparatus.id,
    unitNumber: apparatus.unitNumber,
    name: apparatus.name,
    status: mapApparatusStatusToRms(apparatus.status),
    rmsDepartmentId: apparatus.departmentId,
    rmsStationId: apparatus.stationId,
    mileage: apparatus.mileage,
    pumpHours: apparatus.pumpHours,
    lastMaintenanceDate: maintenance.lastMaintenanceDate ?? "",
    nextMaintenanceDue: maintenance.nextMaintenanceDue ?? "",
  };
}

/** @param {string} fleetStatus */
export function mapApparatusStatusToRms(fleetStatus) {
  const map = {
    in_service: "available",
    out_of_service: "out",
    maintenance: "maintenance",
    reserve: "reserve",
    retired: "retired",
  };
  return map[fleetStatus] ?? "available";
}

/** @param {string} rmsStatus */
export function mapRmsStatusToApparatus(rmsStatus) {
  const map = {
    available: "in_service",
    out: "out_of_service",
    maintenance: "maintenance",
    reserve: "reserve",
    retired: "retired",
  };
  return map[rmsStatus] ?? "in_service";
}

/**
 * @param {string} event
 * @param {string} rmsDepartmentId
 * @param {Object} data
 * @returns {RmsMaintenanceWebhookPayload}
 */
export function buildWebhookPayload(event, rmsDepartmentId, data) {
  return {
    event,
    timestamp: new Date().toISOString(),
    rmsDepartmentId,
    data,
  };
}

/**
 * Send webhook to RMS (no-op in local mode; logs to console).
 * @param {RmsMaintenanceWebhookPayload} payload
 */
export async function sendRmsWebhook(payload) {
  if (!RMS_API_BASE || !RMS_SECRET) {
    console.info("[Forge Fleet] RMS webhook (local mode):", payload);
    return { ok: true, local: true };
  }

  try {
    const response = await fetch(`${RMS_API_BASE}/v1/webhooks/fleet-maintenance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Integration-Secret": RMS_SECRET,
      },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    console.error("[Forge Fleet] RMS webhook failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Export full fleet snapshot for RMS sync.
 * @param {Object} data
 */
export function buildFleetSyncPayload(data) {
  const { departments, stations, apparatus, equipment, schedules, workOrders, records } = data;
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    source: "forge-fleet",
    departments: departments.map((d) => ({
      id: d.id,
      rmsDepartmentId: d.rmsDepartmentId || d.id,
      name: d.name,
      fdid: d.fdid,
      status: d.status,
    })),
    stations: stations.map((s) => ({
      id: s.id,
      rmsStationId: s.rmsStationId || s.id,
      name: s.name,
      rmsDepartmentId: s.departmentId,
    })),
    apparatus: apparatus.map((a) => toRmsApparatusExport(a)),
    equipment: equipment.map((e) => ({
      id: e.id,
      name: e.name,
      sku: e.sku,
      serialNumber: e.serialNumber,
      apparatusId: e.apparatusId,
      rmsDepartmentId: e.departmentId,
      status: e.status,
      quantity: e.quantity,
      parLevel: e.parLevel,
    })),
    schedules: schedules.map((s) => ({
      id: s.id,
      name: s.name,
      apparatusId: s.apparatusId,
      moduleId: s.moduleId,
      nextDueDate: s.nextDueDate,
      status: s.status,
    })),
    openWorkOrders: workOrders
      .filter((w) => w.status !== "completed" && w.status !== "cancelled")
      .map((w) => ({
        id: w.id,
        workOrderNumber: w.workOrderNumber,
        title: w.title,
        status: w.status,
        priority: w.priority,
        apparatusId: w.apparatusId,
      })),
    recentRecords: records.slice(0, 100).map((r) => ({
      id: r.id,
      moduleId: r.moduleId,
      apparatusId: r.apparatusId,
      performedDate: r.performedDate,
      status: r.status,
      passed: r.passed,
    })),
  };
}

/**
 * Download fleet sync payload as JSON file.
 * @param {Object} data
 */
export function downloadFleetSyncExport(data) {
  const payload = buildFleetSyncPayload(data);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `forge-fleet-sync-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

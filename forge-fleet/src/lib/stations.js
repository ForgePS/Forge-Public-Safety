import { createStore } from "./dataStore.js";

export const STATION_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const STATION_STATUS_LABELS = {
  [STATION_STATUSES.ACTIVE]: "Active",
  [STATION_STATUSES.INACTIVE]: "Inactive",
};

/**
 * @typedef {Object} StationRecord
 * @property {string} id
 * @property {string} name
 * @property {string} departmentId
 * @property {string} departmentName
 * @property {string} rmsStationId
 * @property {string} address
 * @property {string} status
 * @property {string} notes
 */

const store = createStore("stations", mapStation);

function mapStation(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    name: String(data.name ?? ""),
    departmentId: String(data.departmentId ?? ""),
    departmentName: String(data.departmentName ?? ""),
    rmsStationId: String(data.rmsStationId ?? ""),
    address: String(data.address ?? ""),
    status: data.status ?? STATION_STATUSES.ACTIVE,
    notes: String(data.notes ?? ""),
  };
}

/** @returns {Promise<StationRecord[]>} */
export async function listStations() {
  const rows = await store.list();
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {string} departmentId */
export async function listStationsByDepartment(departmentId) {
  const rows = await store.list();
  return rows
    .filter((s) => s.departmentId === departmentId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {string} stationId */
export async function getStation(stationId) {
  return store.get(stationId);
}

/** @param {Omit<StationRecord, 'id'>} input */
export async function createStation(input) {
  validateStation(input);
  return store.create({
    name: input.name.trim(),
    departmentId: input.departmentId,
    departmentName: input.departmentName?.trim() ?? "",
    rmsStationId: input.rmsStationId?.trim() ?? "",
    address: input.address?.trim() ?? "",
    status: input.status || STATION_STATUSES.ACTIVE,
    notes: input.notes?.trim() ?? "",
  });
}

/** @param {string} stationId @param {Partial<StationRecord>} input */
export async function updateStation(stationId, input) {
  validateStation(input, { partial: true });
  const payload = {};
  if (input.name != null) payload.name = input.name.trim();
  if (input.departmentId != null) payload.departmentId = input.departmentId;
  if (input.departmentName != null) payload.departmentName = input.departmentName.trim();
  if (input.rmsStationId != null) payload.rmsStationId = input.rmsStationId.trim();
  if (input.address != null) payload.address = input.address.trim();
  if (input.status != null) payload.status = input.status;
  if (input.notes != null) payload.notes = input.notes.trim();
  await store.update(stationId, payload);
}

/** @param {string} stationId */
export async function deleteStation(stationId) {
  await store.remove(stationId);
}

/** @param {Partial<StationRecord>} input @param {{ partial?: boolean }} [options] */
function validateStation(input, options = {}) {
  const { partial = false } = options;
  if (!partial || input.name != null) {
    if (!String(input.name ?? "").trim()) throw new Error("Station name is required.");
  }
  if (!partial || input.departmentId != null) {
    if (!String(input.departmentId ?? "").trim()) throw new Error("Department is required.");
  }
}

import { createStore } from "./dataStore.js";

export const APPARATUS_TYPES = {
  ENGINE: "engine",
  LADDER: "ladder",
  RESCUE: "rescue",
  TANKER: "tanker",
  BRUSH: "brush",
  AMBULANCE: "ambulance",
  CHIEF: "chief",
  UTILITY: "utility",
  OTHER: "other",
};

export const APPARATUS_TYPE_LABELS = {
  [APPARATUS_TYPES.ENGINE]: "Engine",
  [APPARATUS_TYPES.LADDER]: "Ladder",
  [APPARATUS_TYPES.RESCUE]: "Rescue",
  [APPARATUS_TYPES.TANKER]: "Tanker",
  [APPARATUS_TYPES.BRUSH]: "Brush",
  [APPARATUS_TYPES.AMBULANCE]: "Ambulance",
  [APPARATUS_TYPES.CHIEF]: "Chief",
  [APPARATUS_TYPES.UTILITY]: "Utility",
  [APPARATUS_TYPES.OTHER]: "Other",
};

export const APPARATUS_STATUSES = {
  IN_SERVICE: "in_service",
  OUT_OF_SERVICE: "out_of_service",
  MAINTENANCE: "maintenance",
  RESERVE: "reserve",
  RETIRED: "retired",
};

export const APPARATUS_STATUS_LABELS = {
  [APPARATUS_STATUSES.IN_SERVICE]: "In Service",
  [APPARATUS_STATUSES.OUT_OF_SERVICE]: "Out of Service",
  [APPARATUS_STATUSES.MAINTENANCE]: "Maintenance",
  [APPARATUS_STATUSES.RESERVE]: "Reserve",
  [APPARATUS_STATUSES.RETIRED]: "Retired",
};

/**
 * @typedef {Object} ApparatusRecord
 * @property {string} id
 * @property {string} unitNumber
 * @property {string} name
 * @property {string} type
 * @property {string} status
 * @property {string} departmentId
 * @property {string} departmentName
 * @property {string} stationId
 * @property {string} stationName
 * @property {string} rmsApparatusId
 * @property {string} vin
 * @property {string} year
 * @property {string} make
 * @property {string} model
 * @property {number} mileage
 * @property {number} pumpHours
 * @property {string} licensePlate
 * @property {string} notes
 */

const store = createStore("apparatus", mapApparatus);

function mapApparatus(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    unitNumber: String(data.unitNumber ?? ""),
    name: String(data.name ?? ""),
    type: data.type ?? APPARATUS_TYPES.ENGINE,
    status: data.status ?? APPARATUS_STATUSES.IN_SERVICE,
    departmentId: String(data.departmentId ?? ""),
    departmentName: String(data.departmentName ?? ""),
    stationId: String(data.stationId ?? ""),
    stationName: String(data.stationName ?? ""),
    rmsApparatusId: String(data.rmsApparatusId ?? ""),
    vin: String(data.vin ?? ""),
    year: String(data.year ?? ""),
    make: String(data.make ?? ""),
    model: String(data.model ?? ""),
    mileage: Number(data.mileage ?? 0),
    pumpHours: Number(data.pumpHours ?? 0),
    licensePlate: String(data.licensePlate ?? ""),
    notes: String(data.notes ?? ""),
  };
}

/** @returns {Promise<ApparatusRecord[]>} */
export async function listApparatus() {
  const rows = await store.list();
  return rows.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }));
}

/** @param {string} apparatusId */
export async function getApparatus(apparatusId) {
  return store.get(apparatusId);
}

/** @param {string} stationId */
export async function listApparatusByStation(stationId) {
  const rows = await store.list();
  return rows.filter((a) => a.stationId === stationId);
}

/** @param {Omit<ApparatusRecord, 'id'>} input */
export async function createApparatus(input) {
  validateApparatus(input);
  return store.create({
    unitNumber: input.unitNumber.trim(),
    name: input.name?.trim() ?? "",
    type: input.type || APPARATUS_TYPES.ENGINE,
    status: input.status || APPARATUS_STATUSES.IN_SERVICE,
    departmentId: input.departmentId,
    departmentName: input.departmentName?.trim() ?? "",
    stationId: input.stationId,
    stationName: input.stationName?.trim() ?? "",
    rmsApparatusId: input.rmsApparatusId?.trim() ?? "",
    vin: input.vin?.trim() ?? "",
    year: input.year?.trim() ?? "",
    make: input.make?.trim() ?? "",
    model: input.model?.trim() ?? "",
    mileage: Number(input.mileage ?? 0),
    pumpHours: Number(input.pumpHours ?? 0),
    licensePlate: input.licensePlate?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
  });
}

/** @param {string} apparatusId @param {Partial<ApparatusRecord>} input */
export async function updateApparatus(apparatusId, input) {
  validateApparatus(input, { partial: true });
  const payload = {};
  const fields = [
    "unitNumber", "name", "type", "status", "departmentId", "departmentName",
    "stationId", "stationName", "rmsApparatusId", "vin", "year", "make",
    "model", "licensePlate", "notes",
  ];
  for (const field of fields) {
    if (input[field] != null) {
      payload[field] = typeof input[field] === "string" ? input[field].trim() : input[field];
    }
  }
  if (input.mileage != null) payload.mileage = Number(input.mileage);
  if (input.pumpHours != null) payload.pumpHours = Number(input.pumpHours);
  await store.update(apparatusId, payload);
}

/** @param {string} apparatusId */
export async function deleteApparatus(apparatusId) {
  await store.remove(apparatusId);
}

/** @param {Partial<ApparatusRecord>} input @param {{ partial?: boolean }} [options] */
function validateApparatus(input, options = {}) {
  const { partial = false } = options;
  if (!partial || input.unitNumber != null) {
    if (!String(input.unitNumber ?? "").trim()) throw new Error("Unit number is required.");
  }
}

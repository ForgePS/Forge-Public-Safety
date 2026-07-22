import { createStore } from "./dataStore.js";

export const EQUIPMENT_CATEGORIES = {
  PPE: "ppe",
  TOOLS: "tools",
  MEDICAL: "medical",
  COMMUNICATIONS: "communications",
  SCBA: "scba",
  HOSE: "hose",
  NOZZLES: "nozzles",
  POWER: "power",
  OTHER: "other",
};

export const EQUIPMENT_CATEGORY_LABELS = {
  [EQUIPMENT_CATEGORIES.PPE]: "PPE",
  [EQUIPMENT_CATEGORIES.TOOLS]: "Tools",
  [EQUIPMENT_CATEGORIES.MEDICAL]: "Medical",
  [EQUIPMENT_CATEGORIES.COMMUNICATIONS]: "Communications",
  [EQUIPMENT_CATEGORIES.SCBA]: "SCBA",
  [EQUIPMENT_CATEGORIES.HOSE]: "Hose",
  [EQUIPMENT_CATEGORIES.NOZZLES]: "Nozzles",
  [EQUIPMENT_CATEGORIES.POWER]: "Power Equipment",
  [EQUIPMENT_CATEGORIES.OTHER]: "Other",
};

export const EQUIPMENT_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  MAINTENANCE: "maintenance",
  RETIRED: "retired",
};

export const EQUIPMENT_STATUS_LABELS = {
  [EQUIPMENT_STATUSES.ACTIVE]: "Active",
  [EQUIPMENT_STATUSES.INACTIVE]: "Inactive",
  [EQUIPMENT_STATUSES.MAINTENANCE]: "Maintenance",
  [EQUIPMENT_STATUSES.RETIRED]: "Retired",
};

/**
 * @typedef {Object} EquipmentRecord
 * @property {string} id
 * @property {string} name
 * @property {string} sku
 * @property {string} serialNumber
 * @property {string} category
 * @property {string} status
 * @property {string} departmentId
 * @property {string} departmentName
 * @property {string} stationId
 * @property {string} stationName
 * @property {string} apparatusId
 * @property {string} apparatusName
 * @property {string} manufacturer
 * @property {string} model
 * @property {string} purchaseDate
 * @property {string} warrantyExpiry
 * @property {number} quantity
 * @property {number} parLevel
 * @property {string} location
 * @property {string} barcode
 * @property {string} notes
 */

const store = createStore("equipment", mapEquipment);

function mapEquipment(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    name: String(data.name ?? ""),
    sku: String(data.sku ?? ""),
    serialNumber: String(data.serialNumber ?? ""),
    category: data.category ?? EQUIPMENT_CATEGORIES.OTHER,
    status: data.status ?? EQUIPMENT_STATUSES.ACTIVE,
    departmentId: String(data.departmentId ?? ""),
    departmentName: String(data.departmentName ?? ""),
    stationId: String(data.stationId ?? ""),
    stationName: String(data.stationName ?? ""),
    apparatusId: String(data.apparatusId ?? ""),
    apparatusName: String(data.apparatusName ?? ""),
    manufacturer: String(data.manufacturer ?? ""),
    model: String(data.model ?? ""),
    purchaseDate: String(data.purchaseDate ?? ""),
    warrantyExpiry: String(data.warrantyExpiry ?? ""),
    quantity: Number(data.quantity ?? 1),
    parLevel: Number(data.parLevel ?? 1),
    location: String(data.location ?? ""),
    barcode: String(data.barcode ?? ""),
    notes: String(data.notes ?? ""),
  };
}

/** @returns {Promise<EquipmentRecord[]>} */
export async function listEquipment() {
  const rows = await store.list();
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {string} equipmentId */
export async function getEquipment(equipmentId) {
  return store.get(equipmentId);
}

/** @param {string} apparatusId */
export async function listEquipmentByApparatus(apparatusId) {
  const rows = await store.list();
  return rows.filter((e) => e.apparatusId === apparatusId);
}

/** @param {Omit<EquipmentRecord, 'id'>} input */
export async function createEquipment(input) {
  validateEquipment(input);
  return store.create({
    name: input.name.trim(),
    sku: input.sku?.trim() ?? "",
    serialNumber: input.serialNumber?.trim() ?? "",
    category: input.category || EQUIPMENT_CATEGORIES.OTHER,
    status: input.status || EQUIPMENT_STATUSES.ACTIVE,
    departmentId: input.departmentId ?? "",
    departmentName: input.departmentName?.trim() ?? "",
    stationId: input.stationId ?? "",
    stationName: input.stationName?.trim() ?? "",
    apparatusId: input.apparatusId ?? "",
    apparatusName: input.apparatusName?.trim() ?? "",
    manufacturer: input.manufacturer?.trim() ?? "",
    model: input.model?.trim() ?? "",
    purchaseDate: input.purchaseDate ?? "",
    warrantyExpiry: input.warrantyExpiry ?? "",
    quantity: Number(input.quantity ?? 1),
    parLevel: Number(input.parLevel ?? 1),
    location: input.location?.trim() ?? "",
    barcode: input.barcode?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
  });
}

/** @param {string} equipmentId @param {Partial<EquipmentRecord>} input */
export async function updateEquipment(equipmentId, input) {
  validateEquipment(input, { partial: true });
  const payload = { ...input };
  if (input.name != null) payload.name = input.name.trim();
  if (input.quantity != null) payload.quantity = Number(input.quantity);
  if (input.parLevel != null) payload.parLevel = Number(input.parLevel);
  await store.update(equipmentId, payload);
}

/** @param {string} equipmentId */
export async function deleteEquipment(equipmentId) {
  await store.remove(equipmentId);
}

/** @param {Partial<EquipmentRecord>} input @param {{ partial?: boolean }} [options] */
function validateEquipment(input, options = {}) {
  const { partial = false } = options;
  if (!partial || input.name != null) {
    if (!String(input.name ?? "").trim()) throw new Error("Equipment name is required.");
  }
}

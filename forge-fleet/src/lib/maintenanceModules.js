import { MODULE_KINDS, MODULE_FIELD_TYPES, defaultModuleDefinition, validateModuleDefinition } from "@forgeps/ai-builder/rms";
import { createStore } from "./dataStore.js";

export { MODULE_KINDS, MODULE_FIELD_TYPES };

export const MODULE_STATUSES = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
};

export const MODULE_STATUS_LABELS = {
  [MODULE_STATUSES.DRAFT]: "Draft",
  [MODULE_STATUSES.PUBLISHED]: "Published",
  [MODULE_STATUSES.ARCHIVED]: "Archived",
};

export const MODULE_KIND_LABELS = {
  checkoff: "Checkoff",
  inventory: "Inventory",
  inspection: "Inspection",
  custom: "Custom",
};

export const SUBJECT_TYPES = {
  APPARATUS: "apparatus",
  EQUIPMENT: "equipment",
  STATION: "station",
};

export const SUBJECT_TYPE_LABELS = {
  [SUBJECT_TYPES.APPARATUS]: "Apparatus",
  [SUBJECT_TYPES.EQUIPMENT]: "Equipment",
  [SUBJECT_TYPES.STATION]: "Station",
};

/**
 * @typedef {Object} MaintenanceModuleRecord
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} kind
 * @property {string} status
 * @property {string} subjectType
 * @property {string[]} departmentIds
 * @property {string[]} stationIds
 * @property {string[]} apparatusIds
 * @property {string[]} roles
 * @property {Object[]} sections
 * @property {Object} rules
 * @property {Object} views
 */

const store = createStore("maintenanceModules", mapModule);

function mapModule(id, data) {
  if (!data || typeof data !== "object") return null;
  const scope = data.scope && typeof data.scope === "object" ? data.scope : {};
  const subject = data.subject && typeof data.subject === "object" ? data.subject : {};
  return {
    id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    kind: data.kind ?? "checkoff",
    status: data.status ?? MODULE_STATUSES.DRAFT,
    subjectType: subject.type ?? SUBJECT_TYPES.APPARATUS,
    departmentIds: Array.isArray(scope.departmentIds) ? scope.departmentIds : [],
    stationIds: Array.isArray(scope.stationIds) ? scope.stationIds : [],
    apparatusIds: Array.isArray(scope.apparatusIds) ? scope.apparatusIds : [],
    roles: Array.isArray(scope.roles) ? scope.roles : ["admin"],
    sections: Array.isArray(data.sections) ? data.sections : [],
    rules: data.rules && typeof data.rules === "object" ? data.rules : {},
    views: data.views && typeof data.views === "object" ? data.views : { listColumns: [], defaultSort: "", filters: [] },
  };
}

/** @returns {Promise<MaintenanceModuleRecord[]>} */
export async function listMaintenanceModules() {
  const rows = await store.list();
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {string} moduleId */
export async function getMaintenanceModule(moduleId) {
  return store.get(moduleId);
}

/** @param {string} status */
export async function listMaintenanceModulesByStatus(status) {
  const rows = await store.list();
  return rows.filter((m) => m.status === status);
}

/** @returns {MaintenanceModuleRecord} */
export function emptyMaintenanceModule() {
  const base = defaultModuleDefinition();
  return {
    id: "",
    name: "",
    description: "",
    kind: base.kind,
    status: MODULE_STATUSES.DRAFT,
    subjectType: SUBJECT_TYPES.APPARATUS,
    departmentIds: [],
    stationIds: [],
    apparatusIds: [],
    roles: ["admin", "maintenance"],
    sections: [
      {
        id: "section-1",
        title: "General",
        items: [
          { key: "inspector", label: "Inspector", type: "text", required: true },
          { key: "date", label: "Date", type: "date", required: true },
        ],
      },
    ],
    rules: {},
    views: { listColumns: ["date", "inspector"], defaultSort: "date", filters: [] },
  };
}

/** @param {Omit<MaintenanceModuleRecord, 'id'>} input */
export async function createMaintenanceModule(input) {
  const definition = toModuleDefinition(input);
  const validation = validateModuleDefinition(definition);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }
  return store.create(definition);
}

/** @param {string} moduleId @param {Partial<MaintenanceModuleRecord>} input */
export async function updateMaintenanceModule(moduleId, input) {
  const existing = await store.get(moduleId);
  if (!existing) throw new Error("Module not found.");
  const merged = { ...existing, ...input };
  const definition = toModuleDefinition(merged);
  const validation = validateModuleDefinition(definition);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }
  await store.update(moduleId, definition);
}

/** @param {string} moduleId */
export async function deleteMaintenanceModule(moduleId) {
  await store.remove(moduleId);
}

/** @param {MaintenanceModuleRecord | Partial<MaintenanceModuleRecord>} record */
export function toModuleDefinition(record) {
  return {
    product: "rms",
    name: record.name ?? "",
    description: record.description ?? "",
    kind: record.kind ?? "checkoff",
    status: record.status === MODULE_STATUSES.PUBLISHED ? "published" : "draft",
    scope: {
      roles: record.roles ?? ["admin"],
      departmentIds: record.departmentIds ?? [],
      stationIds: record.stationIds ?? [],
      apparatusIds: record.apparatusIds ?? [],
    },
    subject: {
      type: record.subjectType ?? SUBJECT_TYPES.APPARATUS,
      label: SUBJECT_TYPE_LABELS[record.subjectType ?? SUBJECT_TYPES.APPARATUS] ?? "Apparatus",
      allowMultiple: false,
    },
    sections: record.sections ?? [],
    rules: record.rules ?? {},
    views: record.views ?? { listColumns: [], defaultSort: "", filters: [] },
  };
}

/** @param {MaintenanceModuleRecord} record */
export function fromModuleRecord(record) {
  return toModuleDefinition(record);
}

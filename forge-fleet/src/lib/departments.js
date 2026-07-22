import { createStore } from "./dataStore.js";

export const DEPARTMENT_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const DEPARTMENT_STATUS_LABELS = {
  [DEPARTMENT_STATUSES.ACTIVE]: "Active",
  [DEPARTMENT_STATUSES.INACTIVE]: "Inactive",
};

/**
 * @typedef {Object} DepartmentRecord
 * @property {string} id
 * @property {string} name
 * @property {string} fdid
 * @property {string} rmsDepartmentId
 * @property {string} status
 * @property {string} address
 * @property {string} phone
 * @property {string} notes
 */

const store = createStore("departments", mapDepartment);

function mapDepartment(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    name: String(data.name ?? ""),
    fdid: String(data.fdid ?? ""),
    rmsDepartmentId: String(data.rmsDepartmentId ?? ""),
    status: data.status ?? DEPARTMENT_STATUSES.ACTIVE,
    address: String(data.address ?? ""),
    phone: String(data.phone ?? ""),
    notes: String(data.notes ?? ""),
  };
}

/** @returns {Promise<DepartmentRecord[]>} */
export async function listDepartments() {
  const rows = await store.list();
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {string} departmentId */
export async function getDepartment(departmentId) {
  return store.get(departmentId);
}

/** @param {Omit<DepartmentRecord, 'id'>} input */
export async function createDepartment(input) {
  validateDepartment(input);
  return store.create({
    name: input.name.trim(),
    fdid: input.fdid?.trim() ?? "",
    rmsDepartmentId: input.rmsDepartmentId?.trim() ?? "",
    status: input.status || DEPARTMENT_STATUSES.ACTIVE,
    address: input.address?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
  });
}

/** @param {string} departmentId @param {Partial<DepartmentRecord>} input */
export async function updateDepartment(departmentId, input) {
  validateDepartment(input, { partial: true });
  const payload = {};
  if (input.name != null) payload.name = input.name.trim();
  if (input.fdid != null) payload.fdid = input.fdid.trim();
  if (input.rmsDepartmentId != null) payload.rmsDepartmentId = input.rmsDepartmentId.trim();
  if (input.status != null) payload.status = input.status;
  if (input.address != null) payload.address = input.address.trim();
  if (input.phone != null) payload.phone = input.phone.trim();
  if (input.notes != null) payload.notes = input.notes.trim();
  await store.update(departmentId, payload);
}

/** @param {string} departmentId */
export async function deleteDepartment(departmentId) {
  await store.remove(departmentId);
}

/** @param {Partial<DepartmentRecord>} input @param {{ partial?: boolean }} [options] */
function validateDepartment(input, options = {}) {
  const { partial = false } = options;
  if (!partial || input.name != null) {
    if (!String(input.name ?? "").trim()) throw new Error("Department name is required.");
  }
}

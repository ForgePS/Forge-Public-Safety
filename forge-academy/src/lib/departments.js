import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";

export const DEPARTMENT_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

/**
 * @typedef {Object} DepartmentRecord
 * @property {string} id
 * @property {string} name
 * @property {string} fdid
 * @property {string} address
 * @property {string} city
 * @property {string} state
 * @property {string} zip
 * @property {string} county
 * @property {string} region
 * @property {string} departmentType
 * @property {string} chiefName
 * @property {string} chiefEmail
 * @property {string} chiefPhone
 * @property {string} trainingOfficerName
 * @property {string} trainingOfficerEmail
 * @property {string} trainingOfficerPhone
 * @property {string} status
 * @property {import('firebase/firestore').Timestamp | null} createdAt
 * @property {import('firebase/firestore').Timestamp | null} updatedAt
 */

const departmentsRef = collection(db, "departments");

/**
 * @param {unknown} data
 * @returns {DepartmentRecord | null}
 */
export function mapDepartment(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    name: data.name ?? "",
    fdid: data.fdid ?? "",
    address: data.address ?? "",
    city: data.city ?? "",
    state: data.state ?? "AR",
    zip: data.zip ?? "",
    county: data.county ?? "",
    region: data.region ?? "",
    departmentType: data.departmentType ?? "",
    chiefName: data.chiefName ?? "",
    chiefEmail: data.chiefEmail ?? "",
    chiefPhone: normalizePhone(data.chiefPhone ?? ""),
    trainingOfficerName: data.trainingOfficerName ?? "",
    trainingOfficerEmail: data.trainingOfficerEmail ?? "",
    trainingOfficerPhone: normalizePhone(data.trainingOfficerPhone ?? ""),
    status: data.status ?? DEPARTMENT_STATUSES.ACTIVE,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

/** @returns {Promise<DepartmentRecord[]>} */
export async function listDepartments() {
  const snap = await getDocs(query(departmentsRef));
  return snap.docs
    .map((item) => mapDepartment(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @returns {Promise<DepartmentRecord[]>} */
export async function listActiveDepartments() {
  const departments = await listDepartments();
  return departments.filter((department) => department.status === DEPARTMENT_STATUSES.ACTIVE);
}

/** @returns {Promise<DepartmentRecord | null>} */
export async function getDepartment(departmentId) {
  const snap = await getDoc(doc(db, "departments", departmentId));
  if (!snap.exists()) return null;
  return mapDepartment(snap.id, snap.data());
}

/**
 * @param {Omit<DepartmentRecord, 'id' | 'createdAt' | 'updatedAt'>} input
 */
export async function createDepartment(input) {
  const payload = sanitizeDepartmentPayload(input);
  validateDepartmentPayload(payload);

  const fdidMatches = await findByFdid(payload.fdid);
  if (fdidMatches.length) {
    throw new Error(`FDID ${payload.fdid} is already assigned to ${fdidMatches[0].name}.`);
  }

  const docRef = await addDoc(departmentsRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * @param {string} departmentId
 * @param {Partial<Omit<DepartmentRecord, 'id' | 'createdAt' | 'updatedAt'>>} input
 */
export async function updateDepartment(departmentId, input) {
  const existing = await getDepartment(departmentId);
  if (!existing) throw new Error("Department not found.");

  const payload = sanitizeDepartmentPayload({ ...existing, ...input });
  validateDepartmentPayload(payload);

  const fdidMatches = await findByFdid(payload.fdid, departmentId);
  if (fdidMatches.length) {
    throw new Error(`FDID ${payload.fdid} is already assigned to ${fdidMatches[0].name}.`);
  }

  await updateDoc(doc(db, "departments", departmentId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

/** @param {string} departmentId */
export async function deactivateDepartment(departmentId) {
  await updateDoc(doc(db, "departments", departmentId), {
    status: DEPARTMENT_STATUSES.INACTIVE,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {DepartmentRecord[]} departments
 * @param {string} search
 */
export function filterDepartments(departments, search) {
  const term = search.trim().toLowerCase();
  if (!term) return departments;

  return departments.filter((department) =>
    [
      department.name,
      department.fdid,
      department.county,
      department.region,
      department.departmentType,
      department.city,
      department.chiefName,
      department.trainingOfficerName,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
}

/**
 * @param {string} fdid
 * @param {string} [excludeId]
 */
export async function findByFdid(fdid, excludeId) {
  if (!fdid) return [];
  const snap = await getDocs(query(departmentsRef, where("fdid", "==", fdid.trim())));
  return snap.docs
    .map((item) => mapDepartment(item.id, item.data()))
    .filter((department) => department && department.id !== excludeId);
}

function sanitizeDepartmentPayload(input) {
  return {
    name: input.name?.trim() ?? "",
    fdid: input.fdid?.trim() ?? "",
    address: input.address?.trim() ?? "",
    city: input.city?.trim() ?? "",
    state: input.state?.trim().toUpperCase() || "AR",
    zip: input.zip?.trim() ?? "",
    county: input.county?.trim() ?? "",
    region: input.region?.trim() ?? "",
    departmentType: input.departmentType?.trim() ?? "",
    chiefName: input.chiefName?.trim() ?? "",
    chiefEmail: input.chiefEmail?.trim().toLowerCase() ?? "",
    chiefPhone: normalizePhone(input.chiefPhone ?? ""),
    trainingOfficerName: input.trainingOfficerName?.trim() ?? "",
    trainingOfficerEmail: input.trainingOfficerEmail?.trim().toLowerCase() ?? "",
    trainingOfficerPhone: normalizePhone(input.trainingOfficerPhone ?? ""),
    status: input.status || DEPARTMENT_STATUSES.ACTIVE,
  };
}

function validateDepartmentPayload(payload) {
  if (!payload.name) throw new Error("Department name is required.");
  if (!payload.fdid) throw new Error("FDID is required.");
  if (!payload.county) throw new Error("County is required.");
}

function normalizePhone(value) {
  return String(value).replace(/\D/g, "");
}

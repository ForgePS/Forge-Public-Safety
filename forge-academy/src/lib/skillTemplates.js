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

export const SKILL_TEMPLATE_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

/**
 * @typedef {Object} SkillTemplateRecord
 * @property {string} id
 * @property {string} name
 * @property {string} courseId
 * @property {string} courseName
 * @property {string} courseNumber
 * @property {string} description
 * @property {string} status
 */

const templatesRef = collection(db, "skillTemplates");

function mapTemplate(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    name: data.name ?? "",
    courseId: data.courseId ?? "",
    courseName: data.courseName ?? "",
    courseNumber: data.courseNumber ?? "",
    description: data.description ?? "",
    status: data.status ?? SKILL_TEMPLATE_STATUSES.ACTIVE,
  };
}

/** @returns {Promise<SkillTemplateRecord[]>} */
export async function listSkillTemplates() {
  const snap = await getDocs(query(templatesRef));
  return snap.docs
    .map((item) => mapTemplate(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {string} courseId */
export async function listSkillTemplatesByCourse(courseId) {
  if (!courseId) return [];
  const snap = await getDocs(query(templatesRef, where("courseId", "==", courseId)));
  return snap.docs
    .map((item) => mapTemplate(item.id, item.data()))
    .filter(Boolean)
    .filter((item) => item.status === SKILL_TEMPLATE_STATUSES.ACTIVE);
}

/** @param {string} templateId */
export async function getSkillTemplate(templateId) {
  const snap = await getDoc(doc(db, "skillTemplates", templateId));
  if (!snap.exists()) return null;
  return mapTemplate(snap.id, snap.data());
}

/** @param {Omit<SkillTemplateRecord, 'id'>} input */
export async function createSkillTemplate(input) {
  if (!input.name?.trim()) throw new Error("Template name is required.");
  if (!input.courseId) throw new Error("Course is required.");

  const docRef = await addDoc(templatesRef, {
    name: input.name.trim(),
    courseId: input.courseId,
    courseName: input.courseName ?? "",
    courseNumber: input.courseNumber ?? "",
    description: input.description?.trim() ?? "",
    status: input.status || SKILL_TEMPLATE_STATUSES.ACTIVE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/** @param {string} templateId @param {Partial<SkillTemplateRecord>} input */
export async function updateSkillTemplate(templateId, input) {
  await updateDoc(doc(db, "skillTemplates", templateId), {
    ...(input.name != null ? { name: input.name.trim() } : {}),
    ...(input.courseId != null ? { courseId: input.courseId } : {}),
    ...(input.courseName != null ? { courseName: input.courseName } : {}),
    ...(input.courseNumber != null ? { courseNumber: input.courseNumber } : {}),
    ...(input.description != null ? { description: input.description.trim() } : {}),
    ...(input.status != null ? { status: input.status } : {}),
    updatedAt: serverTimestamp(),
  });
}

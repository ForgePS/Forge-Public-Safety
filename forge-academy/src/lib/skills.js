import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";

/**
 * @typedef {Object} SkillRecord
 * @property {string} id
 * @property {string} templateId
 * @property {string} name
 * @property {string} description
 * @property {number} sortOrder
 * @property {number} maxScore
 * @property {number} passingScore
 */

const skillsRef = collection(db, "skills");

function mapSkill(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    templateId: data.templateId ?? "",
    name: data.name ?? "",
    description: data.description ?? "",
    sortOrder: Number(data.sortOrder ?? 0),
    maxScore: Number(data.maxScore ?? 100),
    passingScore: Number(data.passingScore ?? 70),
  };
}

/** @param {string} templateId */
export async function listSkillsByTemplate(templateId) {
  if (!templateId) return [];
  const snap = await getDocs(query(skillsRef, where("templateId", "==", templateId)));
  return snap.docs
    .map((item) => mapSkill(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** @param {string} skillId */
export async function getSkill(skillId) {
  const snap = await getDoc(doc(db, "skills", skillId));
  if (!snap.exists()) return null;
  return mapSkill(snap.id, snap.data());
}

/** @param {Omit<SkillRecord, 'id'>} input */
export async function createSkill(input) {
  if (!input.templateId) throw new Error("Skill template is required.");
  if (!input.name?.trim()) throw new Error("Skill name is required.");

  const docRef = await addDoc(skillsRef, {
    templateId: input.templateId,
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    sortOrder: Number(input.sortOrder ?? 0),
    maxScore: Number(input.maxScore ?? 100),
    passingScore: Number(input.passingScore ?? 70),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/** @param {string} skillId @param {Partial<SkillRecord>} input */
export async function updateSkill(skillId, input) {
  await updateDoc(doc(db, "skills", skillId), {
    ...(input.name != null ? { name: input.name.trim() } : {}),
    ...(input.description != null ? { description: input.description.trim() } : {}),
    ...(input.sortOrder != null ? { sortOrder: Number(input.sortOrder) } : {}),
    ...(input.maxScore != null ? { maxScore: Number(input.maxScore) } : {}),
    ...(input.passingScore != null ? { passingScore: Number(input.passingScore) } : {}),
    updatedAt: serverTimestamp(),
  });
}

/** @param {string} skillId */
export async function deleteSkill(skillId) {
  await deleteDoc(doc(db, "skills", skillId));
}

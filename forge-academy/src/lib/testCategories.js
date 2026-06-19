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
import { writeAuditLog } from "./auditLogs.js";

export const DEFAULT_TEST_CATEGORIES = [
  { name: "Written Exam", description: "Standard course written examination" },
  { name: "Practical Exam", description: "Hands-on practical evaluation" },
  { name: "State Certification Exam", description: "State certification testing" },
  { name: "Academy Final Exam", description: "End-of-course academy final" },
  { name: "Module Quiz", description: "Short module-level quiz" },
  { name: "Retest", description: "Retest attempt after failure" },
  { name: "Challenge Exam", description: "Challenge or equivalency exam" },
  { name: "Make-Up Exam", description: "Scheduled make-up session" },
];

/**
 * @typedef {Object} TestCategoryRecord
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {boolean} active
 */

const categoriesRef = collection(db, "testCategories");

function mapCategory(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    name: data.name ?? "",
    description: data.description ?? "",
    active: data.active !== false,
  };
}

/** @returns {Promise<TestCategoryRecord[]>} */
export async function listTestCategories(includeInactive = false) {
  const snap = await getDocs(query(categoriesRef));
  return snap.docs
    .map((item) => mapCategory(item.id, item.data()))
    .filter(Boolean)
    .filter((item) => includeInactive || item.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {string} categoryId */
export async function getTestCategory(categoryId) {
  const snap = await getDoc(doc(db, "testCategories", categoryId));
  if (!snap.exists()) return null;
  return mapCategory(snap.id, snap.data());
}

/** @param {{ name: string, description?: string, active?: boolean }} input @param {string} userId */
export async function createTestCategory(input, userId) {
  if (!input.name?.trim()) throw new Error("Category name is required.");
  const docRef = await addDoc(categoriesRef, {
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    active: input.active !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await writeAuditLog({
    action: "test_category_created",
    entityType: "testCategory",
    entityId: docRef.id,
    details: { name: input.name.trim() },
    userId,
  });
  return docRef.id;
}

/** @param {string} categoryId @param {Partial<TestCategoryRecord>} input @param {string} userId */
export async function updateTestCategory(categoryId, input, userId) {
  await updateDoc(doc(db, "testCategories", categoryId), {
    ...(input.name != null ? { name: input.name.trim() } : {}),
    ...(input.description != null ? { description: input.description.trim() } : {}),
    ...(input.active != null ? { active: Boolean(input.active) } : {}),
    updatedAt: serverTimestamp(),
  });
  await writeAuditLog({
    action: "test_category_updated",
    entityType: "testCategory",
    entityId: categoryId,
    userId,
  });
}

/** @param {string} userId */
export async function seedDefaultTestCategories(userId) {
  const existing = await listTestCategories(true);
  const existingNames = new Set(existing.map((item) => item.name.toLowerCase()));
  let created = 0;
  for (const category of DEFAULT_TEST_CATEGORIES) {
    if (existingNames.has(category.name.toLowerCase())) continue;
    await createTestCategory(category, userId);
    created += 1;
  }
  return created;
}

/** @param {string} name */
export async function findTestCategoryByName(name) {
  const snap = await getDocs(query(categoriesRef, where("name", "==", name.trim())));
  const row = snap.docs[0];
  return row ? mapCategory(row.id, row.data()) : null;
}

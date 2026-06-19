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

export const COURSE_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const COURSE_CATEGORIES = {
  FIREFIGHTER_I: "firefighter_i",
  FIREFIGHTER_II: "firefighter_ii",
  HAZMAT_AWARENESS: "hazmat_awareness",
  HAZMAT_OPERATIONS: "hazmat_operations",
  DRIVER_OPERATOR: "driver_operator",
  PUMP_OPERATIONS: "pump_operations",
  AERIAL_OPERATIONS: "aerial_operations",
  FIRE_OFFICER: "fire_officer",
  FIRE_INSTRUCTOR: "fire_instructor",
  FIRE_INSPECTOR: "fire_inspector",
  FIRE_INVESTIGATOR: "fire_investigator",
  RESCUE: "rescue",
  WILDLAND: "wildland",
  EMS_CE: "ems_ce",
  EXECUTIVE: "executive_fire_officer",
  LEADERSHIP: "leadership",
  SAFETY_OFFICER: "safety_officer",
  LIVE_FIRE: "live_fire",
  TECHNICAL_RESCUE: "technical_rescue",
};

export const COURSE_CATEGORY_LABELS = {
  [COURSE_CATEGORIES.FIREFIGHTER_I]: "Firefighter I",
  [COURSE_CATEGORIES.FIREFIGHTER_II]: "Firefighter II",
  [COURSE_CATEGORIES.HAZMAT_AWARENESS]: "HazMat Awareness",
  [COURSE_CATEGORIES.HAZMAT_OPERATIONS]: "HazMat Operations",
  [COURSE_CATEGORIES.DRIVER_OPERATOR]: "Driver/Operator",
  [COURSE_CATEGORIES.PUMP_OPERATIONS]: "Pump Operations",
  [COURSE_CATEGORIES.AERIAL_OPERATIONS]: "Aerial Operations",
  [COURSE_CATEGORIES.FIRE_OFFICER]: "Fire Officer",
  [COURSE_CATEGORIES.FIRE_INSTRUCTOR]: "Fire Instructor",
  [COURSE_CATEGORIES.FIRE_INSPECTOR]: "Fire Inspector",
  [COURSE_CATEGORIES.FIRE_INVESTIGATOR]: "Fire Investigator",
  [COURSE_CATEGORIES.RESCUE]: "Rescue",
  [COURSE_CATEGORIES.WILDLAND]: "Wildland",
  [COURSE_CATEGORIES.EMS_CE]: "EMS Continuing Education",
  [COURSE_CATEGORIES.EXECUTIVE]: "Executive Fire Officer",
  [COURSE_CATEGORIES.LEADERSHIP]: "Leadership",
  [COURSE_CATEGORIES.SAFETY_OFFICER]: "Safety Officer",
  [COURSE_CATEGORIES.LIVE_FIRE]: "Live Fire",
  [COURSE_CATEGORIES.TECHNICAL_RESCUE]: "Technical Rescue",
};

/**
 * @typedef {Object} CourseRecord
 * @property {string} id
 * @property {string} name
 * @property {string} courseNumber
 * @property {string} description
 * @property {number} hours
 * @property {string} category
 * @property {string} certificationType
 * @property {string[]} prerequisiteCourseIds
 * @property {string[]} requiredDocuments
 * @property {string} requiredEquipment
 * @property {number} minEnrollment
 * @property {number} maxEnrollment
 * @property {boolean} testRequired
 * @property {boolean} skillsRequired
 * @property {boolean} certificateIssued
 * @property {string} certificateTemplateId
 * @property {string[]} requiredTestIds
 * @property {string} status
 * @property {import('firebase/firestore').Timestamp | null} createdAt
 * @property {import('firebase/firestore').Timestamp | null} updatedAt
 */

const coursesRef = collection(db, "courses");

/**
 * @param {unknown} data
 * @returns {CourseRecord | null}
 */
export function mapCourse(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    name: data.name ?? "",
    courseNumber: data.courseNumber ?? "",
    description: data.description ?? "",
    hours: Number(data.hours ?? 0),
    category: data.category ?? "",
    certificationType: data.certificationType ?? "",
    prerequisiteCourseIds: Array.isArray(data.prerequisiteCourseIds) ? data.prerequisiteCourseIds : [],
    requiredDocuments: Array.isArray(data.requiredDocuments) ? data.requiredDocuments : [],
    requiredEquipment: data.requiredEquipment ?? "",
    minEnrollment: Number(data.minEnrollment ?? 0),
    maxEnrollment: Number(data.maxEnrollment ?? 0),
    testRequired: Boolean(data.testRequired),
    skillsRequired: Boolean(data.skillsRequired),
    certificateIssued: data.certificateIssued !== false,
    certificateTemplateId: data.certificateTemplateId ?? "",
    requiredTestIds: Array.isArray(data.requiredTestIds) ? data.requiredTestIds : [],
    status: data.status ?? COURSE_STATUSES.ACTIVE,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

/** @returns {Promise<CourseRecord[]>} */
export async function listCourses() {
  const snap = await getDocs(query(coursesRef));
  return snap.docs
    .map((item) => mapCourse(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.courseNumber.localeCompare(b.courseNumber));
}

/** @returns {Promise<CourseRecord[]>} */
export async function listActiveCourses() {
  const courses = await listCourses();
  return courses.filter((course) => course.status === COURSE_STATUSES.ACTIVE);
}

/** @returns {Promise<CourseRecord | null>} */
export async function getCourse(courseId) {
  const snap = await getDoc(doc(db, "courses", courseId));
  if (!snap.exists()) return null;
  return mapCourse(snap.id, snap.data());
}

/** @param {string} templateId */
export async function clearCertificateTemplateFromCourses(templateId) {
  if (!templateId) return;
  const snap = await getDocs(query(coursesRef, where("certificateTemplateId", "==", templateId)));
  await Promise.all(
    snap.docs.map((item) =>
      updateDoc(item.ref, {
        certificateTemplateId: "",
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}

/** @param {Omit<CourseRecord, 'id' | 'createdAt' | 'updatedAt'>} input */
export async function createCourse(input) {
  const payload = sanitizeCoursePayload(input);
  validateCoursePayload(payload);
  await assertUniqueCourseNumber(payload.courseNumber);
  await assertValidPrerequisites(payload.prerequisiteCourseIds);

  const docRef = await addDoc(coursesRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * @param {string} courseId
 * @param {Partial<Omit<CourseRecord, 'id' | 'createdAt' | 'updatedAt'>>} input
 */
export async function updateCourse(courseId, input) {
  const existing = await getCourse(courseId);
  if (!existing) throw new Error("Course not found.");

  const payload = sanitizeCoursePayload({ ...existing, ...input });
  validateCoursePayload(payload);
  await assertUniqueCourseNumber(payload.courseNumber, courseId);
  await assertValidPrerequisites(payload.prerequisiteCourseIds, courseId);

  await updateDoc(doc(db, "courses", courseId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

/** @param {string} courseId */
export async function deactivateCourse(courseId) {
  await updateDoc(doc(db, "courses", courseId), {
    status: COURSE_STATUSES.INACTIVE,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {CourseRecord[]} courses
 * @param {string} search
 */
export function filterCourses(courses, search) {
  const term = search.trim().toLowerCase();
  if (!term) return courses;

  return courses.filter((course) =>
    [
      course.name,
      course.courseNumber,
      course.description,
      course.certificationType,
      COURSE_CATEGORY_LABELS[course.category] ?? course.category,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
}

/**
 * @param {CourseRecord} course
 * @param {CourseRecord[]} allCourses
 */
export function getPrerequisiteLabels(course, allCourses) {
  return course.prerequisiteCourseIds
    .map((id) => {
      const match = allCourses.find((item) => item.id === id);
      return match ? `${match.courseNumber} · ${match.name}` : id;
    })
    .filter(Boolean);
}

/**
 * @param {string} courseNumber
 * @param {string} [excludeId]
 */
async function assertUniqueCourseNumber(courseNumber, excludeId) {
  const snap = await getDocs(query(coursesRef, where("courseNumber", "==", courseNumber)));
  const conflict = snap.docs.find((item) => item.id !== excludeId);
  if (conflict) {
    throw new Error(`Course number ${courseNumber} is already in use.`);
  }
}

/**
 * @param {string[]} prerequisiteCourseIds
 * @param {string} [courseId]
 */
async function assertValidPrerequisites(prerequisiteCourseIds, courseId) {
  if (courseId && prerequisiteCourseIds.includes(courseId)) {
    throw new Error("A course cannot require itself as a prerequisite.");
  }

  if (!courseId) return;

  for (const prerequisiteId of prerequisiteCourseIds) {
    const prerequisite = await getCourse(prerequisiteId);
    if (prerequisite?.prerequisiteCourseIds.includes(courseId)) {
      throw new Error("Prerequisite setup would create a circular dependency.");
    }
  }
}

function sanitizeCoursePayload(input) {
  return {
    name: input.name?.trim() ?? "",
    courseNumber: input.courseNumber?.trim().toUpperCase() ?? "",
    description: input.description?.trim() ?? "",
    hours: Number(input.hours ?? 0),
    category: input.category ?? "",
    certificationType: input.certificationType?.trim() ?? "",
    prerequisiteCourseIds: Array.isArray(input.prerequisiteCourseIds)
      ? input.prerequisiteCourseIds.filter(Boolean)
      : [],
    requiredDocuments: normalizeLines(input.requiredDocuments),
    requiredEquipment: input.requiredEquipment?.trim() ?? "",
    minEnrollment: Number(input.minEnrollment ?? 0),
    maxEnrollment: Number(input.maxEnrollment ?? 0),
    testRequired: Boolean(input.testRequired),
    skillsRequired: Boolean(input.skillsRequired),
    certificateIssued: input.certificateIssued !== false,
    certificateTemplateId: input.certificateTemplateId?.trim() ?? "",
    requiredTestIds: Array.isArray(input.requiredTestIds)
      ? input.requiredTestIds.filter(Boolean)
      : [],
    status: input.status || COURSE_STATUSES.ACTIVE,
  };
}

function validateCoursePayload(payload) {
  if (!payload.name) throw new Error("Course name is required.");
  if (!payload.courseNumber) throw new Error("Course number is required.");
  if (!payload.category) throw new Error("Course category is required.");
  if (payload.hours <= 0) throw new Error("Course hours must be greater than zero.");
  if (payload.maxEnrollment > 0 && payload.minEnrollment > payload.maxEnrollment) {
    throw new Error("Minimum enrollment cannot exceed maximum enrollment.");
  }
}

function normalizeLines(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

/** @param {string[]} documents */
export function formatDocumentList(documents) {
  return documents.join("\n");
}

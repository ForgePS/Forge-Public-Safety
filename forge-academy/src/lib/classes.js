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
import { getCourse } from "./courses.js";

export const CLASS_STATUSES = {
  DRAFT: "draft",
  OPEN: "open",
  FULL: "full",
  WAITLIST: "waitlist",
  CLOSED: "closed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const CLASS_STATUS_LABELS = {
  [CLASS_STATUSES.DRAFT]: "Draft",
  [CLASS_STATUSES.OPEN]: "Open for registration",
  [CLASS_STATUSES.FULL]: "Full",
  [CLASS_STATUSES.WAITLIST]: "Waitlist",
  [CLASS_STATUSES.CLOSED]: "Closed",
  [CLASS_STATUSES.IN_PROGRESS]: "In progress",
  [CLASS_STATUSES.COMPLETED]: "Completed",
  [CLASS_STATUSES.CANCELLED]: "Cancelled",
};

export const LOCATION_TYPES = {
  ON_CAMPUS: "on_campus",
  REGIONAL: "regional",
  VIRTUAL: "virtual",
};

export const LOCATION_TYPE_LABELS = {
  [LOCATION_TYPES.ON_CAMPUS]: "On-campus",
  [LOCATION_TYPES.REGIONAL]: "Regional",
  [LOCATION_TYPES.VIRTUAL]: "Virtual",
};

export const DELIVERY_TYPES = {
  ON_CAMPUS_HOUSING_REQUIRED: "on_campus_housing_required",
  ON_CAMPUS_NO_HOUSING: "on_campus_no_housing",
  OFF_CAMPUS: "off_campus",
  HYBRID: "hybrid",
};

export const DELIVERY_TYPE_LABELS = {
  [DELIVERY_TYPES.ON_CAMPUS_HOUSING_REQUIRED]: "On-campus · housing required",
  [DELIVERY_TYPES.ON_CAMPUS_NO_HOUSING]: "On-campus · no housing",
  [DELIVERY_TYPES.OFF_CAMPUS]: "Off-campus / regional",
  [DELIVERY_TYPES.HYBRID]: "Hybrid",
};

/**
 * @typedef {Object} ClassSessionRecord
 * @property {string} id
 * @property {string} courseId
 * @property {string} courseName
 * @property {string} courseNumber
 * @property {string} startDate
 * @property {string} endDate
 * @property {string} startTime
 * @property {string} endTime
 * @property {string} location
 * @property {string} locationType
 * @property {string} deliveryType
 * @property {boolean} housingRequired
 * @property {string} housingNotes
 * @property {string[]} instructorIds
 * @property {string[]} instructorNames
 * @property {number} enrollmentCap
 * @property {number} waitlistCap
 * @property {number} enrolledCount
 * @property {number} waitlistCount
 * @property {string} registrationDeadline
 * @property {string} cancellationDeadline
 * @property {string} mealLodgingNotes
 * @property {string} notes
 * @property {string} status
 * @property {string} [catalogDescription]
 * @property {string} [catalogPrerequisites]
 * @property {string} [catalogBook]
 * @property {number | null} [catalogHours]
 * @property {string} [catalogSection]
 * @property {string} [catalogCourseName]
 * @property {string} [catalogImportBatch]
 * @property {import('firebase/firestore').Timestamp | null} createdAt
 * @property {import('firebase/firestore').Timestamp | null} updatedAt
 */

const classesRef = collection(db, "classes");

/** @param {unknown} value */
function normalizeDateField(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString().slice(0, 10);
  }
  return String(value);
}

/** @param {unknown} value */
function normalizeTextField(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/**
 * @param {unknown} data
 * @returns {ClassSessionRecord | null}
 */
export function mapClassSession(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    courseId: data.courseId ?? "",
    courseName: normalizeTextField(data.courseName),
    courseNumber: normalizeTextField(data.courseNumber),
    startDate: normalizeDateField(data.startDate),
    endDate: normalizeDateField(data.endDate),
    startTime: normalizeTextField(data.startTime),
    endTime: normalizeTextField(data.endTime),
    location: normalizeTextField(data.location),
    locationType: data.locationType ?? LOCATION_TYPES.ON_CAMPUS,
    deliveryType: data.deliveryType ?? DELIVERY_TYPES.ON_CAMPUS_NO_HOUSING,
    housingRequired: Boolean(data.housingRequired),
    housingNotes: data.housingNotes ?? "",
    instructorIds: Array.isArray(data.instructorIds) ? data.instructorIds : [],
    instructorNames: Array.isArray(data.instructorNames) ? data.instructorNames : [],
    enrollmentCap: Number(data.enrollmentCap ?? 0),
    waitlistCap: Number(data.waitlistCap ?? 0),
    enrolledCount: Number(data.enrolledCount ?? 0),
    waitlistCount: Number(data.waitlistCount ?? 0),
    registrationDeadline: normalizeDateField(data.registrationDeadline),
    cancellationDeadline: normalizeDateField(data.cancellationDeadline),
    mealLodgingNotes: data.mealLodgingNotes ?? "",
    notes: data.notes ?? "",
    status: data.status ?? CLASS_STATUSES.DRAFT,
    catalogDescription: data.catalogDescription ?? "",
    catalogPrerequisites: data.catalogPrerequisites ?? "",
    catalogBook: data.catalogBook ?? "",
    catalogHours: data.catalogHours == null ? null : Number(data.catalogHours),
    catalogSection: data.catalogSection ?? "",
    catalogCourseName: data.catalogCourseName ?? "",
    catalogImportBatch: data.catalogImportBatch ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

/** @returns {Promise<ClassSessionRecord[]>} */
export async function listClassSessions() {
  const snap = await getDocs(query(classesRef));
  return sortClassSessionsByCourseAndDate(
    snap.docs
      .map((item) => mapClassSession(item.id, item.data()))
      .filter(Boolean),
  );
}

/** @returns {Promise<ClassSessionRecord[]>} */
export async function listHousingRequiredClasses() {
  const sessions = await listClassSessions();
  return sessions.filter((session) => isHousingRequired(session));
}

/** @param {ClassSessionRecord} session */
export function isHousingRequired(session) {
  return (
    session.deliveryType === DELIVERY_TYPES.ON_CAMPUS_HOUSING_REQUIRED || session.housingRequired
  );
}

/** @param {ClassSessionRecord} session */
export function isOffCampusClass(session) {
  return (
    session.deliveryType === DELIVERY_TYPES.OFF_CAMPUS ||
    session.locationType === LOCATION_TYPES.REGIONAL
  );
}

/** @param {ClassSessionRecord} session */
export function isOnCampusClass(session) {
  if (isOffCampusClass(session)) return false;
  return (
    session.locationType === LOCATION_TYPES.ON_CAMPUS ||
    session.deliveryType === DELIVERY_TYPES.ON_CAMPUS_HOUSING_REQUIRED ||
    session.deliveryType === DELIVERY_TYPES.ON_CAMPUS_NO_HOUSING
  );
}

/**
 * @param {ClassSessionRecord[]} sessions
 * @returns {{ onCampus: ClassSessionRecord[], offCampus: ClassSessionRecord[] }}
 */
export function partitionClassSessionsByCampus(sessions) {
  const onCampus = [];
  const offCampus = [];
  for (const session of sessions) {
    if (isOffCampusClass(session)) offCampus.push(session);
    else onCampus.push(session);
  }
  return { onCampus, offCampus };
}

/** @returns {Promise<ClassSessionRecord[]>} */
export async function listOpenClassSessions() {
  const sessions = await listClassSessions();
  return sessions.filter((session) =>
    [CLASS_STATUSES.OPEN, CLASS_STATUSES.WAITLIST, CLASS_STATUSES.FULL].includes(session.status),
  );
}

/**
 * @param {ClassSessionRecord[]} sessions
 * @param {Set<string>} completedCourseIds
 * @returns {ClassSessionRecord[]}
 */
export function filterClassSessionsExcludingCompletedCourses(sessions, completedCourseIds) {
  if (!completedCourseIds?.size) return sessions;
  return sessions.filter(
    (session) => !session.courseId || !completedCourseIds.has(session.courseId),
  );
}

/** @returns {Promise<ClassSessionRecord | null>} */
export async function getClassSession(classId) {
  const snap = await getDoc(doc(db, "classes", classId));
  if (!snap.exists()) return null;
  return mapClassSession(snap.id, snap.data());
}

/**
 * @param {string} instructorId
 * @returns {Promise<ClassSessionRecord[]>}
 */
export async function listClassSessionsByInstructor(instructorId) {
  const snap = await getDocs(
    query(classesRef, where("instructorIds", "array-contains", instructorId)),
  );
  return sortClassSessionsByCourseAndDate(
    snap.docs
      .map((item) => mapClassSession(item.id, item.data()))
      .filter(Boolean),
  );
}

/** @param {Omit<ClassSessionRecord, 'id' | 'createdAt' | 'updatedAt' | 'enrolledCount'>} input */
export async function createClassSession(input) {
  const payload = await sanitizeClassPayload(input);
  validateClassPayload(payload);

  const docRef = await addDoc(classesRef, {
    ...payload,
    enrolledCount: 0,
    waitlistCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * @param {string} classId
 * @param {Partial<Omit<ClassSessionRecord, 'id' | 'createdAt' | 'updatedAt'>>} input
 */
export async function updateClassSession(classId, input) {
  const existing = await getClassSession(classId);
  if (!existing) throw new Error("Class session not found.");

  const payload = await sanitizeClassPayload({ ...existing, ...input });
  validateClassPayload(payload);

  await updateDoc(doc(db, "classes", classId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

/** @param {string} classId */
export async function cancelClassSession(classId) {
  await updateDoc(doc(db, "classes", classId), {
    status: CLASS_STATUSES.CANCELLED,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @typedef {Object} ClassBulkPatch
 * @property {string} [status]
 * @property {string} [deliveryType]
 * @property {string} [locationType]
 * @property {string} [registrationDeadline]
 * @property {string} [cancellationDeadline]
 * @property {number} [enrollmentCap]
 * @property {string} [notes]
 * @property {string} [mealLodgingNotes]
 */

/**
 * @param {string} classId
 * @param {ClassBulkPatch} patch
 */
export async function patchClassSession(classId, patch) {
  const existing = await getClassSession(classId);
  if (!existing) throw new Error("Class session not found.");

  /** @type {Record<string, unknown>} */
  const updates = {};

  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.deliveryType !== undefined) {
    updates.deliveryType = patch.deliveryType;
    updates.housingRequired = patch.deliveryType === DELIVERY_TYPES.ON_CAMPUS_HOUSING_REQUIRED;
  }
  if (patch.locationType !== undefined) updates.locationType = patch.locationType;
  if (patch.registrationDeadline !== undefined) {
    updates.registrationDeadline = patch.registrationDeadline;
  }
  if (patch.cancellationDeadline !== undefined) {
    updates.cancellationDeadline = patch.cancellationDeadline;
  }
  if (patch.enrollmentCap !== undefined) {
    if (patch.enrollmentCap < existing.enrolledCount) {
      throw new Error(`Enrollment cap cannot be below ${existing.enrolledCount} enrolled.`);
    }
    updates.enrollmentCap = patch.enrollmentCap;
  }
  if (patch.notes !== undefined) updates.notes = patch.notes.trim();
  if (patch.mealLodgingNotes !== undefined) updates.mealLodgingNotes = patch.mealLodgingNotes.trim();

  if (Object.keys(updates).length === 0) return;

  await updateDoc(doc(db, "classes", classId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {string[]} classIds
 * @param {ClassBulkPatch} patch
 * @returns {Promise<{ id: string, success: boolean, error?: string }[]>}
 */
export async function bulkUpdateClassSessions(classIds, patch) {
  const results = [];

  for (const classId of classIds) {
    try {
      await patchClassSession(classId, patch);
      results.push({ id: classId, success: true });
    } catch (err) {
      results.push({
        id: classId,
        success: false,
        error: err instanceof Error ? err.message : "Unable to update class session.",
      });
    }
  }

  return results;
}

/**
 * @param {string} classId
 * @param {number} enrolledDelta
 * @param {number} waitlistDelta
 */
export async function adjustClassEnrollmentCounts(classId, enrolledDelta, waitlistDelta = 0) {
  const classRef = doc(db, "classes", classId);
  const snap = await getDoc(classRef);
  if (!snap.exists()) throw new Error("Class session not found.");

  const data = snap.data();
  const enrollmentCap = Number(data.enrollmentCap ?? 0);
  const waitlistCap = Number(data.waitlistCap ?? 0);
  const enrolledCount = Math.max(Number(data.enrolledCount ?? 0) + enrolledDelta, 0);
  const waitlistCount = Math.max(Number(data.waitlistCount ?? 0) + waitlistDelta, 0);

  let status = data.status ?? CLASS_STATUSES.DRAFT;
  if (status !== CLASS_STATUSES.CANCELLED && status !== CLASS_STATUSES.COMPLETED) {
    if (enrolledCount >= enrollmentCap && enrollmentCap > 0) {
      status = waitlistCount > 0 ? CLASS_STATUSES.WAITLIST : CLASS_STATUSES.FULL;
    } else if ([CLASS_STATUSES.FULL, CLASS_STATUSES.WAITLIST].includes(status) && enrolledCount < enrollmentCap) {
      status = CLASS_STATUSES.OPEN;
    }
  }

  await updateDoc(classRef, {
    enrolledCount,
    waitlistCount,
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {ClassSessionRecord[]} sessions
 * @param {string} search
 */
export function filterClassSessions(sessions, search) {
  const term = search.trim().toLowerCase();
  if (!term) return sortClassSessionsByCourseAndDate(sessions);

  const filtered = sessions.filter((session) =>
    [
      session.courseName,
      session.courseNumber,
      session.location,
      session.instructorNames.join(" "),
      CLASS_STATUS_LABELS[session.status] ?? session.status,
      LOCATION_TYPE_LABELS[session.locationType] ?? session.locationType,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );

  return sortClassSessionsByCourseAndDate(filtered);
}

/** @param {ClassSessionRecord} session */
export function classSessionGroupKey(session) {
  return session.courseName.trim().toLowerCase();
}

/**
 * @param {ClassSessionRecord} a
 * @param {ClassSessionRecord} b
 */
export function compareClassSessionsByDate(a, b) {
  const startCompare = (a.startDate || "").localeCompare(b.startDate || "");
  if (startCompare !== 0) return startCompare;

  const endCompare = (a.endDate || "").localeCompare(b.endDate || "");
  if (endCompare !== 0) return endCompare;

  return (a.startTime || "").localeCompare(b.startTime || "");
}

/**
 * @typedef {Object} ClassSessionGroup
 * @property {string} key
 * @property {string} courseName
 * @property {string} courseNumber
 * @property {string} courseId
 * @property {ClassSessionRecord[]} sessions
 * @property {string} earliestStartDate
 */

/**
 * @param {ClassSessionRecord[]} sessions
 * @returns {ClassSessionGroup[]}
 */
export function groupClassSessionsByCourse(sessions) {
  /** @type {Map<string, ClassSessionRecord[]>} */
  const groups = new Map();

  for (const session of sessions) {
    const key = classSessionGroupKey(session);
    const bucket = groups.get(key);
    if (bucket) bucket.push(session);
    else groups.set(key, [session]);
  }

  return [...groups.values()]
    .map((groupSessions) => {
      const sortedSessions = [...groupSessions].sort(compareClassSessionsByDate);
      const first = sortedSessions[0];
      return {
        key: classSessionGroupKey(first),
        courseName: first.courseName,
        courseNumber: first.courseNumber,
        courseId: first.courseId,
        sessions: sortedSessions,
        earliestStartDate: first.startDate,
      };
    })
    .sort((a, b) => {
      const dateCompare = a.earliestStartDate.localeCompare(b.earliestStartDate);
      if (dateCompare !== 0) return dateCompare;
      return a.courseName.localeCompare(b.courseName);
    });
}

/**
 * @param {ClassSessionRecord[]} sessions
 * @returns {ClassSessionRecord[]}
 */
export function sortClassSessionsByCourseAndDate(sessions) {
  return groupClassSessionsByCourse(sessions).flatMap((group) => group.sessions);
}

/** @param {ClassSessionRecord} session */
export function getOpenSeats(session) {
  return Math.max(session.enrollmentCap - session.enrolledCount, 0);
}

/** @param {ClassSessionRecord} session */
export function formatClassHours(session) {
  if (session.catalogHours != null && session.catalogHours > 0) {
    return `${session.catalogHours}h`;
  }
  return "—";
}

/** @param {ClassSessionRecord} session */
export function formatClassDates(session) {
  const start = session.startDate || "";
  const end = session.endDate || "";
  if (!start && !end) return "Dates TBD";
  if (!start) return end;
  if (!end) return start;
  if (start === end) return start;
  return `${start} – ${end}`;
}

async function sanitizeClassPayload(input) {
  const course = input.courseId ? await getCourse(input.courseId) : null;

  return {
    courseId: input.courseId ?? "",
    courseName: course?.name ?? input.courseName ?? "",
    courseNumber: course?.courseNumber ?? input.courseNumber ?? "",
    startDate: input.startDate ?? "",
    endDate: input.endDate ?? "",
    startTime: input.startTime ?? "",
    endTime: input.endTime ?? "",
    location: input.location?.trim() ?? "",
    locationType: input.locationType || LOCATION_TYPES.ON_CAMPUS,
    deliveryType: input.deliveryType || DELIVERY_TYPES.ON_CAMPUS_NO_HOUSING,
    housingRequired:
      input.deliveryType === DELIVERY_TYPES.ON_CAMPUS_HOUSING_REQUIRED ||
      Boolean(input.housingRequired),
    housingNotes: input.housingNotes?.trim() ?? "",
    instructorIds: Array.isArray(input.instructorIds) ? input.instructorIds.filter(Boolean) : [],
    instructorNames: Array.isArray(input.instructorNames) ? input.instructorNames.filter(Boolean) : [],
    enrollmentCap: Number(input.enrollmentCap ?? 0),
    waitlistCap: Number(input.waitlistCap ?? 0),
    registrationDeadline: input.registrationDeadline ?? "",
    cancellationDeadline: input.cancellationDeadline ?? "",
    mealLodgingNotes: input.mealLodgingNotes?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    status: input.status || CLASS_STATUSES.DRAFT,
  };
}

function validateClassPayload(payload) {
  if (!payload.courseId) throw new Error("Course is required.");
  if (!payload.startDate || !payload.endDate) throw new Error("Start and end dates are required.");
  if (payload.endDate < payload.startDate) throw new Error("End date cannot be before start date.");
  if (payload.enrollmentCap <= 0) throw new Error("Enrollment cap must be greater than zero.");
  if (!payload.location) throw new Error("Location is required.");
  if (payload.instructorIds.length === 0) throw new Error("At least one instructor is required.");
}

/**
 * @param {string[]} instructorIds
 * @param {import('./users.js').AppUserRecord[]} instructors
 */
export function resolveInstructorNames(instructorIds, instructors) {
  return instructorIds
    .map((id) => instructors.find((instructor) => instructor.uid === id)?.displayName ?? id)
    .filter(Boolean);
}

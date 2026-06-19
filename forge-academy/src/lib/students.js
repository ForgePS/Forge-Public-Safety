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

export const EMPLOYMENT_STATUSES = {
  CAREER: "career",
  VOLUNTEER: "volunteer",
  PART_TIME: "part_time",
};

export const EMPLOYMENT_STATUS_LABELS = {
  [EMPLOYMENT_STATUSES.CAREER]: "Career",
  [EMPLOYMENT_STATUSES.VOLUNTEER]: "Volunteer",
  [EMPLOYMENT_STATUSES.PART_TIME]: "Part-time",
};

export const STUDENT_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

/**
 * @typedef {Object} StudentRecord
 * @property {string} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} dateOfBirth
 * @property {string} email
 * @property {string} phone
 * @property {string} femaSid
 * @property {string} departmentId
 * @property {string} departmentName
 * @property {string} rank
 * @property {string} employmentStatus
 * @property {string} emsLicense
 * @property {string} status
 * @property {string} notes
 * @property {string} profilePictureUrl
 * @property {string} mailingAddressLine1
 * @property {string} mailingAddressLine2
 * @property {string} mailingCity
 * @property {string} mailingState
 * @property {string} mailingZip
 * @property {string} emergencyContactName
 * @property {string} emergencyContactRelationship
 * @property {string} emergencyContactPhone
 * @property {string} emergencyContactAddressLine1
 * @property {string} emergencyContactCity
 * @property {string} emergencyContactState
 * @property {string} emergencyContactZip
 * @property {string} specialConsiderations
 * @property {import('firebase/firestore').Timestamp | null} createdAt
 * @property {import('firebase/firestore').Timestamp | null} updatedAt
 */

const studentsRef = collection(db, "students");

/**
 * @param {unknown} data
 * @returns {StudentRecord | null}
 */
export function mapStudent(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    dateOfBirth: data.dateOfBirth ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    femaSid: data.femaSid ?? "",
    departmentId: data.departmentId ?? "",
    departmentName: data.departmentName ?? "",
    rank: data.rank ?? "",
    employmentStatus: data.employmentStatus ?? EMPLOYMENT_STATUSES.CAREER,
    emsLicense: data.emsLicense ?? "",
    status: data.status ?? STUDENT_STATUSES.ACTIVE,
    notes: data.notes ?? "",
    profilePictureUrl: data.profilePictureUrl ?? "",
    mailingAddressLine1: data.mailingAddressLine1 ?? "",
    mailingAddressLine2: data.mailingAddressLine2 ?? "",
    mailingCity: data.mailingCity ?? "",
    mailingState: data.mailingState ?? "",
    mailingZip: data.mailingZip ?? "",
    emergencyContactName: data.emergencyContactName ?? "",
    emergencyContactRelationship: data.emergencyContactRelationship ?? "",
    emergencyContactPhone: data.emergencyContactPhone ?? "",
    emergencyContactAddressLine1: data.emergencyContactAddressLine1 ?? "",
    emergencyContactCity: data.emergencyContactCity ?? "",
    emergencyContactState: data.emergencyContactState ?? "",
    emergencyContactZip: data.emergencyContactZip ?? "",
    specialConsiderations: data.specialConsiderations ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

/** @returns {Promise<StudentRecord[]>} */
export async function listStudents() {
  const snap = await getDocs(query(studentsRef));
  const students = snap.docs
    .map((item) => mapStudent(item.id, item.data()))
    .filter(Boolean);

  return students.sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
  );
}

/** @returns {Promise<StudentRecord[]>} */
export async function listStudentsByDepartment(departmentId) {
  if (!departmentId) return [];
  const snap = await getDocs(query(studentsRef, where("departmentId", "==", departmentId)));
  return snap.docs
    .map((item) => mapStudent(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
}

/**
 * @param {string} departmentId
 * @returns {Promise<{ total: number, active: number, inactive: number, career: number, volunteer: number, partTime: number }>}
 */
export async function getDepartmentRosterSummary(departmentId) {
  const roster = await listStudentsByDepartment(departmentId);
  return summarizeRosterCounts(roster);
}

/** @param {StudentRecord[]} students */
export function summarizeRosterCounts(students) {
  return {
    total: students.length,
    active: students.filter((student) => student.status === STUDENT_STATUSES.ACTIVE).length,
    inactive: students.filter((student) => student.status === STUDENT_STATUSES.INACTIVE).length,
    career: students.filter((student) => student.employmentStatus === EMPLOYMENT_STATUSES.CAREER).length,
    volunteer: students.filter((student) => student.employmentStatus === EMPLOYMENT_STATUSES.VOLUNTEER).length,
    partTime: students.filter((student) => student.employmentStatus === EMPLOYMENT_STATUSES.PART_TIME).length,
  };
}

/** @param {StudentRecord[]} students @returns {Record<string, ReturnType<typeof summarizeRosterCounts>>} */
export function summarizeRosterCountsByDepartment(students) {
  /** @type {Record<string, StudentRecord[]>} */
  const byDepartment = {};

  for (const student of students) {
    if (!student.departmentId) continue;
    if (!byDepartment[student.departmentId]) {
      byDepartment[student.departmentId] = [];
    }
    byDepartment[student.departmentId].push(student);
  }

  return Object.fromEntries(
    Object.entries(byDepartment).map(([departmentId, roster]) => [
      departmentId,
      summarizeRosterCounts(roster),
    ]),
  );
}

/** @returns {Promise<StudentRecord | null>} */
export async function findStudentByEmail(email) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;

  const snap = await getDocs(query(studentsRef, where("email", "==", normalized)));
  const match = snap.docs.map((item) => mapStudent(item.id, item.data())).find(Boolean);
  return match ?? null;
}

/**
 * Resolve the student record linked to a signed-in user profile.
 * @param {{ studentId?: string, email?: string }} user
 * @returns {Promise<StudentRecord | null>}
 */
export async function getStudentForUser(user) {
  if (user?.studentId) {
    const linked = await getStudent(user.studentId);
    if (linked) return linked;
  }

  if (user?.email) {
    return findStudentByEmail(user.email);
  }

  return null;
}

/** @returns {Promise<StudentRecord | null>} */
export async function getStudent(studentId) {
  const snap = await getDoc(doc(db, "students", studentId));
  if (!snap.exists()) return null;
  return mapStudent(snap.id, snap.data());
}

/**
 * @param {Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'>} input
 * @param {string} createdByUid
 */
export async function createStudent(input, createdByUid) {
  const payload = sanitizeStudentPayload(input);
  validateStudentPayload(payload);

  const duplicate = await findDuplicateMatches(payload);
  if (duplicate.length) {
    throw new DuplicateStudentError(duplicate);
  }

  const docRef = await addDoc(studentsRef, {
    ...payload,
    createdBy: createdByUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * @param {string} studentId
 * @param {Partial<Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'>>} input
 */
export async function updateStudent(studentId, input) {
  const existing = await getStudent(studentId);
  if (!existing) {
    throw new Error("Student not found.");
  }

  const payload = sanitizeStudentPayload({ ...existing, ...input });
  validateStudentPayload(payload);

  const duplicate = await findDuplicateMatches(payload, studentId);
  if (duplicate.length) {
    throw new DuplicateStudentError(duplicate);
  }

  await updateDoc(doc(db, "students", studentId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

/** Fields a signed-in student may update on their own record. */
export const STUDENT_SELF_PROFILE_FIELD_KEYS = [
  "profilePictureUrl",
  "phone",
  "mailingAddressLine1",
  "mailingAddressLine2",
  "mailingCity",
  "mailingState",
  "mailingZip",
  "emergencyContactName",
  "emergencyContactRelationship",
  "emergencyContactPhone",
  "emergencyContactAddressLine1",
  "emergencyContactCity",
  "emergencyContactState",
  "emergencyContactZip",
  "departmentName",
  "rank",
  "specialConsiderations",
];

/**
 * @param {Partial<Pick<StudentRecord, typeof STUDENT_SELF_PROFILE_FIELD_KEYS[number]>>} patch
 */
export function sanitizeStudentSelfProfilePatch(patch) {
  return {
    profilePictureUrl: patch.profilePictureUrl?.trim() ?? "",
    phone: normalizePhone(patch.phone ?? ""),
    mailingAddressLine1: patch.mailingAddressLine1?.trim() ?? "",
    mailingAddressLine2: patch.mailingAddressLine2?.trim() ?? "",
    mailingCity: patch.mailingCity?.trim() ?? "",
    mailingState: patch.mailingState?.trim().toUpperCase() ?? "",
    mailingZip: patch.mailingZip?.trim() ?? "",
    emergencyContactName: patch.emergencyContactName?.trim() ?? "",
    emergencyContactRelationship: patch.emergencyContactRelationship?.trim() ?? "",
    emergencyContactPhone: normalizePhone(patch.emergencyContactPhone ?? ""),
    emergencyContactAddressLine1: patch.emergencyContactAddressLine1?.trim() ?? "",
    emergencyContactCity: patch.emergencyContactCity?.trim() ?? "",
    emergencyContactState: patch.emergencyContactState?.trim().toUpperCase() ?? "",
    emergencyContactZip: patch.emergencyContactZip?.trim() ?? "",
    departmentName: patch.departmentName?.trim() ?? "",
    rank: patch.rank?.trim() ?? "",
    specialConsiderations: patch.specialConsiderations?.trim() ?? "",
  };
}

/**
 * @param {string} studentId
 * @param {Partial<Pick<StudentRecord, typeof STUDENT_SELF_PROFILE_FIELD_KEYS[number]>>} patch
 */
export async function updateStudentSelfProfile(studentId, patch) {
  const existing = await getStudent(studentId);
  if (!existing) {
    throw new Error("Student not found.");
  }

  const updates = sanitizeStudentSelfProfilePatch({ ...existing, ...patch });
  if (updates.phone && updates.phone.length > 0 && updates.phone.length < 10) {
    throw new Error("Enter a valid 10-digit phone number.");
  }
  await updateDoc(doc(db, "students", studentId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/** @param {string} studentId */
export async function deactivateStudent(studentId) {
  await updateDoc(doc(db, "students", studentId), {
    status: STUDENT_STATUSES.INACTIVE,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {StudentRecord | Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'>} student
 * @param {string} [excludeId]
 */
export async function findDuplicateMatches(student, excludeId) {
  const matches = [];
  const all = await listStudents();

  for (const candidate of all) {
    if (excludeId && candidate.id === excludeId) continue;

    const reasons = [];

    if (student.femaSid && candidate.femaSid === student.femaSid) {
      reasons.push("FEMA SID");
    }
    if (student.email && candidate.email && candidate.email === student.email) {
      reasons.push("email");
    }
    if (student.phone && candidate.phone && candidate.phone === student.phone) {
      reasons.push("phone");
    }
    if (
      student.firstName &&
      student.lastName &&
      student.dateOfBirth &&
      candidate.firstName.toLowerCase() === student.firstName.toLowerCase() &&
      candidate.lastName.toLowerCase() === student.lastName.toLowerCase() &&
      candidate.dateOfBirth === student.dateOfBirth
    ) {
      reasons.push("name and date of birth");
    }
    if (
      student.firstName &&
      student.lastName &&
      student.departmentId &&
      candidate.firstName.toLowerCase() === student.firstName.toLowerCase() &&
      candidate.lastName.toLowerCase() === student.lastName.toLowerCase() &&
      candidate.departmentId === student.departmentId
    ) {
      reasons.push("name and department");
    }

    if (reasons.length) {
      matches.push({ student: candidate, reasons });
    }
  }

  return matches;
}

/**
 * @param {StudentRecord[]} students
 * @param {string} search
 */
export function filterStudents(students, search) {
  const term = search.trim().toLowerCase();
  if (!term) return students;

  return students.filter((student) => {
    const haystack = [
      student.firstName,
      student.lastName,
      student.email,
      student.phone,
      student.femaSid,
      student.departmentName,
      student.rank,
      student.emsLicense,
      student.mailingCity,
      student.emergencyContactName,
      student.specialConsiderations,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}

function sanitizeStudentPayload(input) {
  return {
    firstName: input.firstName?.trim() ?? "",
    lastName: input.lastName?.trim() ?? "",
    dateOfBirth: input.dateOfBirth ?? "",
    email: input.email?.trim().toLowerCase() ?? "",
    phone: normalizePhone(input.phone ?? ""),
    femaSid: input.femaSid?.trim() ?? "",
    departmentId: input.departmentId?.trim() ?? "",
    departmentName: input.departmentName?.trim() ?? "",
    rank: input.rank?.trim() ?? "",
    employmentStatus: input.employmentStatus || EMPLOYMENT_STATUSES.CAREER,
    emsLicense: input.emsLicense?.trim() ?? "",
    status: input.status || STUDENT_STATUSES.ACTIVE,
    notes: input.notes?.trim() ?? "",
    profilePictureUrl: input.profilePictureUrl?.trim() ?? "",
    mailingAddressLine1: input.mailingAddressLine1?.trim() ?? "",
    mailingAddressLine2: input.mailingAddressLine2?.trim() ?? "",
    mailingCity: input.mailingCity?.trim() ?? "",
    mailingState: input.mailingState?.trim().toUpperCase() ?? "",
    mailingZip: input.mailingZip?.trim() ?? "",
    emergencyContactName: input.emergencyContactName?.trim() ?? "",
    emergencyContactRelationship: input.emergencyContactRelationship?.trim() ?? "",
    emergencyContactPhone: normalizePhone(input.emergencyContactPhone ?? ""),
    emergencyContactAddressLine1: input.emergencyContactAddressLine1?.trim() ?? "",
    emergencyContactCity: input.emergencyContactCity?.trim() ?? "",
    emergencyContactState: input.emergencyContactState?.trim().toUpperCase() ?? "",
    emergencyContactZip: input.emergencyContactZip?.trim() ?? "",
    specialConsiderations: input.specialConsiderations?.trim() ?? "",
  };
}

function validateStudentPayload(payload) {
  if (!payload.firstName || !payload.lastName) {
    throw new Error("First and last name are required.");
  }
  if (!payload.dateOfBirth) {
    throw new Error("Date of birth is required.");
  }
  if (!payload.femaSid) {
    throw new Error("FEMA SID is required.");
  }
  if (!/^\d{9,12}$/.test(payload.femaSid)) {
    throw new Error("FEMA SID must be 9 to 12 digits.");
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("Enter a valid email address.");
  }
}

function normalizePhone(value) {
  return value.replace(/\D/g, "");
}

export class DuplicateStudentError extends Error {
  /** @param {{ student: StudentRecord, reasons: string[] }[]} matches */
  constructor(matches) {
    super("Possible duplicate student record detected.");
    this.name = "DuplicateStudentError";
    this.matches = matches;
  }
}

/**
 * Fast duplicate lookup for FEMA SID field blur.
 * @param {string} femaSid
 * @param {string} [excludeId]
 */
export async function findByFemaSid(femaSid, excludeId) {
  if (!femaSid) return [];
  const snap = await getDocs(query(studentsRef, where("femaSid", "==", femaSid.trim())));
  return snap.docs
    .map((item) => mapStudent(item.id, item.data()))
    .filter((student) => student && student.id !== excludeId);
}

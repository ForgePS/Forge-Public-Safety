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
import { findCertificationTypeByCode } from "./certificationTypes.js";

export const STUDENT_CERTIFICATION_STATUSES = {
  PENDING_REVIEW: "pending_review",
  ACTIVE: "active",
  RENEWAL_DUE: "renewal_due",
  EXPIRED: "expired",
  REVOKED: "revoked",
  DENIED: "denied",
};

export const STUDENT_CERTIFICATION_STATUS_LABELS = {
  [STUDENT_CERTIFICATION_STATUSES.PENDING_REVIEW]: "Pending review",
  [STUDENT_CERTIFICATION_STATUSES.ACTIVE]: "Active",
  [STUDENT_CERTIFICATION_STATUSES.RENEWAL_DUE]: "Renewal due",
  [STUDENT_CERTIFICATION_STATUSES.EXPIRED]: "Expired",
  [STUDENT_CERTIFICATION_STATUSES.REVOKED]: "Revoked",
  [STUDENT_CERTIFICATION_STATUSES.DENIED]: "Denied",
};

/**
 * @typedef {Object} StudentCertificationRecord
 * @property {string} id
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} certificationTypeId
 * @property {string} certificationName
 * @property {string} certificationCode
 * @property {string} courseId
 * @property {string} courseName
 * @property {string} classId
 * @property {string} certificateId
 * @property {string} status
 * @property {string} issuedDate
 * @property {string} expiryDate
 * @property {string} reviewedByUid
 * @property {string} notes
 */

const certificationsRef = collection(db, "studentCertifications");
const auditRef = collection(db, "certificationAuditLog");

function mapCertification(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    certificationTypeId: data.certificationTypeId ?? "",
    certificationName: data.certificationName ?? "",
    certificationCode: data.certificationCode ?? "",
    courseId: data.courseId ?? "",
    courseName: data.courseName ?? "",
    classId: data.classId ?? "",
    certificateId: data.certificateId ?? "",
    status: data.status ?? STUDENT_CERTIFICATION_STATUSES.PENDING_REVIEW,
    issuedDate: data.issuedDate ?? "",
    expiryDate: data.expiryDate ?? "",
    reviewedByUid: data.reviewedByUid ?? "",
    notes: data.notes ?? "",
  };
}

function addYears(dateString, years) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

function refreshComputedStatus(record) {
  if (
    !record.expiryDate ||
    [STUDENT_CERTIFICATION_STATUSES.REVOKED, STUDENT_CERTIFICATION_STATUSES.DENIED, STUDENT_CERTIFICATION_STATUSES.PENDING_REVIEW].includes(
      record.status,
    )
  ) {
    return record.status;
  }

  const today = new Date().toISOString().slice(0, 10);
  if (record.expiryDate < today) {
    return STUDENT_CERTIFICATION_STATUSES.EXPIRED;
  }

  const renewalThreshold = new Date();
  renewalThreshold.setDate(renewalThreshold.getDate() + 60);
  if (record.expiryDate <= renewalThreshold.toISOString().slice(0, 10)) {
    return STUDENT_CERTIFICATION_STATUSES.RENEWAL_DUE;
  }

  return STUDENT_CERTIFICATION_STATUSES.ACTIVE;
}

async function writeAuditEntry(input) {
  await addDoc(auditRef, {
    certificationId: input.certificationId,
    studentId: input.studentId ?? "",
    studentName: input.studentName ?? "",
    action: input.action,
    priorStatus: input.priorStatus ?? "",
    newStatus: input.newStatus ?? "",
    actorUid: input.actorUid ?? "",
    actorName: input.actorName ?? "",
    notes: input.notes?.trim() ?? "",
    createdAt: serverTimestamp(),
  });
}

/** @returns {Promise<StudentCertificationRecord[]>} */
export async function listStudentCertifications() {
  const snap = await getDocs(query(certificationsRef));
  return snap.docs
    .map((item) => {
      const record = mapCertification(item.id, item.data());
      if (!record) return null;
      return { ...record, status: refreshComputedStatus(record) };
    })
    .filter(Boolean)
    .sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));
}

/**
 * @typedef {Object} StudentCertificationSummary
 * @property {number} activeCount
 * @property {number} expiringCount
 * @property {number | null} nearestExpiryDays
 */

function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateString}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** @param {string} studentId @returns {Promise<StudentCertificationSummary>} */
export async function getStudentCertificationSummary(studentId) {
  const rows = await listStudentCertificationsByStudent(studentId);
  const active = rows.filter((item) =>
    [STUDENT_CERTIFICATION_STATUSES.ACTIVE, STUDENT_CERTIFICATION_STATUSES.RENEWAL_DUE].includes(
      item.status,
    ),
  );

  const expiring = active.filter(
    (item) => item.expiryDate && daysUntil(item.expiryDate) <= 60 && daysUntil(item.expiryDate) >= 0,
  );

  const nearestExpiryDays = expiring.length
    ? Math.min(...expiring.map((item) => daysUntil(item.expiryDate)))
    : null;

  return {
    activeCount: active.length,
    expiringCount: expiring.length,
    nearestExpiryDays,
  };
}

/** @param {string} studentId */
export async function listStudentCertificationsByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(certificationsRef, where("studentId", "==", studentId)));
  return snap.docs
    .map((item) => {
      const record = mapCertification(item.id, item.data());
      if (!record) return null;
      return { ...record, status: refreshComputedStatus(record) };
    })
    .filter(Boolean);
}

/** @returns {Promise<StudentCertificationRecord[]>} */
export async function listPendingStudentCertifications() {
  const rows = await listStudentCertifications();
  return rows.filter((item) => item.status === STUDENT_CERTIFICATION_STATUSES.PENDING_REVIEW);
}

/** @returns {Promise<StudentCertificationRecord[]>} */
export async function listRenewalDueCertifications() {
  const rows = await listStudentCertifications();
  return rows.filter((item) =>
    [STUDENT_CERTIFICATION_STATUSES.RENEWAL_DUE, STUDENT_CERTIFICATION_STATUSES.EXPIRED].includes(
      item.status,
    ),
  );
}

/** @param {string} certificationId */
export async function getStudentCertification(certificationId) {
  const snap = await getDoc(doc(db, "studentCertifications", certificationId));
  if (!snap.exists()) return null;
  const record = mapCertification(snap.id, snap.data());
  return record ? { ...record, status: refreshComputedStatus(record) } : null;
}

/**
 * @param {{ certificate: import('./certificates.js').CertificateRecord, course: import('./courses.js').CourseRecord | null, issuedByUid: string }} input
 */
export async function createPendingStudentCertification(input) {
  const certificationType = input.course?.certificationType
    ? await findCertificationTypeByCode(input.course.certificationType)
    : null;

  const certificationName =
    certificationType?.name || input.course?.certificationType || input.certificate.courseName;
  const certificationCode =
    certificationType?.code || input.course?.certificationType || input.certificate.courseNumber;

  if (!certificationName) return null;

  const docRef = await addDoc(certificationsRef, {
    studentId: input.certificate.studentId,
    studentName: input.certificate.studentName,
    certificationTypeId: certificationType?.id ?? "",
    certificationName,
    certificationCode,
    courseId: input.certificate.courseId,
    courseName: input.certificate.courseName,
    classId: input.certificate.classId,
    certificateId: input.certificate.id,
    status: STUDENT_CERTIFICATION_STATUSES.PENDING_REVIEW,
    issuedDate: input.certificate.completionDate,
    expiryDate: "",
    reviewedByUid: "",
    notes: "",
    createdByUid: input.issuedByUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry({
    certificationId: docRef.id,
    studentId: input.certificate.studentId,
    studentName: input.certificate.studentName,
    action: "submitted_for_review",
    priorStatus: "",
    newStatus: STUDENT_CERTIFICATION_STATUSES.PENDING_REVIEW,
    actorUid: input.issuedByUid,
    notes: "Created from course completion certificate.",
  });

  return docRef.id;
}

/** @param {{ certificationId: string, officerUid: string, officerName?: string, validityYears?: number, notes?: string }} input */
export async function approveStudentCertification(input) {
  const record = await getStudentCertification(input.certificationId);
  if (!record) throw new Error("Certification not found.");
  if (record.status !== STUDENT_CERTIFICATION_STATUSES.PENDING_REVIEW) {
    throw new Error("Only pending certifications can be approved.");
  }

  const years = Number(input.validityYears ?? 2);
  const issuedDate = record.issuedDate || new Date().toISOString().slice(0, 10);
  const expiryDate = addYears(issuedDate, years);

  await updateDoc(doc(db, "studentCertifications", input.certificationId), {
    status: STUDENT_CERTIFICATION_STATUSES.ACTIVE,
    issuedDate,
    expiryDate,
    reviewedByUid: input.officerUid,
    notes: input.notes?.trim() ?? record.notes,
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry({
    certificationId: input.certificationId,
    studentId: record.studentId,
    studentName: record.studentName,
    action: "approved",
    priorStatus: record.status,
    newStatus: STUDENT_CERTIFICATION_STATUSES.ACTIVE,
    actorUid: input.officerUid,
    actorName: input.officerName ?? "",
    notes: input.notes ?? "",
  });
}

/** @param {{ certificationId: string, officerUid: string, officerName?: string, notes?: string }} input */
export async function denyStudentCertification(input) {
  const record = await getStudentCertification(input.certificationId);
  if (!record) throw new Error("Certification not found.");

  await updateDoc(doc(db, "studentCertifications", input.certificationId), {
    status: STUDENT_CERTIFICATION_STATUSES.DENIED,
    reviewedByUid: input.officerUid,
    notes: input.notes?.trim() ?? "",
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry({
    certificationId: input.certificationId,
    studentId: record.studentId,
    studentName: record.studentName,
    action: "denied",
    priorStatus: record.status,
    newStatus: STUDENT_CERTIFICATION_STATUSES.DENIED,
    actorUid: input.officerUid,
    actorName: input.officerName ?? "",
    notes: input.notes ?? "",
  });
}

/** @param {{ certificationId: string, officerUid: string, officerName?: string, validityYears?: number, notes?: string }} input */
export async function renewStudentCertification(input) {
  const record = await getStudentCertification(input.certificationId);
  if (!record) throw new Error("Certification not found.");

  const years = Number(input.validityYears ?? 2);
  const issuedDate = new Date().toISOString().slice(0, 10);
  const expiryDate = addYears(issuedDate, years);

  await updateDoc(doc(db, "studentCertifications", input.certificationId), {
    status: STUDENT_CERTIFICATION_STATUSES.ACTIVE,
    issuedDate,
    expiryDate,
    reviewedByUid: input.officerUid,
    notes: input.notes?.trim() ?? record.notes,
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry({
    certificationId: input.certificationId,
    studentId: record.studentId,
    studentName: record.studentName,
    action: "renewed",
    priorStatus: record.status,
    newStatus: STUDENT_CERTIFICATION_STATUSES.ACTIVE,
    actorUid: input.officerUid,
    actorName: input.officerName ?? "",
    notes: input.notes ?? "",
  });
}

/** @param {{ certificationId: string, officerUid: string, officerName?: string, notes?: string }} input */
export async function revokeStudentCertification(input) {
  const record = await getStudentCertification(input.certificationId);
  if (!record) throw new Error("Certification not found.");

  await updateDoc(doc(db, "studentCertifications", input.certificationId), {
    status: STUDENT_CERTIFICATION_STATUSES.REVOKED,
    reviewedByUid: input.officerUid,
    notes: input.notes?.trim() ?? "",
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry({
    certificationId: input.certificationId,
    studentId: record.studentId,
    studentName: record.studentName,
    action: "revoked",
    priorStatus: record.status,
    newStatus: STUDENT_CERTIFICATION_STATUSES.REVOKED,
    actorUid: input.officerUid,
    actorName: input.officerName ?? "",
    notes: input.notes ?? "",
  });
}

/** @param {string} [certificationId] */
export async function listCertificationAuditLog(certificationId) {
  const snap = certificationId
    ? await getDocs(query(auditRef, where("certificationId", "==", certificationId)))
    : await getDocs(query(auditRef));

  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => String(b.createdAt?.seconds ?? 0).localeCompare(String(a.createdAt?.seconds ?? 0)));
}

/** @param {StudentCertificationRecord[]} certifications @param {number} withinDays */
export function countExpiringStudentCertifications(certifications, withinDays = 60) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + withinDays);
  const thresholdDate = threshold.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  return certifications.filter(
    (item) =>
      item.expiryDate &&
      item.status !== STUDENT_CERTIFICATION_STATUSES.REVOKED &&
      item.status !== STUDENT_CERTIFICATION_STATUSES.DENIED &&
      item.expiryDate >= today &&
      item.expiryDate <= thresholdDate,
  ).length;
}

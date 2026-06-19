import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";
import {
  COMPLETION_STATUSES,
  completionId,
  getCompletion,
} from "./completions.js";
import { getClassSession } from "./classes.js";
import { getCourse } from "./courses.js";
import { getStudent } from "./students.js";
import { createPendingStudentCertification } from "./studentCertifications.js";
import { resolveCertificateTemplate } from "./certificateTemplates.js";
import { assignNextCertificateNumber } from "./certificateSerialNumbers.js";

export const CERTIFICATE_STATUSES = {
  ISSUED: "issued",
  PENDING_RELEASE: "pending_release",
  REVOKED: "revoked",
};

/**
 * @typedef {Object} CertificateRecord
 * @property {string} id
 * @property {string} certificateNumber
 * @property {string} validationCode
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} courseId
 * @property {string} courseName
 * @property {string} courseNumber
 * @property {string} classId
 * @property {string} completionDate
 * @property {number} hours
 * @property {string} location
 * @property {string} instructorNames
 * @property {string} status
 * @property {string} issuedByUid
 * @property {string} templateId
 */

const certificatesRef = collection(db, "certificates");

function mapCertificate(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    certificateNumber: data.certificateNumber ?? "",
    validationCode: data.validationCode ?? "",
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    courseId: data.courseId ?? "",
    courseName: data.courseName ?? "",
    courseNumber: data.courseNumber ?? "",
    classId: data.classId ?? "",
    completionDate: data.completionDate ?? "",
    hours: Number(data.hours ?? 0),
    location: data.location ?? "",
    instructorNames: data.instructorNames ?? "",
    status: data.status ?? CERTIFICATE_STATUSES.ISSUED,
    issuedByUid: data.issuedByUid ?? "",
    templateId: data.templateId ?? "",
  };
}

function generateValidationCode() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

/**
 * @param {{
 *   studentId: string,
 *   studentName: string,
 *   courseId: string,
 *   courseName: string,
 *   courseNumber: string,
 *   classId?: string,
 *   completionDate: string,
 *   hours: number,
 *   location?: string,
 *   instructorNames?: string,
 *   issuedByUid: string,
 *   template?: { id?: string, serialPrefix?: string } | null,
 * }} input
 */
async function persistIssuedCertificate(input) {
  const validationCode = generateValidationCode();
  const template = input.template ?? null;
  const certificateNumber = await assignNextCertificateNumber({
    courseId: input.courseId,
    courseNumber: input.courseNumber,
    serialPrefix: template?.serialPrefix,
  });

  const docRef = await addDoc(certificatesRef, {
    certificateNumber,
    validationCode,
    studentId: input.studentId,
    studentName: input.studentName,
    courseId: input.courseId,
    courseName: input.courseName,
    courseNumber: input.courseNumber,
    classId: input.classId ?? "",
    completionDate: input.completionDate,
    hours: input.hours,
    location: input.location ?? "",
    instructorNames: input.instructorNames ?? "",
    templateId: template?.id ?? "",
    status: CERTIFICATE_STATUSES.ISSUED,
    issuedByUid: input.issuedByUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, "publicCertificateLookup", validationCode), {
    certificateId: docRef.id,
    certificateNumber,
    studentName: input.studentName,
    courseId: input.courseId,
    courseName: input.courseName,
    courseNumber: input.courseNumber,
    templateId: template?.id ?? "",
    completionDate: input.completionDate,
    hours: input.hours,
    location: input.location ?? "",
    status: CERTIFICATE_STATUSES.ISSUED,
    updatedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    certificateNumber,
    validationCode,
    studentId: input.studentId,
    studentName: input.studentName,
    courseId: input.courseId,
    courseName: input.courseName,
    courseNumber: input.courseNumber,
    classId: input.classId ?? "",
    completionDate: input.completionDate,
    hours: input.hours,
    location: input.location ?? "",
    instructorNames: input.instructorNames ?? "",
    status: CERTIFICATE_STATUSES.ISSUED,
    issuedByUid: input.issuedByUid,
    templateId: template?.id ?? "",
  };
}

/** @param {string} classId */
export async function listCertificatesByClass(classId) {
  if (!classId) return [];
  const snap = await getDocs(query(certificatesRef, where("classId", "==", classId)));
  return snap.docs
    .map((item) => mapCertificate(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/** @returns {Promise<CertificateRecord[]>} */
export async function listCertificates() {
  const snap = await getDocs(query(certificatesRef));
  return snap.docs
    .map((item) => mapCertificate(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => b.completionDate.localeCompare(a.completionDate));
}

/** @param {string} studentId */
export async function listCertificatesByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(certificatesRef, where("studentId", "==", studentId)));
  return snap.docs
    .map((item) => mapCertificate(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => b.completionDate.localeCompare(a.completionDate));
}

/** @param {string} certificateId */
export async function getCertificate(certificateId) {
  const snap = await getDoc(doc(db, "certificates", certificateId));
  if (!snap.exists()) return null;
  return mapCertificate(snap.id, snap.data());
}

/** @param {string} validationCode */
export async function getPublicCertificateLookup(validationCode) {
  const snap = await getDoc(doc(db, "publicCertificateLookup", validationCode.toUpperCase()));
  if (!snap.exists()) return null;
  return snap.data();
}

/**
 * @param {{ classId: string, studentId: string, issuedByUid: string }} input
 * @returns {Promise<string>}
 */
export async function issueCertificate(input) {
  const completion = await getCompletion(input.classId, input.studentId);
  if (!completion) {
    throw new Error("Completion record not found. Run completion evaluation first.");
  }
  if (completion.status !== COMPLETION_STATUSES.ELIGIBLE) {
    throw new Error("Student is not eligible for certificate issuance.");
  }
  if (completion.certificateId) {
    throw new Error("Certificate has already been issued for this completion.");
  }

  const classSession = await getClassSession(input.classId);
  const template = await resolveCertificateTemplate({ courseId: completion.courseId });
  const completionDate = new Date().toISOString().slice(0, 10);

  const certificateRecord = await persistIssuedCertificate({
    studentId: completion.studentId,
    studentName: completion.studentName,
    courseId: completion.courseId,
    courseName: completion.courseName,
    courseNumber: completion.courseNumber,
    classId: completion.classId,
    completionDate,
    hours: completion.hours,
    location: classSession?.location ?? "",
    instructorNames: classSession?.instructorNames?.join(", ") ?? "",
    issuedByUid: input.issuedByUid,
    template,
  });

  await setDoc(
    doc(db, "completions", completionId(input.classId, input.studentId)),
    {
      status: COMPLETION_STATUSES.ISSUED,
      certificateId: certificateRecord.id,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const course = await getCourse(completion.courseId);

  if (course?.certificationType) {
    await createPendingStudentCertification({
      certificate: certificateRecord,
      course,
      issuedByUid: input.issuedByUid,
    });
  }

  return certificateRecord.id;
}

/**
 * Issue a certificate directly for a student without roster/completion workflow.
 * @param {{
 *   studentId: string,
 *   courseId: string,
 *   issuedByUid: string,
 *   completionDate?: string,
 *   hours?: number,
 *   location?: string,
 *   instructorNames?: string,
 *   classId?: string,
 * }} input
 * @returns {Promise<string>}
 */
export async function issueManualCertificate(input) {
  if (!input.studentId) throw new Error("Student is required.");
  if (!input.courseId) throw new Error("Course is required.");

  const [student, course] = await Promise.all([
    getStudent(input.studentId),
    getCourse(input.courseId),
  ]);
  if (!student) throw new Error("Student not found.");
  if (!course) throw new Error("Course not found.");

  const studentName = `${student.firstName} ${student.lastName}`.trim();
  if (!studentName) throw new Error("Student name is required.");

  const template = await resolveCertificateTemplate({ courseId: course.id });
  const completionDate = input.completionDate || new Date().toISOString().slice(0, 10);
  const hours = input.hours ?? course.hours ?? 0;

  const certificateRecord = await persistIssuedCertificate({
    studentId: student.id,
    studentName,
    courseId: course.id,
    courseName: course.name,
    courseNumber: course.courseNumber,
    classId: input.classId ?? "",
    completionDate,
    hours,
    location: input.location ?? "",
    instructorNames: input.instructorNames ?? "",
    issuedByUid: input.issuedByUid,
    template,
  });

  if (course.certificationType) {
    await createPendingStudentCertification({
      certificate: certificateRecord,
      course,
      issuedByUid: input.issuedByUid,
    });
  }

  return certificateRecord.id;
}

/** @param {string} certificateId */
export async function revokeCertificate(certificateId) {
  const certificate = await getCertificate(certificateId);
  if (!certificate) throw new Error("Certificate not found.");

  await updateDoc(doc(db, "certificates", certificateId), {
    status: CERTIFICATE_STATUSES.REVOKED,
    updatedAt: serverTimestamp(),
  });

  if (certificate.validationCode) {
    await setDoc(
      doc(db, "publicCertificateLookup", certificate.validationCode),
      {
        status: CERTIFICATE_STATUSES.REVOKED,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

/** @param {string} validationCode */
export function buildVerificationUrl(validationCode) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/verify/${validationCode}`;
  }
  return `/verify/${validationCode}`;
}

/** @param {string} validationCode */
export function buildQrCodeUrl(validationCode) {
  const target = buildVerificationUrl(validationCode);
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(target)}`;
}

/** @param {string} validationCode */
export async function validateCertificateCode(validationCode) {
  const lookup = await getPublicCertificateLookup(validationCode);
  if (!lookup) {
    return { valid: false, message: "Certificate not found.", certificate: null };
  }
  if (lookup.status === CERTIFICATE_STATUSES.REVOKED) {
    return { valid: false, message: "This certificate has been revoked.", certificate: lookup };
  }
  if (lookup.status === CERTIFICATE_STATUSES.PENDING_RELEASE) {
    return { valid: false, message: "This certificate is pending release and cannot be verified yet.", certificate: lookup };
  }
  return { valid: true, message: "Certificate is valid.", certificate: lookup };
}

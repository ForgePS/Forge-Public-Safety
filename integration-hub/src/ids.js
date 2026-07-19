import { randomUUID } from "crypto";

/** @param {string} [prefix] */
export function newForgeId(prefix) {
  const id = randomUUID().replace(/-/g, "");
  return prefix ? `${prefix}_${id}` : id;
}

export function newEventId() {
  return `evt_${randomUUID().replace(/-/g, "")}`;
}

export function newCorrelationId() {
  return `cor_${randomUUID().replace(/-/g, "")}`;
}

export const FORGE_ID_NAMESPACES = {
  person: "forgePersonId",
  department: "forgeDepartmentId",
  academyStudent: "forgeAcademyStudentId",
  course: "forgeCourseId",
  class: "forgeClassId",
  enrollment: "forgeEnrollmentId",
  invoice: "forgeInvoiceId",
  payment: "forgePaymentId",
  certificate: "forgeCertificateId",
  transaction: "forgeTransactionId",
};

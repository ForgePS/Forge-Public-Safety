/** @typedef {'studentName' | 'courseName' | 'courseNumber' | 'courseInfo' | 'certificateNumber' | 'completionDate' | 'hours' | 'location' | 'instructorNames' | 'issuerName' | 'issuerTitle' | 'description'} CertificateMergeKey */

/**
 * @typedef {Object} CertificateTemplateField
 * @property {string} id
 * @property {'merge' | 'static'} type
 * @property {CertificateMergeKey | ''} mergeKey
 * @property {string} staticText
 * @property {string} label
 * @property {number} x
 * @property {number} y
 * @property {number} [width]
 * @property {number} fontSize
 * @property {string} fontFamily
 * @property {string} fontWeight
 * @property {string} fontStyle
 * @property {'left' | 'center' | 'right'} align
 * @property {string} color
 * @property {boolean} underline
 */

export const CERTIFICATE_FONT_FAMILIES = [
  { value: '"Times New Roman", Times, Georgia, serif', label: "Times New Roman" },
  { value: 'Georgia, "Times New Roman", serif', label: "Georgia" },
  { value: 'Arial, Helvetica, sans-serif', label: "Arial" },
  { value: 'Helvetica, Arial, sans-serif', label: "Helvetica" },
  { value: '"Courier New", Courier, monospace', label: "Courier New" },
];

export const CERTIFICATE_MERGE_KEYS = [
  { value: "studentName", label: "Student name" },
  { value: "courseName", label: "Course name" },
  { value: "courseNumber", label: "Course number" },
  { value: "courseInfo", label: "Course name & number" },
  { value: "certificateNumber", label: "Serial / certificate number" },
  { value: "completionDate", label: "Completion date" },
  { value: "hours", label: "Training hours" },
  { value: "location", label: "Location" },
  { value: "instructorNames", label: "Instructor names" },
  { value: "issuerName", label: "Issuer name" },
  { value: "issuerTitle", label: "Issuer title" },
  { value: "description", label: "Description text" },
];

/** @param {string} dateValue */
export function formatCertificateDate(dateValue) {
  if (!dateValue) return "";
  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * @param {Record<string, unknown>} certificate
 * @param {CertificateMergeKey | string} mergeKey
 * @param {{ descriptionText?: string, issuerName?: string, issuerTitle?: string }} [templateContext]
 */
export function resolveCertificateMergeValue(certificate, mergeKey, templateContext = {}) {
  switch (mergeKey) {
    case "studentName":
      return String(certificate.studentName ?? "");
    case "courseName":
      return String(certificate.courseName ?? "");
    case "courseNumber":
      return String(certificate.courseNumber ?? "");
    case "courseInfo":
      return [certificate.courseName, certificate.courseNumber].filter(Boolean).join(" · ");
    case "certificateNumber":
      return String(certificate.certificateNumber ?? "");
    case "completionDate":
      return formatCertificateDate(String(certificate.completionDate ?? ""));
    case "hours":
      return certificate.hours ? `${certificate.hours}` : "";
    case "location":
      return String(certificate.location ?? "");
    case "instructorNames":
      return String(certificate.instructorNames ?? "");
    case "issuerName":
      return String(templateContext.issuerName ?? certificate.issuerName ?? "");
    case "issuerTitle":
      return String(templateContext.issuerTitle ?? certificate.issuerTitle ?? "");
    case "description":
      return String(templateContext.descriptionText ?? certificate.description ?? "");
    default:
      return "";
  }
}

/**
 * @param {CertificateTemplateField} field
 * @param {Record<string, unknown>} certificate
 * @param {{ descriptionText?: string, issuerName?: string, issuerTitle?: string }} [templateContext]
 */
export function resolveCertificateFieldValue(field, certificate, templateContext = {}) {
  if (field.type === "static") return field.staticText ?? "";
  return resolveCertificateMergeValue(certificate, field.mergeKey, templateContext);
}

/** @returns {CertificateTemplateField} */
export function createCertificateTemplateField(overrides = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID?.() ?? `${Date.now()}`,
    type: overrides.type ?? "merge",
    mergeKey: overrides.mergeKey ?? "studentName",
    staticText: overrides.staticText ?? "",
    label: overrides.label ?? "Field",
    x: overrides.x ?? 50,
    y: overrides.y ?? 50,
    width: overrides.width ?? 80,
    fontSize: overrides.fontSize ?? 16,
    fontFamily: overrides.fontFamily ?? CERTIFICATE_FONT_FAMILIES[0].value,
    fontWeight: overrides.fontWeight ?? "normal",
    fontStyle: overrides.fontStyle ?? "normal",
    align: overrides.align ?? "center",
    color: overrides.color ?? "#1a1a1a",
    underline: overrides.underline ?? false,
  };
}

/** @param {Partial<CertificateTemplateField>} field */
export function normalizeCertificateTemplateField(field = {}) {
  return createCertificateTemplateField(field);
}

export const CERTIFICATE_LAYOUT_WIDTH = 960;
export const CERTIFICATE_ASPECT_WIDTH = 833;
export const CERTIFICATE_ASPECT_HEIGHT = 661;
export const CERTIFICATE_LAYOUT_HEIGHT =
  (CERTIFICATE_LAYOUT_WIDTH * CERTIFICATE_ASPECT_HEIGHT) / CERTIFICATE_ASPECT_WIDTH;

/** @param {CertificateTemplateField} field */
export function buildCertificateFieldStyle(field) {
  const align = field.align || "center";
  const position =
    align === "left"
      ? { left: `${field.x}%`, transform: "translate(0, -50%)" }
      : align === "right"
        ? { left: `${field.x}%`, transform: "translate(-100%, -50%)" }
        : { left: `${field.x}%`, transform: "translate(-50%, -50%)" };

  const fontSize = Number(field.fontSize ?? 16);

  return {
    ...position,
    top: `${field.y}%`,
    width: field.width ? `${field.width}%` : "max-content",
    maxWidth: field.width ? `${field.width}%` : "90%",
    minHeight: "1em",
    height: "auto",
    fontSize: `${fontSize}px`,
    fontFamily: field.fontFamily || CERTIFICATE_FONT_FAMILIES[0].value,
    fontWeight: field.fontWeight || "normal",
    fontStyle: field.fontStyle || "normal",
    color: field.color,
    textAlign: align,
    textDecoration: field.underline ? "underline" : "none",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: 1.25,
  };
}

export const DEFAULT_AFTA_IFSAC_DESCRIPTION =
  "This certification is awarded for successful completion of requirements as established by the NFPA 1031 Standard for Professional Qualifications for Fire Inspector and Plan Examiner";

/** Default positioned fields for custom-image templates based on the AFTA IFSAC layout. */
export const DEFAULT_CUSTOM_IMAGE_FIELDS = [
  createCertificateTemplateField({
    id: "studentName",
    type: "merge",
    mergeKey: "studentName",
    label: "Student name",
    x: 50,
    y: 42,
    width: 70,
    fontSize: 26,
    fontWeight: "bold",
    align: "center",
    underline: true,
  }),
  createCertificateTemplateField({
    id: "courseName",
    type: "merge",
    mergeKey: "courseName",
    label: "Course name",
    x: 50,
    y: 54,
    width: 70,
    fontSize: 22,
    fontWeight: "bold",
    align: "center",
  }),
  createCertificateTemplateField({
    id: "certificateNumber",
    type: "merge",
    mergeKey: "certificateNumber",
    label: "Serial number",
    x: 14,
    y: 90,
    width: 30,
    fontSize: 11,
    fontWeight: "normal",
    align: "left",
  }),
  createCertificateTemplateField({
    id: "completionDate",
    type: "merge",
    mergeKey: "completionDate",
    label: "Date",
    x: 50,
    y: 90,
    width: 30,
    fontSize: 12,
    fontWeight: "normal",
    align: "center",
  }),
];

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
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase.js";
import {
  DEFAULT_AFTA_IFSAC_DESCRIPTION,
  DEFAULT_CUSTOM_IMAGE_FIELDS,
  CERTIFICATE_LAYOUT_WIDTH,
  normalizeCertificateTemplateField,
} from "./certificateTemplateFields.js";
import { deleteCertificateTemplateAsset } from "./certificateTemplateStorage.js";
import { clearCertificateTemplateFromCourses, getCourse, updateCourse } from "./courses.js";

export const CERTIFICATE_TEMPLATE_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const CERTIFICATE_LAYOUT_TYPES = {
  BUILT_IN: "built-in",
  CUSTOM_IMAGE: "custom-image",
};

export const BUILT_IN_CERTIFICATE_LAYOUTS = {
  AFTA_IFSAC: "afta-ifsac",
  LEGACY: "legacy",
};

/**
 * @typedef {import('./certificateTemplateFields.js').CertificateTemplateField} CertificateTemplateField
 */

/**
 * @typedef {Object} CertificateTemplateRecord
 * @property {string} id
 * @property {string} name
 * @property {string} status
 * @property {boolean} isDefault
 * @property {string} layoutType
 * @property {string} builtInKey
 * @property {string} backgroundUrl
 * @property {string} backgroundStoragePath
 * @property {string} signatureUrl
 * @property {string} signatureStoragePath
 * @property {string} descriptionText
 * @property {string} serialPrefix
 * @property {CertificateTemplateField[]} fields
 * @property {string} courseId
 * @property {string} courseName
 * @property {string} courseNumber
 * @property {boolean} showQr
 * @property {string} issuerNameOverride
 * @property {string} issuerTitleOverride
 */

/** @returns {import('./certificateTemplates.js').CertificateTemplateRecord} */
export function getBuiltInFallbackTemplate() {
  const seed = getDefaultAftaIfsacTemplateSeed();
  return { id: "built-in-afta-ifsac", ...seed };
}

/** @returns {Partial<CertificateTemplateRecord>} */
export function getDefaultAftaIfsacTemplateSeed() {
  return {
    name: "AFTA IFSAC Certification",
    status: CERTIFICATE_TEMPLATE_STATUSES.ACTIVE,
    isDefault: true,
    layoutType: CERTIFICATE_LAYOUT_TYPES.BUILT_IN,
    builtInKey: BUILT_IN_CERTIFICATE_LAYOUTS.AFTA_IFSAC,
    backgroundUrl: "",
    backgroundStoragePath: "",
    signatureUrl: "",
    signatureStoragePath: "",
    descriptionText: DEFAULT_AFTA_IFSAC_DESCRIPTION,
    serialPrefix: "0002AR",
    fields: DEFAULT_CUSTOM_IMAGE_FIELDS,
    courseId: "",
    courseName: "",
    courseNumber: "",
    showQr: false,
    issuerNameOverride: "",
    issuerTitleOverride: "",
  };
}

/** Design reference width (px) for custom-image field positions and font scaling. */
export {
  CERTIFICATE_LAYOUT_WIDTH,
  CERTIFICATE_LAYOUT_HEIGHT,
  CERTIFICATE_ASPECT_WIDTH,
  CERTIFICATE_ASPECT_HEIGHT,
} from "./certificateTemplateFields.js";

/** @param {CertificateTemplateRecord | null | undefined} template */
export function prepareCertificateTemplateForDisplay(template) {
  if (!template) return template ?? null;

  const useCustomImage =
    template.layoutType === CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE || Boolean(template.backgroundUrl);

  return {
    ...template,
    layoutType: useCustomImage ? CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE : template.layoutType,
    fields: Array.isArray(template.fields)
      ? template.fields.map((field) => normalizeCertificateTemplateField(field))
      : DEFAULT_CUSTOM_IMAGE_FIELDS.map((field) => normalizeCertificateTemplateField(field)),
  };
}

/** @param {string | undefined} templateId */
function isPersistedTemplateId(templateId) {
  return Boolean(templateId && !templateId.startsWith("built-in-"));
}

/** @param {string} id @param {Record<string, unknown>} data */
function mapTemplate(id, data) {
  if (!data || typeof data !== "object") return null;
  return prepareCertificateTemplateForDisplay({
    id,
    name: data.name ?? "",
    status: data.status ?? CERTIFICATE_TEMPLATE_STATUSES.ACTIVE,
    isDefault: Boolean(data.isDefault),
    layoutType: data.layoutType ?? CERTIFICATE_LAYOUT_TYPES.BUILT_IN,
    builtInKey: data.builtInKey ?? BUILT_IN_CERTIFICATE_LAYOUTS.AFTA_IFSAC,
    backgroundUrl: data.backgroundUrl ?? "",
    backgroundStoragePath: data.backgroundStoragePath ?? "",
    signatureUrl: data.signatureUrl ?? "",
    signatureStoragePath: data.signatureStoragePath ?? "",
    descriptionText: data.descriptionText ?? DEFAULT_AFTA_IFSAC_DESCRIPTION,
    serialPrefix: data.serialPrefix ?? "0002AR",
    fields: Array.isArray(data.fields) ? data.fields : DEFAULT_CUSTOM_IMAGE_FIELDS,
    courseId: data.courseId ?? "",
    courseName: data.courseName ?? "",
    courseNumber: data.courseNumber ?? "",
    showQr: data.showQr !== false,
    issuerNameOverride: data.issuerNameOverride ?? "",
    issuerTitleOverride: data.issuerTitleOverride ?? "",
  });
}

const templatesRef = collection(db, "certificateTemplates");

/** @returns {Promise<CertificateTemplateRecord[]>} */
export async function listCertificateTemplates() {
  const snap = await getDocs(query(templatesRef));
  return snap.docs
    .map((item) => mapTemplate(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/** @param {string} templateId */
export async function getCertificateTemplate(templateId) {
  if (!templateId) return null;
  const snap = await getDoc(doc(db, "certificateTemplates", templateId));
  if (!snap.exists()) return null;
  return mapTemplate(snap.id, snap.data());
}

/** @returns {Promise<CertificateTemplateRecord | null>} */
export async function getDefaultCertificateTemplate() {
  const templates = await listCertificateTemplates();
  return (
    templates.find(
      (template) =>
        template.isDefault && template.status === CERTIFICATE_TEMPLATE_STATUSES.ACTIVE,
    ) ?? null
  );
}

/** @param {string} courseId */
export async function getCertificateTemplateForCourse(courseId) {
  if (!courseId) return getDefaultCertificateTemplate();

  const course = await getCourse(courseId);
  if (course?.certificateTemplateId) {
    const template = await getCertificateTemplate(course.certificateTemplateId);
    if (template && template.status === CERTIFICATE_TEMPLATE_STATUSES.ACTIVE) {
      return template;
    }
  }

  const templates = await listCertificateTemplates();
  const courseTemplate = templates.find(
    (template) =>
      template.courseId === courseId && template.status === CERTIFICATE_TEMPLATE_STATUSES.ACTIVE,
  );
  if (courseTemplate) return courseTemplate;

  return getDefaultCertificateTemplate();
}

/**
 * @param {{ certificate?: { templateId?: string, courseId?: string } | null, courseId?: string, templateId?: string }} input
 * @returns {Promise<CertificateTemplateRecord | null>}
 */
export async function resolveCertificateTemplate(input = {}) {
  const templateId = input.templateId ?? input.certificate?.templateId;
  const courseId = input.courseId ?? input.certificate?.courseId;

  if (isPersistedTemplateId(templateId)) {
    const template = await getCertificateTemplate(templateId);
    if (template) return prepareCertificateTemplateForDisplay(template);
  }

  if (courseId) {
    const courseTemplate = await getCertificateTemplateForCourse(courseId);
    if (courseTemplate) return prepareCertificateTemplateForDisplay(courseTemplate);
  }

  const defaultTemplate = await getDefaultCertificateTemplate();
  if (defaultTemplate) return prepareCertificateTemplateForDisplay(defaultTemplate);

  return prepareCertificateTemplateForDisplay(getBuiltInFallbackTemplate());
}

/** @param {Partial<CertificateTemplateRecord>} input */
export async function createCertificateTemplate(input) {
  if (!input.name?.trim()) throw new Error("Template name is required.");

  const payload = {
    ...getDefaultAftaIfsacTemplateSeed(),
    ...input,
    name: input.name.trim(),
    status: input.status || CERTIFICATE_TEMPLATE_STATUSES.ACTIVE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (payload.backgroundUrl && payload.layoutType !== CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE) {
    payload.layoutType = CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE;
  }

  const docRef = await addDoc(templatesRef, payload);
  if (payload.isDefault) {
    await clearOtherDefaultTemplates(docRef.id);
  }
  if (payload.courseId) {
    await updateCourse(payload.courseId, { certificateTemplateId: docRef.id });
  }
  return docRef.id;
}

/** @param {string} templateId @param {Partial<CertificateTemplateRecord>} input */
export async function updateCertificateTemplate(templateId, input) {
  const updates = {
    updatedAt: serverTimestamp(),
  };

  if (input.name != null) updates.name = input.name.trim();
  if (input.status != null) updates.status = input.status;
  if (input.isDefault != null) updates.isDefault = input.isDefault;
  if (input.layoutType != null) updates.layoutType = input.layoutType;
  if (input.builtInKey != null) updates.builtInKey = input.builtInKey;
  if (input.backgroundUrl != null) {
    updates.backgroundUrl = input.backgroundUrl;
    if (input.backgroundUrl) {
      updates.layoutType = CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE;
    }
  }
  if (input.backgroundStoragePath != null) updates.backgroundStoragePath = input.backgroundStoragePath;
  if (input.signatureUrl != null) updates.signatureUrl = input.signatureUrl;
  if (input.signatureStoragePath != null) updates.signatureStoragePath = input.signatureStoragePath;
  if (input.descriptionText != null) updates.descriptionText = input.descriptionText;
  if (input.serialPrefix != null) updates.serialPrefix = input.serialPrefix;
  if (input.fields != null) updates.fields = input.fields;
  if (input.courseId != null) updates.courseId = input.courseId;
  if (input.courseName != null) updates.courseName = input.courseName;
  if (input.courseNumber != null) updates.courseNumber = input.courseNumber;
  if (input.showQr != null) updates.showQr = input.showQr;
  if (input.issuerNameOverride != null) updates.issuerNameOverride = input.issuerNameOverride;
  if (input.issuerTitleOverride != null) updates.issuerTitleOverride = input.issuerTitleOverride;

  await updateDoc(doc(db, "certificateTemplates", templateId), updates);

  if (input.isDefault) {
    await clearOtherDefaultTemplates(templateId);
  }

  if (input.courseId != null && input.courseId) {
    await updateCourse(input.courseId, { certificateTemplateId: templateId });
  }
}

/** @param {string} keepTemplateId */
async function clearOtherDefaultTemplates(keepTemplateId) {
  const snap = await getDocs(query(templatesRef, where("isDefault", "==", true)));
  const batch = writeBatch(db);
  let hasUpdates = false;
  snap.docs.forEach((item) => {
    if (item.id === keepTemplateId) return;
    batch.update(item.ref, { isDefault: false, updatedAt: serverTimestamp() });
    hasUpdates = true;
  });
  if (hasUpdates) await batch.commit();
}

/** @param {string} templateId */
export async function deleteCertificateTemplate(templateId) {
  if (!templateId) throw new Error("Template ID is required.");

  const template = await getCertificateTemplate(templateId);
  if (!template) throw new Error("Template not found.");

  const templates = await listCertificateTemplates();
  if (templates.length <= 1) {
    throw new Error("Cannot delete the only remaining certificate template.");
  }

  await clearCertificateTemplateFromCourses(templateId);
  await deleteCertificateTemplateAsset(template.backgroundStoragePath);
  await deleteCertificateTemplateAsset(template.signatureStoragePath);

  const wasDefault = template.isDefault;
  await deleteDoc(doc(db, "certificateTemplates", templateId));

  if (wasDefault) {
    await ensureDefaultCertificateTemplate();
  }
}

/** Ensures at least one default template exists. @returns {Promise<string>} */
export async function ensureDefaultCertificateTemplate() {
  try {
    const existing = await getDefaultCertificateTemplate();
    if (existing) return existing.id;
    const templates = await listCertificateTemplates();
    if (templates.length > 0) {
      await updateCertificateTemplate(templates[0].id, { isDefault: true });
      return templates[0].id;
    }
    return createCertificateTemplate(getDefaultAftaIfsacTemplateSeed());
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "permission-denied") {
      throw new Error(
        "Missing or insufficient permissions to manage certificate templates. Confirm your account has academy admin access.",
      );
    }
    throw err;
  }
}

/**
 * @param {string} serialPrefix
 * @returns {Promise<string>}
 * @deprecated Use assignNextCertificateNumber from certificateSerialNumbers.js
 */
export async function generateTemplateCertificateNumber(serialPrefix = "0002AR") {
  const { assignSerialFromPrefix } = await import("./certificateSerialNumbers.js");
  return assignSerialFromPrefix(serialPrefix);
}

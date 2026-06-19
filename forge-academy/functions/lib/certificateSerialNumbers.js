import { FieldValue, getFirestore } from "firebase-admin/firestore";

const db = () => getFirestore();

async function resolveTemplateForCourse(courseId) {
  if (!courseId) return null;
  const courseSnap = await db().doc(`courses/${courseId}`).get();
  const course = courseSnap.exists ? courseSnap.data() : null;
  if (course?.certificateTemplateId) {
    const templateSnap = await db().doc(`certificateTemplates/${course.certificateTemplateId}`).get();
    if (templateSnap.exists) return templateSnap.data();
  }
  const byCourseSnap = await db()
    .collection("certificateTemplates")
    .where("courseId", "==", courseId)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (!byCourseSnap.empty) return byCourseSnap.docs[0].data();
  const defaultSnap = await db()
    .collection("certificateTemplates")
    .where("isDefault", "==", true)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (!defaultSnap.empty) return defaultSnap.docs[0].data();
  return { serialPrefix: "0002AR" };
}

export async function assignSerialFromPrefix(serialPrefix) {
  const key = (serialPrefix || "0002AR").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase() || "0002AR";
  const counterRef = db().doc(`certificateCounters/${key}`);

  return db().runTransaction(async (transaction) => {
    const snap = await transaction.get(counterRef);
    const nextSequence = snap.exists ? Number(snap.data().nextSequence ?? 1) : 1;
    transaction.set(
      counterRef,
      {
        serialPrefix: key,
        nextSequence: nextSequence + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return `${key}-${String(nextSequence).padStart(7, "0")}`;
  });
}

export async function assignSerialFromCourseNumber(courseNumber) {
  const prefix = (courseNumber || "CERT").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "CERT";
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const counterRef = db().doc(`certificateCounters/${key}`);

  return db().runTransaction(async (transaction) => {
    const snap = await transaction.get(counterRef);
    const nextSequence = snap.exists ? Number(snap.data().nextSequence ?? 1) : 1;
    transaction.set(
      counterRef,
      {
        serialPrefix: key,
        nextSequence: nextSequence + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return `${key}-${String(nextSequence).padStart(4, "0")}`;
  });
}

export async function assignNextCertificateNumber({ courseId, courseNumber, serialPrefix } = {}) {
  if (serialPrefix) return assignSerialFromPrefix(serialPrefix);
  const template = courseId ? await resolveTemplateForCourse(courseId) : null;
  if (template?.serialPrefix) return assignSerialFromPrefix(template.serialPrefix);
  return assignSerialFromCourseNumber(courseNumber ?? "");
}

export async function resolveCertificateTemplateId(courseId) {
  if (!courseId) return "";
  const courseSnap = await db().doc(`courses/${courseId}`).get();
  const course = courseSnap.exists ? courseSnap.data() : null;
  if (course?.certificateTemplateId) return course.certificateTemplateId;
  const byCourseSnap = await db()
    .collection("certificateTemplates")
    .where("courseId", "==", courseId)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (!byCourseSnap.empty) return byCourseSnap.docs[0].id;
  const defaultSnap = await db()
    .collection("certificateTemplates")
    .where("isDefault", "==", true)
    .where("status", "==", "active")
    .limit(1)
    .get();
  return defaultSnap.empty ? "" : defaultSnap.docs[0].id;
}

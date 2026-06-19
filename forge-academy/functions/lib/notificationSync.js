import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = () => getFirestore();

export function buildNotificationId(recipientUid, type, entityId) {
  return `${recipientUid}_${type}_${entityId}`;
}

/**
 * @param {{
 *   recipientUid: string,
 *   type: string,
 *   entityType: string,
 *   entityId: string,
 *   title: string,
 *   body: string,
 *   link: string,
 *   priority?: number,
 * }} input
 */
export async function upsertNotification(input) {
  const id = buildNotificationId(input.recipientUid, input.type, input.entityId);
  const ref = db().doc(`notifications/${id}`);
  const existing = await ref.get();
  await ref.set(
    {
      recipientUid: input.recipientUid,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      title: input.title,
      body: input.body,
      link: input.link,
      priority: input.priority ?? 0,
      source: "sync",
      read: existing.exists ? Boolean(existing.data()?.read) : false,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: existing.exists ? existing.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

/** @param {string} recipientUid @param {Set<string>} activeIds */
async function pruneStaleNotifications(recipientUid, activeIds) {
  const snap = await db()
    .collection("notifications")
    .where("recipientUid", "==", recipientUid)
    .where("source", "==", "sync")
    .get();

  const batch = db().batch();
  let deletes = 0;
  for (const doc of snap.docs) {
    if (!activeIds.has(doc.id)) {
      batch.delete(doc.ref);
      deletes += 1;
    }
  }
  if (deletes > 0) await batch.commit();
}

async function getUser(uid) {
  const snap = await db().doc(`users/${uid}`).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function listAdminUids() {
  const snap = await db().collection("users").get();
  return snap.docs
    .filter((doc) => ["academy_admin", "super_admin", "creator"].includes(doc.data()?.role))
    .map((doc) => doc.id);
}

async function syncAdminNotifications(uid) {
  const activeIds = new Set();

  const [pendingAcademy, releaseQueue, retests, challenges, gradingQueue] = await Promise.all([
    db().collection("registrations").where("status", "==", "pending_academy").limit(40).get(),
    db().collection("certificateReleaseQueue").where("status", "==", "pending_admin_review").limit(40).get(),
    db().collection("retestRequests").where("status", "==", "requested").limit(40).get(),
    db().collection("challengeTestRequests").where("status", "==", "requested").limit(40).get(),
    db().collection("manualGradingQueue").where("status", "==", "pending").limit(40).get(),
  ]);

  for (const doc of pendingAcademy.docs) {
    const data = doc.data();
    const id = await upsertNotification({
      recipientUid: uid,
      type: "registration_pending_academy",
      entityType: "registrations",
      entityId: doc.id,
      title: "Registration awaiting academy approval",
      body: `${data.studentName || data.studentId || "Student"} submitted a registration.`,
      link: "/admin/registrations",
      priority: 2,
    });
    activeIds.add(id);
  }

  for (const doc of releaseQueue.docs) {
    const data = doc.data();
    const id = await upsertNotification({
      recipientUid: uid,
      type: "certificate_release_pending",
      entityType: "certificateReleaseQueue",
      entityId: doc.id,
      title: "Certificate awaiting release",
      body: `Certificate for ${data.studentId || "student"} is pending admin release.`,
      link: "/admin/testing/certificate-release",
      priority: 3,
    });
    activeIds.add(id);
  }

  for (const doc of retests.docs) {
    const data = doc.data();
    const id = await upsertNotification({
      recipientUid: uid,
      type: "retest_requested",
      entityType: "retestRequests",
      entityId: doc.id,
      title: "Retest request pending",
      body: `Student ${data.studentId || ""} requested a retest.`,
      link: "/admin/testing/retests",
      priority: 2,
    });
    activeIds.add(id);
  }

  for (const doc of challenges.docs) {
    const data = doc.data();
    const id = await upsertNotification({
      recipientUid: uid,
      type: "challenge_requested",
      entityType: "challengeTestRequests",
      entityId: doc.id,
      title: "Challenge test request",
      body: `Student ${data.studentId || ""} submitted a challenge testing request.`,
      link: "/admin/testing/challenge",
      priority: 2,
    });
    activeIds.add(id);
  }

  for (const doc of gradingQueue.docs) {
    const data = doc.data();
    const id = await upsertNotification({
      recipientUid: uid,
      type: "manual_grading_pending",
      entityType: "manualGradingQueue",
      entityId: doc.id,
      title: "Manual grading required",
      body: `Attempt for ${data.studentId || "student"} needs grading.`,
      link: "/admin/testing/grading",
      priority: 1,
    });
    activeIds.add(id);
  }

  await pruneStaleNotifications(uid, activeIds);
}

async function syncDepartmentNotifications(uid, departmentId) {
  const activeIds = new Set();
  if (!departmentId) {
    await pruneStaleNotifications(uid, activeIds);
    return;
  }

  const snap = await db()
    .collection("registrations")
    .where("status", "==", "pending_department")
    .where("departmentId", "==", departmentId)
    .limit(40)
    .get();

  for (const doc of snap.docs) {
    const data = doc.data();
    const id = await upsertNotification({
      recipientUid: uid,
      type: "registration_pending_department",
      entityType: "registrations",
      entityId: doc.id,
      title: "Registration needs department approval",
      body: `${data.studentName || data.studentId || "Student"} is waiting for your approval.`,
      link: "/department/approvals",
      priority: 3,
    });
    activeIds.add(id);
  }

  await pruneStaleNotifications(uid, activeIds);
}

async function syncStudentNotifications(uid, studentId) {
  const activeIds = new Set();
  if (!studentId) {
    await pruneStaleNotifications(uid, activeIds);
    return;
  }

  const [assignments, certificates, remediations] = await Promise.all([
    db().collection("testAssignments").where("studentId", "==", studentId).limit(40).get(),
    db().collection("certificates").where("studentId", "==", studentId).limit(40).get(),
    db().collection("remediationAssignments").where("studentId", "==", studentId).limit(40).get(),
  ]);

  for (const doc of assignments.docs) {
    const data = doc.data();
    if (data.status === "cancelled" || data.status === "completed") continue;
    const id = await upsertNotification({
      recipientUid: uid,
      type: "test_assigned",
      entityType: "testAssignments",
      entityId: doc.id,
      title: "Assigned test available",
      body: data.testName ? `${data.testName} is ready to take.` : "You have an assigned test.",
      link: "/student/tests",
      priority: 2,
    });
    activeIds.add(id);
  }

  for (const doc of certificates.docs) {
    const data = doc.data();
    if (data.status !== "pending_release") continue;
    const id = await upsertNotification({
      recipientUid: uid,
      type: "certificate_pending_release",
      entityType: "certificates",
      entityId: doc.id,
      title: "Certificate pending release",
      body: "Your course certificate passed review and awaits admin release.",
      link: "/student/certificates",
      priority: 1,
    });
    activeIds.add(id);
  }

  for (const doc of remediations.docs) {
    const data = doc.data();
    if (!["assigned", "in_progress"].includes(data.status)) continue;
    const id = await upsertNotification({
      recipientUid: uid,
      type: "remediation_assigned",
      entityType: "remediationAssignments",
      entityId: doc.id,
      title: "Remediation assigned",
      body: "Complete your remediation plan before your next test attempt.",
      link: "/student/test-results",
      priority: 3,
    });
    activeIds.add(id);
  }

  await pruneStaleNotifications(uid, activeIds);
}

async function syncCertificationOfficerNotifications(uid) {
  const activeIds = new Set();
  const snap = await db()
    .collection("studentCertifications")
    .where("status", "==", "pending_review")
    .limit(40)
    .get();

  for (const doc of snap.docs) {
    const data = doc.data();
    const id = await upsertNotification({
      recipientUid: uid,
      type: "certification_pending_review",
      entityType: "studentCertifications",
      entityId: doc.id,
      title: "Certification pending review",
      body: `${data.studentId || "Student"} submitted a certification for review.`,
      link: "/certification/pending",
      priority: 3,
    });
    activeIds.add(id);
  }

  await pruneStaleNotifications(uid, activeIds);
}

async function syncInstructorNotifications(uid) {
  const activeIds = new Set();
  const classesSnap = await db().collection("classes").where("instructorIds", "array-contains", uid).get();
  const classIds = classesSnap.docs.map((doc) => doc.id);

  if (classIds.length === 0) {
    await pruneStaleNotifications(uid, activeIds);
    return;
  }

  const gradingSnap = await db().collection("manualGradingQueue").where("status", "==", "pending").limit(80).get();
  for (const doc of gradingSnap.docs) {
    const data = doc.data();
    if (!classIds.includes(data.classId)) continue;
    const id = await upsertNotification({
      recipientUid: uid,
      type: "instructor_grading_pending",
      entityType: "manualGradingQueue",
      entityId: doc.id,
      title: "Student attempt needs grading",
      body: `Manual grading is required for ${data.studentId || "a student"} in your class.`,
      link: "/instructor/tests",
      priority: 2,
    });
    activeIds.add(id);
  }

  await pruneStaleNotifications(uid, activeIds);
}

export async function syncNotificationsForUser(uid) {
  const user = await getUser(uid);
  if (!user) return { synced: 0 };

  switch (user.role) {
    case "academy_admin":
    case "super_admin":
    case "creator":
      await syncAdminNotifications(uid);
      break;
    case "department_training_officer":
      await syncDepartmentNotifications(uid, user.departmentId);
      break;
    case "student":
      await syncStudentNotifications(uid, user.studentId);
      break;
    case "certification_officer":
      await syncCertificationOfficerNotifications(uid);
      break;
    case "instructor":
      await syncInstructorNotifications(uid);
      break;
    default:
      break;
  }

  const snap = await db()
    .collection("notifications")
    .where("recipientUid", "==", uid)
    .where("read", "==", false)
    .get();

  return { unread: snap.size };
}

/** Notify all admin users when a registration is submitted. */
export async function notifyAdminsRegistrationSubmitted(registration) {
  const adminUids = await listAdminUids();
  for (const uid of adminUids) {
    if (registration.status === "pending_academy") {
      await upsertNotification({
        recipientUid: uid,
        type: "registration_pending_academy",
        entityType: "registrations",
        entityId: registration.id,
        title: "New registration submitted",
        body: `${registration.studentName || registration.studentId || "Student"} needs academy approval.`,
        link: "/admin/registrations",
        priority: 2,
      });
    }
  }
}

/** @param {string} departmentId @param {{ id: string, studentName?: string, studentId?: string }} registration */
export async function notifyDepartmentRegistrationSubmitted(departmentId, registration) {
  if (!departmentId) return;
  const usersSnap = await db()
    .collection("users")
    .where("role", "==", "department_training_officer")
    .where("departmentId", "==", departmentId)
    .get();

  for (const userDoc of usersSnap.docs) {
    await upsertNotification({
      recipientUid: userDoc.id,
      type: "registration_pending_department",
      entityType: "registrations",
      entityId: registration.id,
      title: "New registration for approval",
      body: `${registration.studentName || registration.studentId || "Student"} is awaiting department approval.`,
      link: "/department/approvals",
      priority: 3,
    });
  }
}

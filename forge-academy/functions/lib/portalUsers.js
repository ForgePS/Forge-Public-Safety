import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export const VALID_ROLES = new Set([
  "student",
  "department_training_officer",
  "instructor",
  "academy_admin",
  "certification_officer",
  "super_admin",
  "creator",
]);

const ADMIN_ROLES = new Set(["academy_admin", "super_admin", "creator"]);

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

async function getCallerRole(uid) {
  const snap = await getFirestore().doc(`users/${uid}`).get();
  return snap.exists ? snap.data()?.role : null;
}

export async function assertAdminCaller(uid) {
  const role = await getCallerRole(uid);
  if (!ADMIN_ROLES.has(role)) {
    throw new HttpsError("permission-denied", "Academy admin access is required.");
  }
  return role;
}

async function assertCanManageTarget(callerRole, targetUid) {
  if (!targetUid) return;
  const targetRole = await getCallerRole(targetUid);
  if (
    targetRole === "creator" &&
    callerRole !== "creator" &&
    callerRole !== "super_admin"
  ) {
    throw new HttpsError("permission-denied", "Only a creator or super admin can manage creator accounts.");
  }
  if (
    targetRole === "super_admin" &&
    callerRole !== "super_admin" &&
    callerRole !== "creator"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Only a super admin or creator can manage super admin accounts.",
    );
  }
}

function assertCanAssignRole(callerRole, role) {
  if (role === "creator" && callerRole !== "creator" && callerRole !== "super_admin") {
    throw new HttpsError("permission-denied", "Only a creator or super admin can assign the creator role.");
  }
  if (role === "super_admin" && callerRole !== "super_admin" && callerRole !== "creator") {
    throw new HttpsError("permission-denied", "Only a super admin or creator can assign the super admin role.");
  }
}

async function getCustomRoleDefinition(role) {
  const snap = await getFirestore().doc(`portalRoleDefinitions/${role}`).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  if (data.status === "archived") return null;

  let portalType = String(data.portalType ?? "");
  if (portalType === "custom" && data.customPortalSlug) {
    portalType = String(data.customPortalSlug);
  }
  if (!portalType) return null;

  const builtin = ["admin", "student", "instructor", "department", "certification"];
  if (builtin.includes(portalType)) {
    return { id: snap.id, portalType, status: "active" };
  }

  const portalSnap = await getFirestore().doc(`portalDefinitions/${portalType}`).get();
  if (portalSnap.exists && portalSnap.data()?.status !== "archived") {
    return { id: snap.id, portalType, status: "active" };
  }

  return null;
}

async function assertValidPortalRole(role) {
  if (VALID_ROLES.has(role)) return { isSystem: true, portalType: systemPortalType(role) };
  const custom = await getCustomRoleDefinition(role);
  if (!custom) {
    throw new HttpsError("invalid-argument", "Invalid portal role.");
  }
  return { isSystem: false, portalType: custom.portalType };
}

async function assertCanAssignPortalRole(callerRole, role) {
  assertCanAssignRole(callerRole, role);
  if (VALID_ROLES.has(role)) return assertValidPortalRole(role);

  const custom = await getCustomRoleDefinition(role);
  if (!custom) {
    throw new HttpsError("invalid-argument", "Invalid portal role.");
  }
  if (custom.portalType === "admin" && callerRole === "academy_admin") {
    throw new HttpsError(
      "permission-denied",
      "Academy admins cannot assign admin portal custom roles.",
    );
  }
  if (!ADMIN_ROLES.has(callerRole)) {
    throw new HttpsError("permission-denied", "Academy admin access is required.");
  }
  return { isSystem: false, portalType: custom.portalType };
}

function systemPortalType(role) {
  switch (role) {
    case "student":
      return "student";
    case "department_training_officer":
      return "department";
    case "instructor":
      return "instructor";
    case "certification_officer":
      return "certification";
    default:
      return "admin";
  }
}

function validateRoleLinksForPortalType(portalType, { departmentId, studentId }) {
  if (portalType === "department" && !departmentId) {
    throw new HttpsError("invalid-argument", "Department users require a department link.");
  }
  if (portalType === "student" && !studentId) {
    throw new HttpsError(
      "invalid-argument",
      "Student portal accounts require a linked student record.",
    );
  }
}

async function docExists(collection, id) {
  if (!id) return false;
  const snap = await getFirestore().doc(`${collection}/${id}`).get();
  return snap.exists;
}

function buildProfilePayload({
  email,
  displayName,
  role,
  departmentId,
  studentId,
  disabled,
  permissions,
  jobTitle,
  phone,
  phoneExtension,
  photoUrl,
  profileUrl,
  organizationUnit,
  staffSlug,
}) {
  const payload = {
    email,
    displayName,
    role,
    departmentId: departmentId || "",
    studentId: studentId || "",
    disabled: Boolean(disabled),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (permissions && typeof permissions === "object") {
    payload.permissions = permissions;
  }

  for (const [key, value] of Object.entries({
    jobTitle,
    phone,
    phoneExtension,
    photoUrl,
    profileUrl,
    organizationUnit,
    staffSlug,
  })) {
    if (value !== undefined) payload[key] = normalizeText(value);
  }

  return payload;
}

export async function createPortalUserAccount(callerUid, input) {
  const callerRole = await assertAdminCaller(callerUid);

  const email = normalizeEmail(input.email);
  const password = normalizeText(input.password);
  const displayName = normalizeText(input.displayName);
  const role = normalizeText(input.role);
  const departmentId = normalizeText(input.departmentId);
  const studentId = normalizeText(input.studentId);
  const instructorId = normalizeText(input.instructorId);
  const createInstructorProfile = Boolean(input.createInstructorProfile);
  const permissions = input.permissions ?? null;
  const jobTitle = normalizeText(input.jobTitle);
  const phone = normalizeText(input.phone);
  const phoneExtension = normalizeText(input.phoneExtension);
  const photoUrl = normalizeText(input.photoUrl);
  const profileUrl = normalizeText(input.profileUrl);
  const organizationUnit = normalizeText(input.organizationUnit);
  const staffSlug = normalizeText(input.staffSlug);

  if (!email || !password || !displayName || !role) {
    throw new HttpsError("invalid-argument", "Email, password, display name, and role are required.");
  }
  if (password.length < 8) {
    throw new HttpsError("invalid-argument", "Password must be at least 8 characters.");
  }
  const roleDefinition = await assertCanAssignPortalRole(callerRole, role);

  validateRoleLinksForPortalType(roleDefinition.portalType, { departmentId, studentId });

  if (departmentId && !(await docExists("departments", departmentId))) {
    throw new HttpsError("invalid-argument", "Selected department was not found.");
  }
  if (studentId && !(await docExists("students", studentId))) {
    throw new HttpsError("invalid-argument", "Selected student record was not found.");
  }
  if (instructorId && !(await docExists("instructors", instructorId))) {
    throw new HttpsError("invalid-argument", "Selected instructor profile was not found.");
  }

  const auth = getAuth();
  const db = getFirestore();

  let authUser;
  try {
    authUser = await auth.createUser({
      email,
      password,
      displayName,
      disabled: false,
    });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "A Firebase Auth account already exists for this email.");
    }
    throw new HttpsError("internal", error.message ?? "Unable to create auth account.");
  }

  try {
    await db.doc(`users/${authUser.uid}`).set({
      ...buildProfilePayload({
        email,
        displayName,
        role,
        departmentId,
        studentId,
        disabled: false,
        permissions,
        jobTitle,
        phone,
        phoneExtension,
        photoUrl,
        profileUrl,
        organizationUnit,
        staffSlug,
      }),
      createdAt: FieldValue.serverTimestamp(),
    });

    if (roleDefinition.portalType === "instructor") {
      if (instructorId) {
        await db.doc(`instructors/${instructorId}`).update({
          userId: authUser.uid,
          email,
          phone,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (createInstructorProfile) {
        const [firstName, ...rest] = displayName.split(/\s+/);
        await db.collection("instructors").add({
          userId: authUser.uid,
          firstName: firstName || displayName,
          lastName: rest.join(" ") || "",
          email,
          phone,
          employeeId: staffSlug,
          specialties: [],
          bio: jobTitle,
          status: "active",
          notes: "Created from portal account setup.",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return { uid: authUser.uid, email, displayName, role };
  } catch (error) {
    await auth.deleteUser(authUser.uid).catch(() => {});
    throw new HttpsError("internal", error.message ?? "Unable to save portal profile.");
  }
}

export async function updatePortalUserAccount(callerUid, input) {
  const callerRole = await assertAdminCaller(callerUid);
  const uid = normalizeText(input.uid);
  if (!uid) throw new HttpsError("invalid-argument", "User id is required.");

  await assertCanManageTarget(callerRole, uid);

  const displayName = normalizeText(input.displayName);
  const role = normalizeText(input.role);
  const departmentId = normalizeText(input.departmentId);
  const studentId = normalizeText(input.studentId);
  const instructorId = normalizeText(input.instructorId);
  const disabled = input.disabled;
  const permissionsProvided = Object.prototype.hasOwnProperty.call(input, "permissions");

  if (!displayName || !role) {
    throw new HttpsError("invalid-argument", "Display name and role are required.");
  }
  const roleDefinition = await assertCanAssignPortalRole(callerRole, role);

  validateRoleLinksForPortalType(roleDefinition.portalType, { departmentId, studentId });

  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);
  const existing = await userRef.get();
  if (!existing.exists) {
    throw new HttpsError("not-found", "Portal user profile not found.");
  }

  const email = existing.data()?.email ?? "";
  const payload = buildProfilePayload({
    email,
    displayName,
    role,
    departmentId,
    studentId,
    disabled,
    permissions: permissionsProvided && input.permissions && typeof input.permissions === "object" ? input.permissions : undefined,
    jobTitle: input.jobTitle,
    phone: input.phone,
    phoneExtension: input.phoneExtension,
    photoUrl: input.photoUrl,
    profileUrl: input.profileUrl,
    organizationUnit: input.organizationUnit,
    staffSlug: input.staffSlug,
  });

  if (permissionsProvided && input.permissions === null) {
    payload.permissions = FieldValue.delete();
  }

  await userRef.update(payload);

  const auth = getAuth();
  await auth.updateUser(uid, {
    displayName,
    disabled: Boolean(disabled),
  });

  if (roleDefinition.portalType === "instructor" && instructorId) {
    await db.doc(`instructors/${instructorId}`).update({
      userId: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return { uid, email, displayName, role, disabled: Boolean(disabled) };
}

export async function resetPortalUserPasswordAccount(callerUid, input) {
  const callerRole = await assertAdminCaller(callerUid);

  const uid = normalizeText(input.uid);
  const password = normalizeText(input.password);
  if (!uid || !password) {
    throw new HttpsError("invalid-argument", "User id and password are required.");
  }
  if (password.length < 8) {
    throw new HttpsError("invalid-argument", "Password must be at least 8 characters.");
  }

  await assertCanManageTarget(callerRole, uid);
  await getAuth().updateUser(uid, { password });

  return { uid };
}

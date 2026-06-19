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
  if (targetRole === "creator" && callerRole !== "creator") {
    throw new HttpsError("permission-denied", "Only a creator can manage creator accounts.");
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
  if (role === "creator" && callerRole !== "creator") {
    throw new HttpsError("permission-denied", "Only a creator can assign the creator role.");
  }
  if (role === "super_admin" && callerRole !== "super_admin" && callerRole !== "creator") {
    throw new HttpsError("permission-denied", "Only a super admin or creator can assign the super admin role.");
  }
}

async function docExists(collection, id) {
  if (!id) return false;
  const snap = await getFirestore().doc(`${collection}/${id}`).get();
  return snap.exists;
}

function validateRoleLinks(role, { departmentId, studentId }) {
  if (role === "department_training_officer" && !departmentId) {
    throw new HttpsError("invalid-argument", "Department users require a department link.");
  }
  if (role === "student" && !studentId) {
    throw new HttpsError(
      "invalid-argument",
      "Student portal accounts require a linked student record.",
    );
  }
}

function buildProfilePayload({ email, displayName, role, departmentId, studentId, disabled, permissions }) {
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

  if (!email || !password || !displayName || !role) {
    throw new HttpsError("invalid-argument", "Email, password, display name, and role are required.");
  }
  if (password.length < 8) {
    throw new HttpsError("invalid-argument", "Password must be at least 8 characters.");
  }
  if (!VALID_ROLES.has(role)) {
    throw new HttpsError("invalid-argument", "Invalid portal role.");
  }
  assertCanAssignRole(callerRole, role);

  validateRoleLinks(role, { departmentId, studentId });

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
      }),
      createdAt: FieldValue.serverTimestamp(),
    });

    if (role === "instructor") {
      if (instructorId) {
        await db.doc(`instructors/${instructorId}`).update({
          userId: authUser.uid,
          email,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (createInstructorProfile) {
        const [firstName, ...rest] = displayName.split(/\s+/);
        await db.collection("instructors").add({
          userId: authUser.uid,
          firstName: firstName || displayName,
          lastName: rest.join(" ") || "",
          email,
          phone: "",
          employeeId: "",
          specialties: [],
          bio: "",
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
  if (!VALID_ROLES.has(role)) {
    throw new HttpsError("invalid-argument", "Invalid portal role.");
  }
  assertCanAssignRole(callerRole, role);

  validateRoleLinks(role, { departmentId, studentId });

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

  if (role === "instructor" && instructorId) {
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

#!/usr/bin/env node
/**
 * Import AFTA staff from data/afta-staff.json into Firebase Auth + users/{uid}.
 * Updates existing portal profiles matched by email; creates missing accounts.
 *
 * Usage:
 *   npx firebase-tools login   # or set GOOGLE_APPLICATION_CREDENTIALS
 *   node scripts/import-afta-staff.mjs
 *   node scripts/import-afta-staff.mjs --dry-run
 *   node scripts/import-afta-staff.mjs --create-missing-only
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "data", "afta-staff.json");
const logPath = join(root, "data", "afta-staff-import-log.json");
const PROJECT_ID = "forge-academy-95f84";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const createMissingOnly = args.has("--create-missing-only");

function initAdmin() {
  if (getApps().length) return;

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    const serviceAccount = JSON.parse(readFileSync(credentialsPath, "utf8"));
    initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
    return;
  }

  initializeApp({ projectId: PROJECT_ID });
}

function generateTempPassword(length = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function splitName(displayName) {
  const parts = String(displayName).trim().split(/\s+/);
  return {
    firstName: parts[0] ?? displayName,
    lastName: parts.slice(1).join(" "),
  };
}

function buildProfileFields(staff, role) {
  return {
    email: staff.email,
    displayName: staff.name,
    role,
    jobTitle: staff.jobTitle ?? "",
    phone: staff.phone ?? "",
    phoneExtension: staff.phoneExtension ?? "",
    photoUrl: staff.photoUrl ?? "",
    profileUrl: staff.profileUrl ?? "",
    organizationUnit: staff.organizationUnit ?? "Arkansas Fire Training Academy",
    staffSlug: staff.slug ?? "",
    aftaImportSource: "sautech.edu",
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function findAuthUserByEmail(auth, email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code === "auth/user-not-found") return null;
    throw error;
  }
}

async function upsertInstructorProfile(db, uid, staff) {
  const { firstName, lastName } = splitName(staff.name);
  const byUser = await db.collection("instructors").where("userId", "==", uid).limit(1).get();
  const byEmail = staff.email
    ? await db.collection("instructors").where("email", "==", staff.email).limit(1).get()
    : { empty: true, docs: [] };

  const existingRef = !byUser.empty ? byUser.docs[0].ref : !byEmail.empty ? byEmail.docs[0].ref : null;
  const payload = {
    userId: uid,
    firstName,
    lastName,
    email: staff.email,
    phone: staff.phone ?? "",
    employeeId: staff.slug ?? "",
    bio: staff.jobTitle ?? "",
    status: "active",
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (existingRef) {
    await existingRef.set(payload, { merge: true });
    return existingRef.id;
  }

  const created = await db.collection("instructors").add({
    ...payload,
    specialties: [],
    notes: "Imported from AFTA staff directory.",
    createdAt: FieldValue.serverTimestamp(),
  });
  return created.id;
}

async function upsertStaffMember(auth, db, staff) {
  if (!staff.email) {
    return { slug: staff.slug, name: staff.name, action: "skipped", reason: "missing email" };
  }

  const authUser = await findAuthUserByEmail(auth, staff.email);
  const profileRef = authUser ? db.doc(`users/${authUser.uid}`) : null;
  const existingProfile = profileRef ? await profileRef.get() : null;
  const existingRole = existingProfile?.exists ? existingProfile.data()?.role : null;
  const role = existingRole === "creator" ? "creator" : staff.role;

  if (authUser) {
    if (createMissingOnly) {
      return {
        slug: staff.slug,
        name: staff.name,
        email: staff.email,
        action: "skipped",
        reason: "profile already exists",
        uid: authUser.uid,
      };
    }

    const fields = buildProfileFields(staff, role);
    if (!dryRun) {
      await auth.updateUser(authUser.uid, {
        displayName: staff.name,
        email: staff.email,
      });
      await profileRef.set(fields, { merge: true });
      if (staff.role === "instructor" || existingRole === "instructor") {
        await upsertInstructorProfile(db, authUser.uid, staff);
      }
    }

    return {
      slug: staff.slug,
      name: staff.name,
      email: staff.email,
      action: "updated",
      uid: authUser.uid,
      role,
    };
  }

  const tempPassword = generateTempPassword();
  if (!dryRun) {
    const created = await auth.createUser({
      email: staff.email,
      password: tempPassword,
      displayName: staff.name,
      disabled: false,
    });
    await db.doc(`users/${created.uid}`).set({
      ...buildProfileFields(staff, staff.role),
      disabled: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (staff.createInstructorProfile || staff.role === "instructor") {
      await upsertInstructorProfile(db, created.uid, staff);
    }
    return {
      slug: staff.slug,
      name: staff.name,
      email: staff.email,
      action: "created",
      uid: created.uid,
      role: staff.role,
      tempPassword,
    };
  }

  return {
    slug: staff.slug,
    name: staff.name,
    email: staff.email,
    action: "created",
    role: staff.role,
    tempPassword: "(dry-run)",
  };
}

async function main() {
  initAdmin();
  const auth = getAuth();
  const db = getFirestore();

  const payload = JSON.parse(readFileSync(dataPath, "utf8"));
  const staff = payload.staff.filter((person) => person.slug !== "sstanley");

  console.log(
    `${dryRun ? "[dry-run] " : ""}Importing ${staff.length} AFTA staff profiles (${createMissingOnly ? "create missing only" : "create + update"})…`,
  );

  /** @type {Record<string, unknown>[]} */
  const results = [];
  for (const person of staff) {
    const result = await upsertStaffMember(auth, db, person);
    results.push(result);
    console.log(`${result.action.padEnd(7)}  ${result.name}  ${result.email ?? ""}`);
  }

  const summary = {
    ranAt: new Date().toISOString(),
    dryRun,
    createMissingOnly,
    created: results.filter((row) => row.action === "created").length,
    updated: results.filter((row) => row.action === "updated").length,
    skipped: results.filter((row) => row.action === "skipped").length,
    results,
  };

  if (!dryRun) {
    writeFileSync(logPath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`\nWrote import log to ${logPath}`);
  }

  const createdWithPasswords = results.filter((row) => row.action === "created" && row.tempPassword);
  if (createdWithPasswords.length) {
    console.log("\nNew account temporary passwords (share securely):");
    for (const row of createdWithPasswords) {
      console.log(`  ${row.email}: ${row.tempPassword}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

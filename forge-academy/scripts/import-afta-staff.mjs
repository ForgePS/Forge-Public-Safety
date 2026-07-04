#!/usr/bin/env node
/**
 * Import AFTA staff from data/afta-staff.json into Firebase Auth + users/{uid}.
 * Updates existing portal profiles matched by email; creates missing accounts.
 *
 * Usage:
 *   gcloud auth login
 *   npm run staff:import -- --dry-run
 *   npm run staff:import
 *
 * Optional: set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON key.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "data", "afta-staff.json");
const logPath = join(root, "data", "afta-staff-import-log.json");
const PROJECT_ID = "forge-academy-95f84";
const DATABASE = "(default)";
const IDENTITY_BASE = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}`;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents`;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const createMissingOnly = args.has("--create-missing-only");

async function getAuth() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credentialsPath && existsSync(credentialsPath)) {
    try {
      const serviceAccount = JSON.parse(readFileSync(credentialsPath, "utf8"));
      if (serviceAccount?.type === "service_account" && serviceAccount?.private_key) {
        const { initializeApp, cert, getApps } = await import("firebase-admin/app");
        const { getAuth: getAdminAuth } = await import("firebase-admin/auth");
        const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
        if (!getApps().length) {
          initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
        }
        return {
          mode: "admin",
          auth: getAdminAuth(),
          db: getFirestore(),
          FieldValue,
        };
      }
    } catch (error) {
      console.warn(
        `Unable to use GOOGLE_APPLICATION_CREDENTIALS (${credentialsPath}): ${
          error instanceof Error ? error.message : error
        }. Falling back to gcloud user credentials.`,
      );
    }
  }

  let token = "";
  try {
    token = execSync("gcloud auth print-access-token", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error("Run `gcloud auth login` before importing staff.");
  }

  if (!token) throw new Error("Run `gcloud auth login` before importing staff.");
  return { mode: "rest", token };
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json; charset=utf-8",
    "x-goog-user-project": PROJECT_ID,
  };
}

async function identityRequest(token, path, { method = "POST", body } = {}) {
  const response = await fetch(`${IDENTITY_BASE}${path}`, {
    method,
    headers: authHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Identity Toolkit ${method} ${path} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function findAuthUserByEmail(auth, email) {
  if (auth.mode === "admin") {
    try {
      return await auth.auth.getUserByEmail(email);
    } catch (error) {
      if (error.code === "auth/user-not-found") return null;
      throw error;
    }
  }

  const json = await identityRequest(auth.token, "/accounts:lookup", {
    body: { email: [email] },
  });
  const user = json.users?.[0];
  if (!user) return null;
  return {
    uid: user.localId,
    email: user.email,
    displayName: user.displayName ?? "",
  };
}

async function createAuthUser(auth, { email, password, displayName }) {
  if (auth.mode === "admin") {
    return auth.auth.createUser({
      email,
      password,
      displayName,
      disabled: false,
    });
  }

  const json = await identityRequest(auth.token, "/accounts", {
    body: {
      email,
      password,
      displayName,
      disabled: false,
      emailVerified: false,
    },
  });
  return {
    uid: json.localId,
    email: json.email ?? email,
    displayName: json.displayName ?? displayName,
  };
}

async function updateAuthUser(auth, uid, { email, displayName }) {
  if (auth.mode === "admin") {
    await auth.auth.updateUser(uid, { email, displayName });
    return;
  }

  await identityRequest(auth.token, `/accounts/${uid}?updateMask=displayName,email`, {
    method: "PATCH",
    body: {
      localId: uid,
      email,
      displayName,
    },
  });
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (value._serverTimestamp) return { timestampValue: new Date().toISOString() };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, toFirestoreValue(nested)]),
      ),
    },
  };
}

function toFirestoreFields(data) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]),
  );
}

function fromFirestoreDoc(doc) {
  /** @param {Record<string, unknown>} fields */
  function readValue(fields) {
    if ("stringValue" in fields) return fields.stringValue;
    if ("booleanValue" in fields) return fields.booleanValue;
    if ("integerValue" in fields) return Number(fields.integerValue);
    if ("doubleValue" in fields) return fields.doubleValue;
    if ("timestampValue" in fields) return fields.timestampValue;
    if ("nullValue" in fields) return null;
    if ("arrayValue" in fields) {
      return (fields.arrayValue.values ?? []).map((item) => readValue(item));
    }
    if ("mapValue" in fields) {
      return Object.fromEntries(
        Object.entries(fields.mapValue.fields ?? {}).map(([key, value]) => [key, readValue(value)]),
      );
    }
    return null;
  }

  const data = Object.fromEntries(
    Object.entries(doc.fields ?? {}).map(([key, value]) => [key, readValue(value)]),
  );
  return { id: doc.name.split("/").pop(), ...data };
}

async function restGetDoc(token, docPath) {
  const response = await fetch(`${FIRESTORE_BASE}/${docPath}`, {
    headers: authHeaders(token),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore get failed (${docPath}): ${response.status} ${body}`);
  }
  return fromFirestoreDoc(await response.json());
}

async function restPatchDoc(token, docPath, data) {
  const url = new URL(`${FIRESTORE_BASE}/${docPath}`);
  for (const fieldPath of Object.keys(data)) {
    url.searchParams.append("updateMask.fieldPaths", fieldPath);
  }

  const response = await fetch(url, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore patch failed (${docPath}): ${response.status} ${body}`);
  }
}

async function restSetDoc(token, docPath, data) {
  const response = await fetch(`${FIRESTORE_BASE}/${docPath}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore set failed (${docPath}): ${response.status} ${body}`);
  }
}

async function restCreateCollectionDoc(token, collection, data) {
  const response = await fetch(`${FIRESTORE_BASE}/${collection}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore create failed (${collection}): ${response.status} ${body}`);
  }

  const json = await response.json();
  return json.name.split("/").pop();
}

async function listInstructors(auth) {
  if (auth.mode === "admin") {
    const snap = await auth.db.collection("instructors").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  const instructors = [];
  let pageToken = "";
  do {
    const url = new URL(`${FIRESTORE_BASE}/instructors`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, { headers: authHeaders(auth.token) });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Firestore list failed (instructors): ${response.status} ${body}`);
    }

    const json = await response.json();
    instructors.push(...(json.documents ?? []).map(fromFirestoreDoc));
    pageToken = json.nextPageToken ?? "";
  } while (pageToken);

  return instructors;
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

function buildProfileFields(staff, role, timestamp) {
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
    updatedAt: timestamp,
  };
}

async function getUserProfile(auth, uid) {
  if (auth.mode === "admin") {
    const snap = await auth.db.doc(`users/${uid}`).get();
    return snap.exists ? snap.data() : null;
  }
  return restGetDoc(auth.token, `users/${uid}`);
}

async function saveUserProfile(auth, uid, fields, { isCreate = false } = {}) {
  if (auth.mode === "admin") {
    const ref = auth.db.doc(`users/${uid}`);
    if (isCreate) {
      await ref.set({
        ...fields,
        disabled: false,
        createdAt: auth.FieldValue.serverTimestamp(),
      });
    } else {
      await ref.set(fields, { merge: true });
    }
    return;
  }

  const payload = isCreate
    ? { ...fields, disabled: false, createdAt: { _serverTimestamp: true } }
    : fields;

  if (isCreate) {
    await restSetDoc(auth.token, `users/${uid}`, payload);
  } else {
    await restPatchDoc(auth.token, `users/${uid}`, payload);
  }
}

async function upsertInstructorProfile(auth, instructors, uid, staff, timestamp) {
  const { firstName, lastName } = splitName(staff.name);
  const existing =
    instructors.find((row) => row.userId === uid) ??
    instructors.find((row) => row.email === staff.email) ??
    null;

  const payload = {
    userId: uid,
    firstName,
    lastName,
    email: staff.email,
    phone: staff.phone ?? "",
    employeeId: staff.slug ?? "",
    bio: staff.jobTitle ?? "",
    status: "active",
    updatedAt: timestamp,
  };

  if (auth.mode === "admin") {
    if (existing) {
      await auth.db.doc(`instructors/${existing.id}`).set(payload, { merge: true });
      return existing.id;
    }
    const created = await auth.db.collection("instructors").add({
      ...payload,
      specialties: [],
      notes: "Imported from AFTA staff directory.",
      createdAt: auth.FieldValue.serverTimestamp(),
    });
    instructors.push({ id: created.id, ...payload });
    return created.id;
  }

  if (existing) {
    await restPatchDoc(auth.token, `instructors/${existing.id}`, payload);
    return existing.id;
  }

  const createdId = await restCreateCollectionDoc(auth.token, "instructors", {
    ...payload,
    specialties: [],
    notes: "Imported from AFTA staff directory.",
    createdAt: { _serverTimestamp: true },
  });
  instructors.push({ id: createdId, ...payload });
  return createdId;
}

async function upsertStaffMember(auth, instructors, staff) {
  if (!staff.email) {
    return { slug: staff.slug, name: staff.name, action: "skipped", reason: "missing email" };
  }

  const timestamp =
    auth.mode === "admin" ? auth.FieldValue.serverTimestamp() : { _serverTimestamp: true };

  const authUser = await findAuthUserByEmail(auth, staff.email);
  const existingProfile = authUser ? await getUserProfile(auth, authUser.uid) : null;
  const existingRole = existingProfile?.role ?? null;
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

    if (!dryRun) {
      await updateAuthUser(auth, authUser.uid, {
        email: staff.email,
        displayName: staff.name,
      });
      await saveUserProfile(auth, authUser.uid, buildProfileFields(staff, role, timestamp));
      if (staff.role === "instructor" || existingRole === "instructor") {
        await upsertInstructorProfile(auth, instructors, authUser.uid, staff, timestamp);
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
    const created = await createAuthUser(auth, {
      email: staff.email,
      password: tempPassword,
      displayName: staff.name,
    });
    await saveUserProfile(
      auth,
      created.uid,
      { ...buildProfileFields(staff, staff.role, timestamp), disabled: false },
      { isCreate: true },
    );
    if (staff.createInstructorProfile || staff.role === "instructor") {
      await upsertInstructorProfile(auth, instructors, created.uid, staff, timestamp);
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

function printAuthHelp(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n${message}\n`);
  console.error("Setup (PowerShell):\n");
  console.error("  gcloud auth login");
  console.error(`  gcloud config set project ${PROJECT_ID}`);
  console.error("  npm run staff:import -- --dry-run\n");
  console.error(
    "Your Google account needs Firebase Auth Admin access on forge-academy-95f84.\n",
  );
}

async function main() {
  const auth = await getAuth();
  const instructors = await listInstructors(auth);

  const payload = JSON.parse(readFileSync(dataPath, "utf8"));
  const staff = payload.staff.filter((person) => person.slug !== "sstanley");

  console.log(
    `${dryRun ? "[dry-run] " : ""}Importing ${staff.length} AFTA staff profiles (${createMissingOnly ? "create missing only" : "create + update"}) using ${auth.mode} mode…`,
  );

  /** @type {Record<string, unknown>[]} */
  const results = [];
  for (const person of staff) {
    const result = await upsertStaffMember(auth, instructors, person);
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
  printAuthHelp(error);
  process.exit(1);
});

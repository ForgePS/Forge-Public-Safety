#!/usr/bin/env node
/**
 * Import Arkansas fire departments from the USFA NFIRS registry list on Responserack.
 *
 * Usage: npm run departments:import
 */

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fetchArkansasDepartments } from "./lib/arkansas-departments-parser.mjs";

const PROJECT_ID = "forge-academy-95f84";
const DATABASE = "(default)";
const IMPORT_SOURCE = "responserack_nfirs_arkansas";

async function getAuth(credentialsPath) {
  const path = credentialsPath || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path) {
    const { initializeApp, cert, getApps } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    if (!getApps().length) {
      const serviceAccount = JSON.parse(readFileSync(path, "utf8"));
      initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
    }
    return { mode: "admin", db: getFirestore() };
  }

  const token = execSync("gcloud auth print-access-token", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

  if (!token) throw new Error("Run `gcloud auth login` before importing departments.");
  return { mode: "rest", token };
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

async function restListDepartments(auth) {
  const documents = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents/departments`,
    );
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Firestore list failed (departments): ${response.status} ${body}`);
    }

    const json = await response.json();
    documents.push(...(json.documents ?? []));
    pageToken = json.nextPageToken ?? "";
  } while (pageToken);

  return documents;
}

function fromFirestoreValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  }
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields ?? {}).map(([key, nested]) => [
        key,
        fromFirestoreValue(nested),
      ]),
    );
  }
  return null;
}

function fromFirestoreDoc(doc) {
  const data = {};
  for (const [key, value] of Object.entries(doc.fields ?? {})) {
    data[key] = fromFirestoreValue(value);
  }
  return { id: doc.name.split("/").pop(), ...data };
}

async function restCreateDepartment(auth, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents/departments`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore create failed (departments): ${response.status} ${body}`);
  }

  const json = await response.json();
  return json.name.split("/").pop();
}

function buildDepartmentRecord(entry) {
  return {
    name: entry.name,
    fdid: entry.fdid,
    county: entry.county,
    state: "AR",
    address: "",
    city: "",
    zip: "",
    region: "",
    departmentType: entry.departmentType || "",
    chiefName: "",
    chiefEmail: "",
    chiefPhone: "",
    trainingOfficerName: "",
    trainingOfficerEmail: "",
    trainingOfficerPhone: "",
    status: "active",
    importSource: IMPORT_SOURCE,
    createdAt: { _serverTimestamp: true },
    updatedAt: { _serverTimestamp: true },
  };
}

async function loadExistingDepartments(auth, mode, db) {
  if (mode === "admin") {
    const snap = await db.collection("departments").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  return restListDepartments(auth).then((docs) => docs.map(fromFirestoreDoc));
}

async function createDepartment(auth, mode, db, data) {
  if (mode === "admin") {
    const { FieldValue } = await import("firebase-admin/firestore");
    const ref = await db.collection("departments").add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  return restCreateDepartment(auth, data);
}

async function main() {
  const auth = await getAuth(process.argv[2]);
  const mode = auth.mode;
  const db = auth.db;

  console.log("Fetching Arkansas fire department registry…");
  const registry = await fetchArkansasDepartments();
  console.log(`Parsed ${registry.length} unique FDIDs from registry.`);

  const existing = await loadExistingDepartments(auth, mode, db);
  const existingByFdid = new Map(
    existing.filter((department) => department.fdid).map((department) => [department.fdid.trim(), department]),
  );

  let created = 0;
  let skipped = 0;

  for (const entry of registry) {
    if (existingByFdid.has(entry.fdid)) {
      skipped += 1;
      continue;
    }

    const record = buildDepartmentRecord(entry);
    const id = await createDepartment(auth, mode, db, record);
    existingByFdid.set(entry.fdid, { id, ...record });
    created += 1;

    if (created % 50 === 0) {
      console.log(`  Created ${created} departments…`);
    }
  }

  console.log("");
  console.log("Arkansas department import complete.");
  console.log(`  Registry departments: ${registry.length}`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped (FDID already exists): ${skipped}`);
  console.log(`  Total in Firestore: ${existingByFdid.size}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

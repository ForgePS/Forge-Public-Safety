#!/usr/bin/env node
/**
 * Merge AFTA 2026 course catalog content into Firestore courses and class sessions.
 *
 * Usage: npm run catalog:import
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  buildClassCatalogPayload,
  buildCourseCatalogPayload,
  loadCatalogEntries,
  matchCatalogEntry,
  normalizeCatalogName,
} from "./lib/catalog-parser.mjs";

const PROJECT_ID = "forge-academy-95f84";
const DATABASE = "(default)";
const IMPORT_BATCH = "afta-catalog-2026";

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

  if (!token) throw new Error("Run `gcloud auth login` before importing the catalog.");
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

async function restListCollection(auth, collection) {
  const documents = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents/${collection}`,
    );
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Firestore list failed (${collection}): ${response.status} ${body}`);
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

async function restPatch(auth, collection, id, data) {
  const fieldPaths = Object.keys(data);
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents/${collection}/${id}`,
  );
  for (const path of fieldPaths) url.searchParams.append("updateMask.fieldPaths", path);

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore patch failed (${collection}/${id}): ${response.status} ${body}`);
  }
}

async function loadExisting(auth, mode, db) {
  if (mode === "admin") {
    const [coursesSnap, classesSnap] = await Promise.all([
      db.collection("courses").get(),
      db.collection("classes").get(),
    ]);
    return {
      courses: coursesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      classes: classesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    };
  }

  const [courseDocs, classDocs] = await Promise.all([
    restListCollection(auth, "courses"),
    restListCollection(auth, "classes"),
  ]);

  return {
    courses: courseDocs.map(fromFirestoreDoc),
    classes: classDocs.map(fromFirestoreDoc),
  };
}

async function patchRecord(auth, mode, db, collection, id, data) {
  const payload = {
    ...data,
    updatedAt: mode === "admin" ? undefined : { _serverTimestamp: true },
  };

  if (mode === "admin") {
    const { FieldValue } = await import("firebase-admin/firestore");
    await db.collection(collection).doc(id).update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  await restPatch(auth, collection, id, {
    ...data,
    updatedAt: { _serverTimestamp: true },
  });
}

function findCatalogEntryForCourseName(name, catalogEntries, catalogByName) {
  const matched = matchCatalogEntry(name, catalogEntries);
  if (matched) return matched;
  return catalogByName.get(normalizeCatalogName(name)) ?? null;
}

async function main() {
  const auth = await getAuth(process.argv[2]);
  const mode = auth.mode;
  const db = auth.db;
  const catalogEntries = loadCatalogEntries();
  const catalogByName = new Map(catalogEntries.map((entry) => [entry.normalizedName, entry]));

  const existing = await loadExisting(auth, mode, db);

  let updatedCourses = 0;
  let skippedCourses = 0;
  let updatedClasses = 0;
  let skippedClasses = 0;
  let unmatchedClasses = [];

  for (const course of existing.courses) {
    const entry = findCatalogEntryForCourseName(course.name, catalogEntries, catalogByName);
    if (!entry) {
      skippedCourses += 1;
      continue;
    }

    const patch = buildCourseCatalogPayload(entry);
    if (course.hours > 0 && !entry.hours) {
      patch.hours = course.hours;
    }
    if (course.category && !patch.category) {
      patch.category = course.category;
    }

    await patchRecord(auth, mode, db, "courses", course.id, patch);
    updatedCourses += 1;
    console.log(`Updated course: ${course.courseNumber} · ${course.name}`);
  }

  for (const classSession of existing.classes) {
    const entry = findCatalogEntryForCourseName(
      classSession.courseName,
      catalogEntries,
      catalogByName,
    );
    if (!entry) {
      skippedClasses += 1;
      unmatchedClasses.push(classSession.courseName);
      continue;
    }

    const patch = buildClassCatalogPayload(entry, classSession.courseName);
    await patchRecord(auth, mode, db, "classes", classSession.id, patch);
    updatedClasses += 1;
  }

  unmatchedClasses = [...new Set(unmatchedClasses)].sort();

  console.log("");
  console.log("Catalog merge complete.");
  console.log(`  Catalog entries parsed: ${catalogEntries.length}`);
  console.log(`  Courses updated: ${updatedCourses}`);
  console.log(`  Courses skipped (no catalog match): ${skippedCourses}`);
  console.log(`  Class sessions updated: ${updatedClasses}`);
  console.log(`  Class sessions skipped (no catalog match): ${skippedClasses}`);
  if (unmatchedClasses.length) {
    console.log("  Unmatched class course names:");
    for (const name of unmatchedClasses) console.log(`    - ${name}`);
  }
  console.log(`  Import batch: ${IMPORT_BATCH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

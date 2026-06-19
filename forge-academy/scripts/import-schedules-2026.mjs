#!/usr/bin/env node
/**
 * Import AFTA 2026 on-campus and off-campus PDF schedules into Firestore.
 *
 * Usage: npm run schedule:import
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  OFF_CAMPUS_SCHEDULE,
  ON_CAMPUS_SCHEDULE,
  SCHEDULE_SOURCES,
} from "./data/schedules-2026.mjs";

const PROJECT_ID = "forge-academy-95f84";
const DATABASE = "(default)";
const IMPORT_BATCH = "afta-schedule-2026";

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

  if (!token) throw new Error("Run `gcloud auth login` before importing schedules.");
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

async function restCreate(auth, collection, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents/${collection}`;
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
    throw new Error(`Firestore create failed (${collection}): ${response.status} ${body}`);
  }

  const json = await response.json();
  return json.name.split("/").pop();
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

function slugCourseNumber(name) {
  const base = name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .map((part) => part.slice(0, 3).toUpperCase())
    .join("");

  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return `${base || "COURSE"}-${String(hash).padStart(3, "0")}`;
}

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function importKey(parts) {
  return parts.filter(Boolean).join("|");
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function defaultEndTime(startTime) {
  const hour = Number(startTime.slice(0, 2));
  return hour >= 17 ? "21:00" : "17:00";
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

async function updateRecord(auth, mode, db, collection, id, data) {
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

async function upsertClassSession(auth, mode, db, classByImportKey, payload) {
  const existing = classByImportKey.get(payload.importKey);
  if (existing?.id) {
    const { importKey, enrolledCount, waitlistCount, ...updates } = payload;
    await updateRecord(auth, mode, db, "classes", existing.id, updates);
    return "updated";
  }

  const id = await createRecord(auth, mode, db, "classes", payload);
  classByImportKey.set(payload.importKey, { id, importKey: payload.importKey });
  return "created";
}

async function createRecord(auth, mode, db, collection, data) {
  if (mode === "admin") {
    const { FieldValue } = await import("firebase-admin/firestore");
    const ref = await db.collection(collection).add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  return restCreate(auth, collection, {
    ...data,
    createdAt: { _serverTimestamp: true },
    updatedAt: { _serverTimestamp: true },
  });
}

async function ensureCourse(auth, mode, db, courseCache, courseName) {
  const key = normalizeName(courseName);
  if (courseCache.has(key)) return courseCache.get(key);

  const courseNumber = slugCourseNumber(courseName);
  const payload = {
    name: courseName,
    courseNumber,
    description: `Imported from AFTA 2026 schedule PDFs.`,
    hours: 40,
    category: "",
    certificationType: "",
    prerequisiteCourseIds: [],
    requiredDocuments: [],
    requiredEquipment: "",
    minEnrollment: 8,
    maxEnrollment: 24,
    testRequired: false,
    skillsRequired: false,
    certificateIssued: false,
    status: "active",
  };

  const id = await createRecord(auth, mode, db, "courses", payload);
  const record = { id, ...payload };
  courseCache.set(key, record);
  console.log(`Created course: ${courseNumber} · ${courseName}`);
  return record;
}

function buildOffCampusClass(course, row) {
  const [courseName, startDate, endDate, region, instructor, location, city, county, startTime, notes] =
    row;
  const fullLocation = `${location}, ${city}, ${county} (Region ${region})`;
  const key = importKey(["off", courseName, startDate, endDate, location, city, instructor]);

  return {
    importKey: key,
    courseId: course.id,
    courseName: course.name,
    courseNumber: course.courseNumber,
    startDate,
    endDate,
    startTime,
    endTime: defaultEndTime(startTime),
    location: fullLocation,
    locationType: "regional",
    deliveryType: "off_campus",
    housingRequired: false,
    housingNotes: "",
    instructorIds: [],
    instructorNames: [instructor],
    enrollmentCap: 24,
    waitlistCap: 6,
    enrolledCount: 0,
    waitlistCount: 0,
    registrationDeadline: addDays(startDate, -7),
    cancellationDeadline: addDays(startDate, -3),
    mealLodgingNotes: "",
    notes: [notes, `Region ${region}`, `Source: ${SCHEDULE_SOURCES.offCampus}`].filter(Boolean).join(" · "),
    status: "open",
    scheduleImportBatch: IMPORT_BATCH,
  };
}

function buildOnCampusClass(course, row) {
  const [courseName, sessionLabel, startDate, endDate, housingRequired, location, notes] = row;
  const key = importKey(["on", courseName, sessionLabel, startDate, endDate, location]);

  return {
    importKey: key,
    courseId: course.id,
    courseName: course.name,
    courseNumber: course.courseNumber,
    startDate,
    endDate,
    startTime: "08:00",
    endTime: "17:00",
    location: location ?? "Arkansas Fire Training Academy — Camden",
    locationType: "on_campus",
    deliveryType: housingRequired ? "on_campus_housing_required" : "on_campus_no_housing",
    housingRequired: Boolean(housingRequired),
    housingNotes: housingRequired ? "On-campus housing required per AFTA schedule." : "",
    instructorIds: [],
    instructorNames: ["To Be Assigned"],
    enrollmentCap: 24,
    waitlistCap: 6,
    enrolledCount: 0,
    waitlistCount: 0,
    registrationDeadline: addDays(startDate, -14),
    cancellationDeadline: addDays(startDate, -7),
    mealLodgingNotes: housingRequired ? "On-campus lodging available." : "",
    notes: [sessionLabel, notes, `Source: ${SCHEDULE_SOURCES.onCampus}`].filter(Boolean).join(" · "),
    status: "open",
    scheduleImportBatch: IMPORT_BATCH,
  };
}

async function main() {
  const auth = await getAuth(process.argv[2]);
  const mode = auth.mode;
  const db = auth.db;

  const existing = await loadExisting(auth, mode, db);
  const courseCache = new Map(
    existing.courses.map((course) => [normalizeName(course.name), course]),
  );
  const classByImportKey = new Map(
    existing.classes
      .filter((item) => item.importKey)
      .map((item) => [item.importKey, item]),
  );

  let createdCourses = 0;
  let createdClasses = 0;
  let updatedClasses = 0;

  for (const row of OFF_CAMPUS_SCHEDULE) {
    const courseName = row[0];
    const existed = courseCache.has(normalizeName(courseName));
    const course = await ensureCourse(auth, mode, db, courseCache, courseName);
    if (!existed) createdCourses += 1;

    const payload = buildOffCampusClass(course, row);
    const result = await upsertClassSession(auth, mode, db, classByImportKey, payload);
    if (result === "created") createdClasses += 1;
    if (result === "updated") updatedClasses += 1;
  }

  for (const row of ON_CAMPUS_SCHEDULE) {
    const courseName = row[0];
    const existed = courseCache.has(normalizeName(courseName));
    const course = await ensureCourse(auth, mode, db, courseCache, courseName);
    if (!existed) createdCourses += 1;

    const payload = buildOnCampusClass(course, row);
    const result = await upsertClassSession(auth, mode, db, classByImportKey, payload);
    if (result === "created") createdClasses += 1;
    if (result === "updated") updatedClasses += 1;
  }

  console.log("");
  console.log("Schedule import complete.");
  console.log(`  New courses: ${createdCourses}`);
  console.log(`  New class sessions: ${createdClasses}`);
  console.log(`  Updated class sessions: ${updatedClasses}`);
  console.log(`  Off-campus rows: ${OFF_CAMPUS_SCHEDULE.length}`);
  console.log(`  On-campus rows: ${ON_CAMPUS_SCHEDULE.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

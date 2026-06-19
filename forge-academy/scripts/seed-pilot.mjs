#!/usr/bin/env node
/**
 * Seeds baseline pilot data using Firestore REST API + gcloud user credentials.
 * Falls back to firebase-admin service account file when provided.
 */

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const PROJECT_ID = "forge-academy-95f84";
const DATABASE = "(default)";

/** @returns {Promise<{ mode: 'admin' | 'rest', db?: import('firebase-admin/firestore').Firestore, token?: string }>} */
async function getAccessToken(credentialsPath) {
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

  try {
    const token = execSync("gcloud auth print-access-token", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (!token) throw new Error("Empty gcloud token.");
    return { mode: "rest", token };
  } catch {
    throw new Error(
      "No credentials available. Run `gcloud auth login` or set GOOGLE_APPLICATION_CREDENTIALS.",
    );
  }
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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

/** @param {{ mode: string, token?: string }} auth @param {string} collection @param {Record<string, unknown>} data */
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

/** @param {{ mode: string, token?: string }} auth @param {string} collection */
async function restHasAny(auth, collection) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents/${collection}?pageSize=1`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore list failed (${collection}): ${response.status} ${body}`);
  }
  const json = await response.json();
  return Boolean(json.documents?.length);
}

/** @param {{ mode: string, token?: string }} auth @param {string} docPath @param {Record<string, unknown>} data */
async function restSetDoc(auth, docPath, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents/${docPath}`;
  const response = await fetch(`${url}?currentDocument.exists=false`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });

  if (response.status === 409 || response.status === 400) {
    return false;
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore set failed (${docPath}): ${response.status} ${body}`);
  }
  return true;
}

async function adminSeedIfEmpty(db, collectionName, createFn) {
  const snap = await db.collection(collectionName).limit(1).get();
  if (!snap.empty) {
    console.log(`Skip ${collectionName}: already has data.`);
    return null;
  }
  const id = await createFn();
  console.log(`Created ${collectionName}/${id}`);
  return id;
}

async function restSeedIfEmpty(auth, collectionName, createFn) {
  if (await restHasAny(auth, collectionName)) {
    console.log(`Skip ${collectionName}: already has data.`);
    return null;
  }
  const id = await createFn();
  console.log(`Created ${collectionName}/${id}`);
  return id;
}

async function findExistingCourseId(auth, mode, db) {
  if (mode === "admin") {
    const snap = await db.collection("courses").limit(1).get();
    return snap.empty ? null : snap.docs[0].id;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE}/documents/courses?pageSize=1`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } });
  if (!response.ok) return null;
  const json = await response.json();
  const doc = json.documents?.[0];
  return doc ? doc.name.split("/").pop() : null;
}

async function seedRooms(auth, mode, db) {
  const hasRooms =
    mode === "admin"
      ? !(await db.collection("rooms").limit(1).get()).empty
      : await restHasAny(auth, "rooms");

  if (hasRooms) {
    console.log("Skip rooms: already has data.");
    return;
  }

  const sampleRooms = [
    { roomNumber: "101", building: "North Hall", floor: "1", capacity: 2, roomType: "double" },
    { roomNumber: "102", building: "North Hall", floor: "1", capacity: 2, roomType: "double" },
    { roomNumber: "201", building: "North Hall", floor: "2", capacity: 2, roomType: "accessible" },
    { roomNumber: "301", building: "South Hall", floor: "3", capacity: 1, roomType: "single" },
    { roomNumber: "401", building: "Instructor Wing", floor: "4", capacity: 1, roomType: "instructor" },
  ];

  for (const room of sampleRooms) {
    const payload = {
      ...room,
      status: "active",
      notes: "Pilot seed room",
      createdAt: { _serverTimestamp: true },
      updatedAt: { _serverTimestamp: true },
    };

    if (mode === "admin") {
      const { FieldValue } = await import("firebase-admin/firestore");
      const ref = await db.collection("rooms").add({
        ...room,
        status: "active",
        notes: "Pilot seed room",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`Created rooms/${ref.id} (${room.roomNumber})`);
    } else {
      const id = await restCreate(auth, "rooms", payload);
      console.log(`Created rooms/${id} (${room.roomNumber})`);
    }
  }
}

async function seedHousingSettings(auth, mode, db) {
  const payload = {
    studentInstructions:
      "Report to the AFTA housing desk on arrival. Bring a photo ID and class confirmation. Quiet hours are 10 PM – 6 AM.",
    academyNotes: "Pilot housing policies apply for on-campus training classes.",
    checkInTime: "15:00",
    checkOutTime: "10:00",
    updatedAt: { _serverTimestamp: true },
  };

  if (mode === "admin") {
    const ref = db.collection("housingSettings").doc("default");
    const snap = await ref.get();
    if (snap.exists) {
      console.log("Skip housingSettings/default: already exists.");
      return;
    }
    const { FieldValue } = await import("firebase-admin/firestore");
    await ref.set({
      studentInstructions: payload.studentInstructions,
      academyNotes: payload.academyNotes,
      checkInTime: payload.checkInTime,
      checkOutTime: payload.checkOutTime,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log("Created housingSettings/default");
    return;
  }

  const created = await restSetDoc(auth, "housingSettings/default", payload);
  console.log(created ? "Created housingSettings/default" : "Skip housingSettings/default: already exists.");
}

async function main() {
  const auth = await getAccessToken(process.argv[2]);
  const mode = auth.mode;
  const db = auth.db;
  const today = new Date().toISOString().slice(0, 10);
  const ts = mode === "admin" ? (await import("firebase-admin/firestore")).FieldValue.serverTimestamp() : { _serverTimestamp: true };

  const seedIfEmpty =
    mode === "admin"
      ? (collection, createFn) => adminSeedIfEmpty(db, collection, createFn)
      : (collection, createFn) => restSeedIfEmpty(auth, collection, createFn);

  const createDoc =
    mode === "admin"
      ? async (collection, data) => {
          const ref = await db.collection(collection).add(data);
          return ref.id;
        }
      : async (collection, data) => restCreate(auth, collection, data);

  const departmentId = await seedIfEmpty("departments", () =>
    createDoc("departments", {
      name: "Pilot Fire Department",
      fdid: "PILOT-001",
      address: "100 Training Way",
      city: "Camden",
      state: "AR",
      zip: "71701",
      county: "Ouachita",
      region: "South",
      chiefName: "Chief Pilot User",
      chiefEmail: "chief@pilot-fire.local",
      chiefPhone: "8705550100",
      trainingOfficerName: "Training Officer Pilot",
      trainingOfficerEmail: "training@pilot-fire.local",
      trainingOfficerPhone: "8705550101",
      status: "active",
      createdAt: ts,
      updatedAt: ts,
    }),
  );

  await seedIfEmpty("certificationTypes", () =>
    createDoc("certificationTypes", {
      code: "FF1",
      name: "Firefighter I",
      description: "Arkansas Firefighter I certification",
      validityYears: 2,
      status: "active",
      createdAt: ts,
      updatedAt: ts,
    }),
  );

  const courseId = await seedIfEmpty("courses", () =>
    createDoc("courses", {
      name: "Firefighter I",
      courseNumber: "FF-101",
      description: "NFPA 1001 Firefighter I pilot course",
      hours: 80,
      category: "firefighter_i",
      certificationType: "FF1",
      prerequisiteCourseIds: [],
      requiredDocuments: ["Medical clearance"],
      requiredEquipment: "Turnout gear",
      minEnrollment: 8,
      maxEnrollment: 24,
      testRequired: true,
      skillsRequired: true,
      certificateIssued: true,
      status: "active",
      createdAt: ts,
      updatedAt: ts,
    }),
  );

  const resolvedCourseId = courseId || (await findExistingCourseId(auth, mode, db));

  if (resolvedCourseId) {
    await seedIfEmpty("classes", () =>
      createDoc("classes", {
        courseId: resolvedCourseId,
        courseName: "Firefighter I",
        courseNumber: "FF-101",
        startDate: addDays(today, 14),
        endDate: addDays(today, 21),
        startTime: "08:00",
        endTime: "17:00",
        location: "Arkansas Fire Training Academy — Camden",
        locationType: "on_campus",
        deliveryType: "on_campus_housing_required",
        housingRequired: true,
        housingNotes: "Check in at the housing desk by 3:00 PM on the first day of class.",
        instructorIds: [],
        instructorNames: [],
        enrollmentCap: 24,
        waitlistCap: 6,
        enrolledCount: 0,
        waitlistCount: 0,
        registrationDeadline: addDays(today, 10),
        cancellationDeadline: addDays(today, 7),
        mealLodgingNotes: "Meals provided on campus. Housing included for this pilot class.",
        notes: "Pilot class session for go-live testing.",
        status: "open",
        createdAt: ts,
        updatedAt: ts,
      }),
    );
  }

  await seedRooms(auth, mode, db);
  await seedHousingSettings(auth, mode, db);

  if (departmentId) {
    console.log(`Pilot department id: ${departmentId}`);
  }

  console.log("Pilot seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

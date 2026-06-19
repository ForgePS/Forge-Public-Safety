import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { writeAuditLog } from "./auditLogs.js";

export const TESTING_WINDOW_STATUSES = {
  SCHEDULED: "scheduled",
  OPEN: "open",
  CLOSED: "closed",
  CANCELLED: "cancelled",
};

export const TESTING_WINDOW_STATUS_LABELS = {
  [TESTING_WINDOW_STATUSES.SCHEDULED]: "Scheduled",
  [TESTING_WINDOW_STATUSES.OPEN]: "Open",
  [TESTING_WINDOW_STATUSES.CLOSED]: "Closed",
  [TESTING_WINDOW_STATUSES.CANCELLED]: "Cancelled",
};

/**
 * @typedef {Object} TestingWindowRecord
 * @property {string} id
 * @property {string} testId
 * @property {string} testName
 * @property {string} classId
 * @property {string} openDateTime
 * @property {string} closeDateTime
 * @property {string} timezone
 * @property {string} status
 */

const windowsRef = collection(db, "testingWindows");

function mapWindow(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    testId: data.testId ?? "",
    testName: data.testName ?? "",
    classId: data.classId ?? "",
    openDateTime: data.openDateTime ?? "",
    closeDateTime: data.closeDateTime ?? "",
    timezone: data.timezone ?? "America/Chicago",
    status: data.status ?? TESTING_WINDOW_STATUSES.SCHEDULED,
  };
}

/** @returns {Promise<TestingWindowRecord[]>} */
export async function listTestingWindows() {
  const snap = await getDocs(query(windowsRef));
  return snap.docs.map((item) => mapWindow(item.id, item.data())).filter(Boolean);
}

/** @param {string} testId */
export async function listTestingWindowsByTest(testId) {
  if (!testId) return [];
  const snap = await getDocs(query(windowsRef, where("testId", "==", testId)));
  return snap.docs.map((item) => mapWindow(item.id, item.data())).filter(Boolean);
}

/** @param {string} windowId */
export async function getTestingWindow(windowId) {
  const snap = await getDoc(doc(db, "testingWindows", windowId));
  if (!snap.exists()) return null;
  return mapWindow(snap.id, snap.data());
}

/** @param {Omit<TestingWindowRecord, 'id'>} input @param {string} userId */
export async function createTestingWindow(input, userId) {
  if (!input.testId) throw new Error("Test is required.");
  if (!input.openDateTime || !input.closeDateTime) throw new Error("Open and close times are required.");

  const docRef = await addDoc(windowsRef, {
    testId: input.testId,
    testName: input.testName ?? "",
    classId: input.classId ?? "",
    openDateTime: input.openDateTime,
    closeDateTime: input.closeDateTime,
    timezone: input.timezone || "America/Chicago",
    status: input.status || TESTING_WINDOW_STATUSES.SCHEDULED,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "testing_window_created",
    entityType: "testingWindow",
    entityId: docRef.id,
    userId,
  });

  return docRef.id;
}

/** @param {string} windowId @param {Partial<TestingWindowRecord>} input @param {string} userId */
export async function updateTestingWindow(windowId, input, userId) {
  await updateDoc(doc(db, "testingWindows", windowId), {
    ...(input.testId != null ? { testId: input.testId } : {}),
    ...(input.testName != null ? { testName: input.testName } : {}),
    ...(input.classId != null ? { classId: input.classId } : {}),
    ...(input.openDateTime != null ? { openDateTime: input.openDateTime } : {}),
    ...(input.closeDateTime != null ? { closeDateTime: input.closeDateTime } : {}),
    ...(input.timezone != null ? { timezone: input.timezone } : {}),
    ...(input.status != null ? { status: input.status } : {}),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "testing_window_updated",
    entityType: "testingWindow",
    entityId: windowId,
    userId,
  });
}

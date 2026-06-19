import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { writeAuditLog } from "./auditLogs.js";
import { listClassSessions } from "./classes.js";
import { getSystemSettings, saveSystemSettingsSection } from "./systemSettings.js";
import { listTestEligibility, updateTestEligibility } from "./testEligibility.js";

const SETTINGS_DOC = "default";
const settingsRef = doc(db, "lmsIntegrationSettings", SETTINGS_DOC);
const completionsRef = collection(db, "lmsCompletions");

/**
 * @typedef {Object} LmsIntegrationSettings
 * @property {boolean} enabled
 * @property {string} providerName
 * @property {string} apiBaseUrl
 * @property {string} gradePassbackMode
 * @property {string} notes
 */

export async function getLmsIntegrationSettings() {
  const settings = await getSystemSettings();
  const lms = settings.lms;
  return {
    enabled: Boolean(lms.enabled),
    providerName: lms.providerName ?? "",
    apiBaseUrl: lms.apiBaseUrl ?? "",
    gradePassbackMode: lms.gradePassbackMode ?? "manual",
    notes: lms.notes ?? "",
  };
}

/** @param {Partial<LmsIntegrationSettings>} input @param {string} userId */
export async function saveLmsIntegrationSettings(input, userId) {
  await saveSystemSettingsSection("lms", input, userId);

  await setDoc(
    settingsRef,
    {
      enabled: Boolean(input.enabled),
      providerName: input.providerName?.trim() ?? "",
      apiBaseUrl: input.apiBaseUrl?.trim() ?? "",
      gradePassbackMode: input.gradePassbackMode ?? "manual",
      notes: input.notes?.trim() ?? "",
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );

  await writeAuditLog({
    action: "lms_settings_updated",
    entityType: "lmsIntegrationSettings",
    entityId: SETTINGS_DOC,
    userId,
  });
}

/** @param {string} studentId */
export async function listLmsCompletionsByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(completionsRef, where("studentId", "==", studentId)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listLmsCompletions() {
  const snap = await getDocs(query(completionsRef));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

/**
 * @param {{ studentId: string, courseId: string, externalCourseId?: string, completedDate: string, score?: number, source?: string }} row
 * @param {string} userId
 */
export async function upsertLmsCompletion(row, userId) {
  const id = `${row.studentId}_${row.courseId || row.externalCourseId || "record"}`;
  await setDoc(
    doc(db, "lmsCompletions", id),
    {
      studentId: row.studentId,
      courseId: row.courseId ?? "",
      externalCourseId: row.externalCourseId ?? "",
      completedDate: row.completedDate,
      score: row.score == null ? null : Number(row.score),
      source: row.source ?? "import",
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true },
  );
  return id;
}

/**
 * @param {string} text
 */
export function parseLmsCompletionCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const rows = [];
  for (const line of lines.slice(1)) {
    const parts = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
    if (parts.length < 4) continue;
    rows.push({
      studentId: parts[0],
      courseId: parts[1],
      externalCourseId: parts[2] ?? "",
      completedDate: parts[3],
      score: parts[4] === "" || parts[4] == null ? null : Number(parts[4]),
    });
  }
  return rows;
}

export const LMS_COMPLETION_IMPORT_TEMPLATE = `studentId,courseId,externalCourseId,completedDate,score
STUDENT_ID,COURSE_ID,EXT-101,2026-01-15,92`;

/** @param {string} userId */
export async function importLmsCompletionsFromCsv(text, userId) {
  const rows = parseLmsCompletionCsv(text);
  for (const row of rows) {
    if (!row.studentId || !row.completedDate) continue;
    await upsertLmsCompletion({ ...row, source: "csv_import" }, userId);
  }
  await writeAuditLog({
    action: "lms_completions_imported",
    entityType: "lmsCompletions",
    userId,
    details: { count: rows.length },
  });
  return rows.length;
}

function studentHasLmsCompletion(studentId, courseId, completions) {
  return completions.some(
    (item) => item.studentId === studentId && (item.courseId === courseId || item.externalCourseId === courseId),
  );
}

/** @param {string} userId */
export async function syncEligibilityFromLmsCompletions(userId) {
  const [eligibilityRows, completions, classes] = await Promise.all([
    listTestEligibility(),
    listLmsCompletions(),
    listClassSessions(),
  ]);
  const classMap = new Map(classes.map((item) => [item.id, item]));

  let updated = 0;
  for (const row of eligibilityRows) {
    if (row.lmsMet) continue;
    const classSession = classMap.get(row.classId);
    if (!classSession?.courseId) continue;
    if (!studentHasLmsCompletion(row.studentId, classSession.courseId, completions)) continue;

    await updateTestEligibility(
      row.id,
      {
        ...row,
        lmsMet: true,
      },
      userId,
    );
    updated += 1;
  }

  await writeAuditLog({
    action: "lms_eligibility_synced",
    entityType: "testEligibility",
    userId,
    details: { updated },
  });

  return { updated };
}

/** @param {{ testResultId: string, studentId: string, score: number, passFail: string }} payload @param {string} userId */
export async function recordLmsGradePassback(payload, userId) {
  const settings = await getLmsIntegrationSettings();
  if (!settings.enabled) {
    return { skipped: true, reason: "LMS integration disabled." };
  }

  await setDoc(
    doc(db, "lmsGradePassbackLog", payload.testResultId),
    {
      ...payload,
      mode: settings.gradePassbackMode,
      status: settings.gradePassbackMode === "manual" ? "queued" : "sent",
      createdAt: serverTimestamp(),
      createdBy: userId,
    },
    { merge: true },
  );

  await writeAuditLog({
    action: "lms_grade_passback_queued",
    entityType: "lmsGradePassbackLog",
    entityId: payload.testResultId,
    userId,
    details: { score: payload.score, passFail: payload.passFail },
  });

  return { queued: true };
}

export function downloadLmsImportTemplate() {
  const blob = new Blob([LMS_COMPLETION_IMPORT_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "lms-completions-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

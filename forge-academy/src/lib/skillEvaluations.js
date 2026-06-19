import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { getClassSession } from "./classes.js";
import { getCourse } from "./courses.js";
import { listEnrolledRegistrationsByClass } from "./registrations.js";
import { listSkillsByTemplate } from "./skills.js";
import { createSkillStation, listSkillStationsByClass } from "./skillStations.js";
import { listSkillTemplatesByCourse } from "./skillTemplates.js";

export const SKILL_EVALUATION_STATUSES = {
  PENDING: "pending",
  PASS: "pass",
  FAIL: "fail",
  REMEDIATE: "remediate",
  COMPLETE: "complete",
};

export const SKILL_EVALUATION_STATUS_LABELS = {
  [SKILL_EVALUATION_STATUSES.PENDING]: "Pending",
  [SKILL_EVALUATION_STATUSES.PASS]: "Pass",
  [SKILL_EVALUATION_STATUSES.FAIL]: "Fail",
  [SKILL_EVALUATION_STATUSES.REMEDIATE]: "Remediation required",
  [SKILL_EVALUATION_STATUSES.COMPLETE]: "Complete",
};

/**
 * @typedef {Object} SkillEvaluationRecord
 * @property {string} id
 * @property {string} classId
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} skillId
 * @property {string} skillName
 * @property {string} templateId
 * @property {string} stationId
 * @property {string} evaluatorUserId
 * @property {string} evaluatorName
 * @property {number} score
 * @property {number} maxScore
 * @property {number} passingScore
 * @property {string} status
 * @property {string} notes
 * @property {string} remediationNotes
 * @property {string} sessionDate
 */

const evaluationsRef = collection(db, "skillEvaluations");

/** @param {string} classId @param {string} studentId @param {string} skillId */
export function skillEvaluationId(classId, studentId, skillId) {
  return `${classId}_${studentId}_${skillId}`;
}

function mapEvaluation(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    classId: data.classId ?? "",
    studentId: data.studentId ?? "",
    studentName: data.studentName ?? "",
    skillId: data.skillId ?? "",
    skillName: data.skillName ?? "",
    templateId: data.templateId ?? "",
    stationId: data.stationId ?? "",
    evaluatorUserId: data.evaluatorUserId ?? "",
    evaluatorName: data.evaluatorName ?? "",
    score: Number(data.score ?? 0),
    maxScore: Number(data.maxScore ?? 100),
    passingScore: Number(data.passingScore ?? 70),
    status: data.status ?? SKILL_EVALUATION_STATUSES.PENDING,
    notes: data.notes ?? "",
    remediationNotes: data.remediationNotes ?? "",
    sessionDate: data.sessionDate ?? "",
  };
}

function resolveEvaluationStatus(score, passingScore, requestedStatus) {
  if (requestedStatus === SKILL_EVALUATION_STATUSES.FAIL) {
    return SKILL_EVALUATION_STATUSES.FAIL;
  }
  if (requestedStatus === SKILL_EVALUATION_STATUSES.REMEDIATE) {
    return SKILL_EVALUATION_STATUSES.REMEDIATE;
  }
  if (score >= passingScore) {
    return SKILL_EVALUATION_STATUSES.PASS;
  }
  return SKILL_EVALUATION_STATUSES.REMEDIATE;
}

/** @param {string} classId */
export async function listSkillEvaluationsByClass(classId) {
  if (!classId) return [];
  const snap = await getDocs(query(evaluationsRef, where("classId", "==", classId)));
  return snap.docs
    .map((item) => mapEvaluation(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.studentName.localeCompare(b.studentName) || a.skillName.localeCompare(b.skillName));
}

/** @param {string} studentId */
export async function listSkillEvaluationsByStudent(studentId) {
  if (!studentId) return [];
  const snap = await getDocs(query(evaluationsRef, where("studentId", "==", studentId)));
  return snap.docs.map((item) => mapEvaluation(item.id, item.data())).filter(Boolean);
}

/** @param {string} classId @param {string} studentId */
export async function listSkillEvaluationsByClassStudent(classId, studentId) {
  const rows = await listSkillEvaluationsByClass(classId);
  return rows.filter((item) => item.studentId === studentId);
}

/** @param {SkillEvaluationRecord[]} evaluations */
export function summarizeStudentSkillProgress(evaluations) {
  return {
    total: evaluations.length,
    pending: evaluations.filter((item) => item.status === SKILL_EVALUATION_STATUSES.PENDING).length,
    pass: evaluations.filter((item) =>
      [SKILL_EVALUATION_STATUSES.PASS, SKILL_EVALUATION_STATUSES.COMPLETE].includes(item.status),
    ).length,
    fail: evaluations.filter((item) => item.status === SKILL_EVALUATION_STATUSES.FAIL).length,
    remediate: evaluations.filter((item) => item.status === SKILL_EVALUATION_STATUSES.REMEDIATE).length,
  };
}

/** @param {string} classId @param {string} studentId */
export async function studentMeetsSkillRequirements(classId, studentId) {
  const evaluations = await listSkillEvaluationsByClassStudent(classId, studentId);
  if (!evaluations.length) return false;
  return evaluations.every((item) =>
    [SKILL_EVALUATION_STATUSES.PASS, SKILL_EVALUATION_STATUSES.COMPLETE].includes(item.status),
  );
}

/** @param {string} classId @param {string} studentId */
export async function getStudentSkillSummary(classId, studentId) {
  const evaluations = await listSkillEvaluationsByClassStudent(classId, studentId);
  return summarizeStudentSkillProgress(evaluations);
}

/** @param {string} classId */
export async function initializeClassSkillEvaluations(classId) {
  const classSession = await getClassSession(classId);
  if (!classSession) throw new Error("Class session not found.");

  const course = await getCourse(classSession.courseId);
  if (!course?.skillsRequired) {
    throw new Error("This course is not configured to require skills evaluations.");
  }

  const templates = await listSkillTemplatesByCourse(course.id);
  if (!templates.length) {
    throw new Error("No active skill template found for this course.");
  }

  const template = templates[0];
  const skills = await listSkillsByTemplate(template.id);
  if (!skills.length) {
    throw new Error("Skill template has no skills defined.");
  }

  let stations = await listSkillStationsByClass(classId);
  if (!stations.length) {
    const stationId = await createSkillStation({
      classId,
      templateId: template.id,
      name: "Primary skills station",
      sessionDate: classSession.startDate ?? "",
      location: classSession.location ?? "",
    });
    stations = [{ id: stationId, classId, templateId: template.id, name: "Primary skills station" }];
  }

  const station = stations[0];
  const enrolled = await listEnrolledRegistrationsByClass(classId);
  let created = 0;

  for (const registration of enrolled) {
    for (const skill of skills) {
      const id = skillEvaluationId(classId, registration.studentId, skill.id);
      const existing = await getDoc(doc(db, "skillEvaluations", id));
      if (existing.exists()) continue;

      await setDoc(doc(db, "skillEvaluations", id), {
        classId,
        studentId: registration.studentId,
        studentName: registration.studentName,
        skillId: skill.id,
        skillName: skill.name,
        templateId: template.id,
        stationId: station.id,
        evaluatorUserId: "",
        evaluatorName: "",
        score: 0,
        maxScore: skill.maxScore,
        passingScore: skill.passingScore,
        status: SKILL_EVALUATION_STATUSES.PENDING,
        notes: "",
        remediationNotes: "",
        sessionDate: station.sessionDate ?? "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      created += 1;
    }
  }

  return { created, template, skills: skills.length, students: enrolled.length };
}

/**
 * @param {{ evaluationId: string, score: number, status?: string, notes?: string, evaluatorUserId: string, evaluatorName?: string }} input
 */
export async function submitSkillEvaluation(input) {
  const ref = doc(db, "skillEvaluations", input.evaluationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Skill evaluation not found.");

  const current = mapEvaluation(snap.id, snap.data());
  if (!current) throw new Error("Skill evaluation not found.");

  const score = Number(input.score ?? 0);

  await updateDoc(ref, {
    score,
    status: resolveEvaluationStatus(score, current.passingScore, input.status),
    notes: input.notes?.trim() ?? "",
    evaluatorUserId: input.evaluatorUserId,
    evaluatorName: input.evaluatorName?.trim() ?? "",
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {{ evaluationId: string, score: number, notes?: string, evaluatorUserId: string, evaluatorName?: string }} input
 */
export async function submitSkillRemediation(input) {
  const ref = doc(db, "skillEvaluations", input.evaluationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Skill evaluation not found.");

  const current = mapEvaluation(snap.id, snap.data());
  if (!current) throw new Error("Skill evaluation not found.");

  const score = Number(input.score ?? 0);
  const status =
    score >= current.passingScore
      ? SKILL_EVALUATION_STATUSES.COMPLETE
      : SKILL_EVALUATION_STATUSES.FAIL;

  await updateDoc(ref, {
    score,
    status,
    remediationNotes: input.notes?.trim() ?? "",
    evaluatorUserId: input.evaluatorUserId,
    evaluatorName: input.evaluatorName?.trim() ?? "",
    updatedAt: serverTimestamp(),
  });
}

/** @param {string} classId */
export async function summarizeClassSkillDashboard(classId) {
  const evaluations = await listSkillEvaluationsByClass(classId);
  const byStudent = new Map();

  for (const evaluation of evaluations) {
    if (!byStudent.has(evaluation.studentId)) {
      byStudent.set(evaluation.studentId, {
        studentId: evaluation.studentId,
        studentName: evaluation.studentName,
        evaluations: [],
      });
    }
    byStudent.get(evaluation.studentId).evaluations.push(evaluation);
  }

  return [...byStudent.values()]
    .map((row) => ({
      ...row,
      summary: summarizeStudentSkillProgress(row.evaluations),
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

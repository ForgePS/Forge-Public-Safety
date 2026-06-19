import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  gradeAttemptAnswers,
  processGradedAttempt,
} from "./testGrading.js";
import { randomBytes } from "crypto";

const db = () => getFirestore();
const ADMIN_ROLES = new Set(["academy_admin", "super_admin", "creator"]);
const PROCTOR_ROLES = new Set(["academy_admin", "super_admin", "instructor"]);

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function sessionToken() {
  return randomBytes(24).toString("hex");
}

async function getUser(uid) {
  const snap = await db().doc(`users/${uid}`).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function assertAdmin(uid) {
  const user = await getUser(uid);
  if (!user || !ADMIN_ROLES.has(user.role)) {
    throw new HttpsError("permission-denied", "Academy admin access is required.");
  }
  return user;
}

async function assertProctor(uid) {
  const user = await getUser(uid);
  if (!user || !PROCTOR_ROLES.has(user.role)) {
    throw new HttpsError("permission-denied", "Proctor access is required.");
  }
  return user;
}

async function getStudentIdForUser(uid) {
  const user = await getUser(uid);
  if (!user || user.role !== "student" || !user.studentId) {
    throw new HttpsError("permission-denied", "Student account required.");
  }
  return user.studentId;
}

async function writeAuditLog({ action, entityType, entityId, userId, details = {} }) {
  await db().collection("auditLogs").add({
    action,
    entityType,
    entityId: entityId ?? "",
    userId,
    details,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function writeTestEvent({ testSessionId, testAttemptId, studentId, eventType, metadata = {} }) {
  await db().collection("testEvents").add({
    testSessionId,
    testAttemptId: testAttemptId ?? "",
    studentId,
    eventType,
    metadata,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function writeProctorEvent({ testSessionId, studentId, testId, action, performedBy, reason = "" }) {
  await db().collection("proctorEvents").add({
    testSessionId,
    studentId,
    testId,
    action,
    performedBy,
    reason,
    createdAt: FieldValue.serverTimestamp(),
  });
}

function stripQuestionForDelivery(question, randomizeAnswers) {
  let options = (question.answerOptions ?? []).map((option) => ({
    id: option.id,
    text: option.text,
  }));
  if (randomizeAnswers) options = shuffle(options);
  return {
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    points: Number(question.points ?? 1),
    answerOptions: options,
  };
}

function selectQuestionsForBlueprint(blueprint, questions) {
  const active = questions.filter((question) => question.active !== false);
  const byPool = new Map();
  for (const question of active) {
    const poolId = question.questionPoolId || "_unassigned";
    if (!byPool.has(poolId)) byPool.set(poolId, []);
    byPool.get(poolId).push(question);
  }

  /** @type {typeof questions} */
  const locked = [];
  for (const rule of blueprint.poolRules ?? []) {
    const poolQuestions = shuffle(byPool.get(rule.questionPoolId) ?? []);
    const count = Number(rule.numberOfQuestions ?? 0);
    if (poolQuestions.length < count) {
      throw new HttpsError(
        "failed-precondition",
        `Pool ${rule.questionPoolId} does not have enough questions.`,
      );
    }
    locked.push(...poolQuestions.slice(0, count));
  }
  return locked;
}

export async function publishTestVersion(uid, { testId }) {
  await assertAdmin(uid);
  if (!testId) throw new HttpsError("invalid-argument", "testId is required.");

  const testSnap = await db().doc(`tests/${testId}`).get();
  if (!testSnap.exists) throw new HttpsError("not-found", "Test not found.");
  const test = { id: testSnap.id, ...testSnap.data() };

  if (!test.blueprintId || !test.questionBankId) {
    throw new HttpsError("failed-precondition", "Test requires a blueprint and question bank.");
  }

  const [blueprintSnap, questionSnap, priorVersionsSnap] = await Promise.all([
    db().doc(`testBlueprints/${test.blueprintId}`).get(),
    db().collection("testQuestions").where("questionBankId", "==", test.questionBankId).get(),
    db().collection("testVersions").where("testId", "==", testId).get(),
  ]);

  if (!blueprintSnap.exists) throw new HttpsError("not-found", "Blueprint not found.");
  const blueprint = blueprintSnap.data();
  const questions = questionSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
  const lockedQuestions = selectQuestionsForBlueprint(blueprint, questions);
  const versionNumber = priorVersionsSnap.size + 1;

  const versionRef = await db().collection("testVersions").add({
    testId,
    testName: test.name ?? "",
    versionNumber,
    lockedQuestions,
    totalQuestions: lockedQuestions.length,
    passingScore: Number(test.passingScore ?? blueprint.passingScore ?? 70),
    timeLimitMinutes: test.timeLimitMinutes ?? blueprint.timeLimitMinutes ?? null,
    randomizeQuestions: test.randomizeQuestions !== false,
    randomizeAnswers: test.randomizeAnswers !== false,
    publishedAt: FieldValue.serverTimestamp(),
    publishedBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  await db().doc(`tests/${testId}`).set(
    {
      currentTestVersionId: versionRef.id,
      published: true,
      status: "active",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeAuditLog({
    action: "test_version_published",
    entityType: "testVersion",
    entityId: versionRef.id,
    userId: uid,
    details: { testId, versionNumber },
  });

  return { testVersionId: versionRef.id, versionNumber };
}

export async function createTestAssignment(uid, input) {
  await assertAdmin(uid);
  const { testId, testVersionId, classId = "", studentId = "", openDate, closeDate, studentIds = [] } = input ?? {};
  if (!testId || !openDate || !closeDate) {
    throw new HttpsError("invalid-argument", "testId, openDate, and closeDate are required.");
  }

  const testSnap = await db().doc(`tests/${testId}`).get();
  if (!testSnap.exists) throw new HttpsError("not-found", "Test not found.");
  const test = testSnap.data();
  const versionId = testVersionId || test.currentTestVersionId;
  if (!versionId) throw new HttpsError("failed-precondition", "Publish a test version before assigning.");

  /** @type {string[]} */
  const targets = studentIds.length ? studentIds : studentId ? [studentId] : [];
  const assignments = [];

  if (targets.length) {
    for (const targetStudentId of targets) {
      const ref = await db().collection("testAssignments").add({
        testId,
        testName: test.name ?? "",
        testVersionId: versionId,
        classId,
        studentId: targetStudentId,
        assignedBy: uid,
        openDate,
        closeDate,
        status: "assigned",
        restartAllowed: false,
        showResultSummary: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      assignments.push(ref.id);
    }
  } else {
    const ref = await db().collection("testAssignments").add({
      testId,
      testName: test.name ?? "",
      testVersionId: versionId,
      classId,
      studentId: "",
      assignedBy: uid,
      openDate,
      closeDate,
      status: "assigned",
      restartAllowed: false,
      showResultSummary: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    assignments.push(ref.id);
  }

  await writeAuditLog({
    action: "test_assignment_created",
    entityType: "testAssignment",
    entityId: assignments[0] ?? "",
    userId: uid,
    details: { testId, count: assignments.length },
  });

  return { assignmentIds: assignments };
}

async function loadAssignmentForStudent(assignmentId, studentId) {
  const snap = await db().doc(`testAssignments/${assignmentId}`).get();
  if (!snap.exists) throw new HttpsError("not-found", "Assignment not found.");
  const assignment = { id: snap.id, ...snap.data() };

  if (assignment.studentId && assignment.studentId !== studentId) {
    throw new HttpsError("permission-denied", "This assignment belongs to another student.");
  }

  if (assignment.classId && !assignment.studentId) {
    const registrationSnap = await db()
      .collection("registrations")
      .where("classId", "==", assignment.classId)
      .where("studentId", "==", studentId)
      .where("status", "==", "enrolled")
      .limit(1)
      .get();
    if (registrationSnap.empty) {
      throw new HttpsError("permission-denied", "You are not enrolled in this class assignment.");
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  if (assignment.openDate && today < assignment.openDate) {
    throw new HttpsError("failed-precondition", "This test is not open yet.");
  }
  if (assignment.closeDate && today > assignment.closeDate) {
    throw new HttpsError("failed-precondition", "This test assignment has closed.");
  }

  return assignment;
}

function buildDeliveredQuestions(version, test) {
  let questions = (version.lockedQuestions ?? []).map((question) =>
    stripQuestionForDelivery(question, test.randomizeAnswers !== false),
  );
  if (test.randomizeQuestions !== false) questions = shuffle(questions);
  return questions;
}

export async function startTestSession(uid, input) {
  const studentId = await getStudentIdForUser(uid);
  const { assignmentId, deviceId = "", userAgent = "" } = input ?? {};
  if (!assignmentId) throw new HttpsError("invalid-argument", "assignmentId is required.");

  const assignment = await loadAssignmentForStudent(assignmentId, studentId);
  const [testSnap, versionSnap, studentSnap] = await Promise.all([
    db().doc(`tests/${assignment.testId}`).get(),
    db().doc(`testVersions/${assignment.testVersionId}`).get(),
    db().doc(`students/${studentId}`).get(),
  ]);

  if (!testSnap.exists || !versionSnap.exists) {
    throw new HttpsError("not-found", "Test version not found.");
  }
  const test = { id: testSnap.id, ...testSnap.data() };
  const version = { id: versionSnap.id, ...versionSnap.data() };
  const student = studentSnap.exists ? studentSnap.data() : {};

  const activeSessionSnap = await db()
    .collection("testSessions")
    .where("assignmentId", "==", assignmentId)
    .where("studentId", "==", studentId)
    .where("status", "in", ["active", "paused"])
    .limit(1)
    .get();

  if (!activeSessionSnap.empty && !assignment.restartAllowed) {
    const existing = activeSessionSnap.docs[0];
    const attemptSnap = await db().doc(`testAttempts/${existing.data().attemptId}`).get();
    const attempt = attemptSnap.data() ?? {};
    return {
      sessionId: existing.id,
      attemptId: existing.data().attemptId,
      resumed: true,
      questions: attempt.deliveredQuestions ?? [],
      answers: attempt.answers ?? [],
      flaggedQuestionIds: attempt.flaggedQuestionIds ?? [],
      timeRemainingSeconds: attempt.timeRemainingSeconds ?? null,
      status: existing.data().status,
    };
  }

  const deliveredQuestions = buildDeliveredQuestions(version, test);
  const timeLimitMinutes = Number(test.timeLimitMinutes ?? version.timeLimitMinutes ?? 0);
  const timeRemainingSeconds = timeLimitMinutes > 0 ? timeLimitMinutes * 60 : null;
  const token = sessionToken();
  const now = FieldValue.serverTimestamp();

  const attemptRef = db().collection("testAttempts").doc();
  const sessionRef = db().collection("testSessions").doc();

  await db().runTransaction(async (transaction) => {
    transaction.set(attemptRef, {
      deliveryMode: "online",
      testId: assignment.testId,
      testName: test.name ?? "",
      testVersionId: assignment.testVersionId,
      assignmentId,
      sessionId: sessionRef.id,
      studentId,
      studentName: `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
      classId: assignment.classId ?? "",
      startedAt: now,
      submittedAt: null,
      timeRemainingSeconds,
      deliveredQuestions,
      answers: [],
      flaggedQuestionIds: [],
      status: "in_progress",
      createdAt: now,
      updatedAt: now,
    });

    transaction.set(sessionRef, {
      testId: assignment.testId,
      testName: test.name ?? "",
      testVersionId: assignment.testVersionId,
      assignmentId,
      attemptId: attemptRef.id,
      studentId,
      studentName: `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
      classId: assignment.classId ?? "",
      departmentName: student.departmentName ?? "",
      deviceId,
      userAgent,
      sessionToken: token,
      startedAt: now,
      lastActivityAt: now,
      expiresAt:
        timeRemainingSeconds != null
          ? Timestamp.fromDate(new Date(Date.now() + timeRemainingSeconds * 1000))
          : null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });

  await writeTestEvent({
    testSessionId: sessionRef.id,
    testAttemptId: attemptRef.id,
    studentId,
    eventType: "test_started",
  });

  return {
    sessionId: sessionRef.id,
    attemptId: attemptRef.id,
    resumed: false,
    questions: deliveredQuestions,
    timeRemainingSeconds,
    status: "active",
  };
}

export async function saveTestAnswers(uid, input) {
  const studentId = await getStudentIdForUser(uid);
  const { attemptId, answers = [], flaggedQuestionIds = [], timeRemainingSeconds = null } = input ?? {};
  if (!attemptId) throw new HttpsError("invalid-argument", "attemptId is required.");

  const attemptRef = db().doc(`testAttempts/${attemptId}`);
  const attemptSnap = await attemptRef.get();
  if (!attemptSnap.exists) throw new HttpsError("not-found", "Attempt not found.");
  const attempt = attemptSnap.data();

  if (attempt.studentId !== studentId) {
    throw new HttpsError("permission-denied", "You cannot modify this attempt.");
  }
  if (!["in_progress", "paused"].includes(attempt.status)) {
    throw new HttpsError("failed-precondition", "This attempt is no longer editable.");
  }

  const sanitizedAnswers = answers.map((answer) => ({
    questionId: answer.questionId,
    selectedOptionIds: Array.isArray(answer.selectedOptionIds) ? answer.selectedOptionIds : [],
    shortAnswerText: answer.shortAnswerText ?? "",
  }));

  await attemptRef.set(
    {
      answers: sanitizedAnswers,
      flaggedQuestionIds: Array.isArray(flaggedQuestionIds) ? flaggedQuestionIds : [],
      timeRemainingSeconds,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (attempt.sessionId) {
    await db().doc(`testSessions/${attempt.sessionId}`).set(
      {
        lastActivityAt: FieldValue.serverTimestamp(),
        timeRemainingSeconds,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await writeTestEvent({
    testSessionId: attempt.sessionId,
    testAttemptId: attemptId,
    studentId,
    eventType: "answer_saved",
    metadata: { answerCount: sanitizedAnswers.length },
  });

  return { saved: true };
}

function gradeAnswers(lockedQuestions, answers, passingScore) {
  return gradeAttemptAnswers(lockedQuestions, answers, passingScore);
}

async function finalizeAttempt({ attemptRef, sessionRef, version, assignment, graded, uid, forced = false }) {
  const now = FieldValue.serverTimestamp();
  const attemptSnap = await attemptRef.get();
  const attempt = attemptSnap.data();
  if (attempt.status === "submitted") {
    return { alreadySubmitted: true, result: attempt.resultSummary ?? null };
  }

  await db().runTransaction(async (transaction) => {
    const freshAttempt = await transaction.get(attemptRef);
    if (freshAttempt.data()?.status === "submitted") return;
    transaction.set(
      attemptRef,
      {
        status: "submitted",
        submittedAt: now,
        updatedAt: now,
        resultSummary: {
          score: graded.score,
          maxScore: graded.maxScore,
          passed: graded.passFail === "pass",
          passFail: graded.passFail,
        },
      },
      { merge: true },
    );
    transaction.set(
      sessionRef,
      {
        status: "submitted",
        lastActivityAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  const attemptRecord = { id: attemptRef.id, ...attempt };
  await processGradedAttempt({
    attempt: attemptRecord,
    graded,
    uid,
    forced,
  });

  await writeTestEvent({
    testSessionId: attempt.sessionId,
    testAttemptId: attemptRef.id,
    studentId: attempt.studentId,
    eventType: forced ? "forced_submission" : "test_submitted",
    metadata: { score: graded.score, passFail: graded.passFail },
  });

  await writeAuditLog({
    action: forced ? "test_force_submitted" : "test_submitted",
    entityType: "testAttempt",
    entityId: attemptRef.id,
    userId: uid,
    details: { score: graded.score, passFail: graded.passFail },
  });

  return {
    alreadySubmitted: false,
    result: {
      score: graded.score,
      maxScore: graded.maxScore,
      passed: graded.passFail === "pass",
      passFail: graded.passFail,
      showSummary: assignment?.showResultSummary !== false,
    },
  };
}

export async function submitTestAttempt(uid, input) {
  const studentId = await getStudentIdForUser(uid);
  const { attemptId } = input ?? {};
  if (!attemptId) throw new HttpsError("invalid-argument", "attemptId is required.");

  const attemptRef = db().doc(`testAttempts/${attemptId}`);
  const attemptSnap = await attemptRef.get();
  if (!attemptSnap.exists) throw new HttpsError("not-found", "Attempt not found.");
  const attempt = { id: attemptSnap.id, ...attemptSnap.data() };

  if (attempt.studentId !== studentId) {
    throw new HttpsError("permission-denied", "You cannot submit this attempt.");
  }
  if (attempt.status === "submitted") {
    return { alreadySubmitted: true, result: attempt.resultSummary ?? null };
  }
  if (!["in_progress", "paused"].includes(attempt.status)) {
    throw new HttpsError("failed-precondition", "Attempt cannot be submitted.");
  }

  const [versionSnap, assignmentSnap, sessionRef] = await Promise.all([
    db().doc(`testVersions/${attempt.testVersionId}`).get(),
    db().doc(`testAssignments/${attempt.assignmentId}`).get(),
    db().doc(`testSessions/${attempt.sessionId}`),
  ]);

  if (!versionSnap.exists) throw new HttpsError("not-found", "Test version not found.");
  const version = versionSnap.data();
  const assignment = assignmentSnap.exists ? assignmentSnap.data() : {};
  const graded = gradeAnswers(version.lockedQuestions ?? [], attempt.answers ?? [], version.passingScore);

  return finalizeAttempt({
    attemptRef,
    sessionRef,
    version,
    assignment,
    graded,
    uid,
  });
}

export async function proctorTestAction(uid, input) {
  const proctor = await assertProctor(uid);
  const { sessionId, action, reason = "" } = input ?? {};
  if (!sessionId || !action) throw new HttpsError("invalid-argument", "sessionId and action are required.");

  const sessionRef = db().doc(`testSessions/${sessionId}`);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) throw new HttpsError("not-found", "Session not found.");
  const session = { id: sessionSnap.id, ...sessionSnap.data() };

  if (proctor.role === "instructor" && session.classId) {
    const classSnap = await db().doc(`classes/${session.classId}`).get();
    const instructorIds = classSnap.exists ? classSnap.data()?.instructorIds ?? [] : [];
    if (!instructorIds.includes(uid)) {
      throw new HttpsError("permission-denied", "You are not assigned to proctor this class.");
    }
  }

  const attemptRef = db().doc(`testAttempts/${session.attemptId}`);
  const now = FieldValue.serverTimestamp();

  if (action === "pause") {
    await sessionRef.set({ status: "paused", updatedAt: now, lastActivityAt: now }, { merge: true });
    await attemptRef.set({ status: "paused", updatedAt: now }, { merge: true });
  } else if (action === "resume") {
    await sessionRef.set({ status: "active", updatedAt: now, lastActivityAt: now }, { merge: true });
    await attemptRef.set({ status: "in_progress", updatedAt: now }, { merge: true });
  } else if (action === "void") {
    await sessionRef.set({ status: "voided", updatedAt: now }, { merge: true });
    await attemptRef.set({ status: "voided", updatedAt: now }, { merge: true });
  } else if (action === "restart_allowed") {
    await db().doc(`testAssignments/${session.assignmentId}`).set({ restartAllowed: true, updatedAt: now }, { merge: true });
  } else if (action === "force_submit") {
    const attemptSnap = await attemptRef.get();
    const attempt = attemptSnap.data();
    const versionSnap = await db().doc(`testVersions/${attempt.testVersionId}`).get();
    const assignmentSnap = await db().doc(`testAssignments/${attempt.assignmentId}`).get();
    const graded = gradeAnswers(
      versionSnap.data()?.lockedQuestions ?? [],
      attempt.answers ?? [],
      versionSnap.data()?.passingScore,
    );
    await finalizeAttempt({
      attemptRef,
      sessionRef,
      version: versionSnap.data(),
      assignment: assignmentSnap.data(),
      graded,
      uid,
      forced: true,
    });
  } else if (action === "note") {
    await sessionRef.set({ proctorNote: reason, updatedAt: now }, { merge: true });
  } else {
    throw new HttpsError("invalid-argument", "Unsupported proctor action.");
  }

  await writeProctorEvent({
    testSessionId: sessionId,
    studentId: session.studentId,
    testId: session.testId,
    action,
    performedBy: uid,
    reason,
  });

  return { ok: true, action };
}

export async function listActiveTestSessions(uid, { testId = "", classId = "" } = {}) {
  await assertProctor(uid);
  let queryRef = db().collection("testSessions").where("status", "in", ["active", "paused", "submitted"]);
  if (testId) queryRef = queryRef.where("testId", "==", testId);
  if (classId) queryRef = queryRef.where("classId", "==", classId);
  const snap = await queryRef.get();
  return snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
}

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  assignNextCertificateNumber,
  resolveCertificateTemplateId,
} from "./certificateSerialNumbers.js";

const db = () => getFirestore();
const MANUAL_QUESTION_TYPES = new Set(["short_answer", "scenario"]);

export function gradeAttemptAnswers(lockedQuestions, answers, passingScore) {
  const answerMap = new Map((answers ?? []).map((answer) => [answer.questionId, answer]));
  let autoEarned = 0;
  let possiblePoints = 0;
  /** @type {Array<{ questionId: string, responseText: string, maxPoints: number }>} */
  const manualQueueItems = [];
  /** @type {Array<{ questionId: string, correct: boolean | null, selectedOptionIds: string[] }>} */
  const analyticsUpdates = [];

  for (const question of lockedQuestions ?? []) {
    const points = Number(question.points ?? 1);
    possiblePoints += points;
    const answer = answerMap.get(question.id);

    if (MANUAL_QUESTION_TYPES.has(question.questionType)) {
      manualQueueItems.push({
        questionId: question.id,
        responseText: answer?.shortAnswerText ?? "",
        maxPoints: points,
      });
      analyticsUpdates.push({
        questionId: question.id,
        correct: null,
        selectedOptionIds: [],
      });
      continue;
    }

    const correctIds = (question.answerOptions ?? [])
      .filter((option) => option.isCorrect)
      .map((option) => option.id)
      .sort();
    const selectedIds = [...(answer?.selectedOptionIds ?? [])].sort();
    const correct = JSON.stringify(correctIds) === JSON.stringify(selectedIds);
    if (correct) autoEarned += points;

    analyticsUpdates.push({
      questionId: question.id,
      correct,
      selectedOptionIds: answer?.selectedOptionIds ?? [],
    });
  }

  const percentage =
    possiblePoints > 0 ? Math.round((autoEarned / possiblePoints) * 1000) / 10 : 0;
  const passing = Number(passingScore ?? 70);
  const passFail =
    manualQueueItems.length > 0
      ? "pending_manual_review"
      : percentage >= passing
        ? "pass"
        : "fail";

  return {
    autoEarned,
    possiblePoints,
    percentage,
    passingScore: passing,
    passFail,
    passed: passFail === "pass",
    manualQueueItems,
    analyticsUpdates,
    manualPendingCount: manualQueueItems.length,
    score: percentage,
    maxScore: 100,
  };
}

export async function writeAuditLog({ action, entityType, entityId, userId, details = {} }) {
  await db().collection("auditLogs").add({
    action,
    entityType,
    entityId: entityId ?? "",
    userId,
    details,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function updateQuestionAnalytics(testId, analyticsUpdates) {
  for (const update of analyticsUpdates) {
    const docId = `${testId}_${update.questionId}`;
    const ref = db().doc(`questionAnalytics/${docId}`);
    const snap = await ref.get();
    const prior = snap.exists ? snap.data() : {};
    const timesUsed = Number(prior.timesUsed ?? 0) + 1;
    let correctCount = Number(prior.correctCount ?? 0);
    let incorrectCount = Number(prior.incorrectCount ?? 0);

    if (update.correct === true) correctCount += 1;
    else if (update.correct === false) incorrectCount += 1;

    const gradedCount = correctCount + incorrectCount;
    const percentCorrect = gradedCount > 0 ? Math.round((correctCount / gradedCount) * 100) : 0;
    let flaggedForReview = Boolean(prior.flaggedForReview);

    if (gradedCount >= 5) {
      const failureRate = incorrectCount / gradedCount;
      const successRate = correctCount / gradedCount;
      if (failureRate > 0.75 || successRate > 0.98) flaggedForReview = true;

      if (flaggedForReview && !prior.flaggedForReview) {
        await db().collection("examReviewQueue").add({
          questionId: update.questionId,
          testId,
          reason: failureRate > 0.75 ? "high_failure_rate" : "too_easy",
          status: "pending_review",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await ref.set(
      {
        questionId: update.questionId,
        testId,
        timesUsed,
        correctCount,
        incorrectCount,
        percentCorrect,
        flaggedForReview,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}

export async function createManualGradingQueueItems({
  testAttemptId,
  testId,
  studentId,
  classId,
  items,
}) {
  const ids = [];
  for (const item of items) {
    const ref = await db().collection("manualGradingQueue").add({
      testAttemptId,
      testId,
      studentId,
      classId: classId ?? "",
      questionId: item.questionId,
      responseText: item.responseText ?? "",
      maxPoints: item.maxPoints,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    ids.push(ref.id);
  }
  return ids;
}

export async function saveStructuredTestResult({
  resultId,
  attempt,
  graded,
  attemptNumber,
  gradedBy = "system",
}) {
  const now = FieldValue.serverTimestamp();
  await db().doc(`testResults/${resultId}`).set(
    {
      deliveryMode: "online",
      testAttemptId: attempt.id,
      testId: attempt.testId,
      testVersionId: attempt.testVersionId ?? "",
      assignmentId: attempt.assignmentId ?? "",
      studentId: attempt.studentId,
      studentName: attempt.studentName ?? "",
      classId: attempt.classId ?? "",
      testName: attempt.testName ?? "",
      score: graded.score,
      possiblePoints: graded.possiblePoints,
      percentage: graded.percentage,
      maxScore: graded.maxScore,
      passingScore: graded.passingScore,
      passFail: graded.passFail,
      passed: graded.passFail === "pass",
      status: graded.passFail === "pass" ? "pass" : graded.passFail === "fail" ? "fail" : "pending",
      attemptNumber,
      attemptCount: attemptNumber,
      gradedAt: now,
      gradedBy,
      manualPendingCount: graded.manualPendingCount ?? 0,
      updatedAt: now,
    },
    { merge: true },
  );
  return resultId;
}

export async function getAttemptNumber(classId, studentId, testId) {
  const snap = await db()
    .collection("testResults")
    .where("studentId", "==", studentId)
    .where("testId", "==", testId)
    .get();
  if (classId) {
    const match = snap.docs.find((docItem) => docItem.data().classId === classId);
    return Number(match?.data()?.attemptCount ?? 0) + 1;
  }
  return snap.size + 1;
}

export async function createRemediationForFailure({ studentId, testResultId, classId, assignedBy }) {
  const ref = await db().collection("remediationAssignments").add({
    studentId,
    testResultId,
    classId: classId ?? "",
    assignedBy: assignedBy ?? "system",
    remediationType: "study_assignment",
    notes: "Assigned automatically after exam failure.",
    status: "assigned",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await writeAuditLog({
    action: "remediation_assigned",
    entityType: "remediationAssignment",
    entityId: ref.id,
    userId: assignedBy ?? "system",
  });
  return ref.id;
}

export async function enqueueCertificateRelease({
  studentId,
  classId,
  courseId,
  testResultId,
  completionId,
  certificateId,
}) {
  if (!classId || !studentId) return null;
  const ref = await db().collection("certificateReleaseQueue").add({
    studentId,
    classId,
    courseId: courseId ?? "",
    certificateId: certificateId ?? "",
    completionId: completionId ?? `${classId}_${studentId}`,
    testResultId: testResultId ?? "",
    status: "pending_admin_review",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await writeAuditLog({
    action: "certificate_queued_for_release",
    entityType: "certificateReleaseQueue",
    entityId: ref.id,
    userId: "system",
  });
  return ref.id;
}

export async function createPendingCertificateAndTranscript({
  attempt,
  testResultId,
  issuedByUid = "system",
}) {
  if (!attempt.classId) return null;

  const completionRef = db().doc(`completions/${attempt.classId}_${attempt.studentId}`);
  const completionSnap = await completionRef.get();
  const completion = completionSnap.exists ? completionSnap.data() : null;
  if (!completion) return null;
  if (completion.certificateId) return completion.certificateId;

  const existingCertSnap = await db()
    .collection("certificates")
    .where("classId", "==", attempt.classId)
    .where("studentId", "==", attempt.studentId)
    .limit(1)
    .get();
  if (!existingCertSnap.empty) {
    const existingId = existingCertSnap.docs[0].id;
    await completionRef.set({ certificateId: existingId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return existingId;
  }

  const classSnap = await db().doc(`classes/${attempt.classId}`).get();
  const classSession = classSnap.exists ? classSnap.data() : {};
  const validationCode = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  const certificateNumber = await assignNextCertificateNumber({
    courseId: completion.courseId ?? "",
    courseNumber: completion.courseNumber ?? "",
  });
  const templateId = await resolveCertificateTemplateId(completion.courseId ?? "");

  const certRef = await db().collection("certificates").add({
    certificateNumber,
    validationCode,
    studentId: attempt.studentId,
    studentName: attempt.studentName ?? "",
    courseId: completion.courseId ?? "",
    courseName: completion.courseName ?? attempt.testName,
    courseNumber: completion.courseNumber ?? "",
    classId: attempt.classId,
    completionDate: new Date().toISOString().slice(0, 10),
    hours: completion.hours ?? 0,
    location: classSession.location ?? "",
    instructorNames: (classSession.instructorNames ?? []).join(", "),
    templateId,
    status: "pending_release",
    testResultId,
    issuedByUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db().collection("transcriptEntries").doc(`${attempt.classId}_${attempt.studentId}`).set(
    {
      studentId: attempt.studentId,
      classId: attempt.classId,
      courseId: completion.courseId ?? "",
      courseName: completion.courseName ?? "",
      courseNumber: completion.courseNumber ?? "",
      completedDate: "",
      hours: completion.hours ?? 0,
      result: "Pending review",
      certificateNumber,
      certificateId: certRef.id,
      status: "pending_release",
      testResultId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await enqueueCertificateRelease({
    studentId: attempt.studentId,
    classId: attempt.classId,
    courseId: completion.courseId ?? "",
    testResultId,
    completionId: `${attempt.classId}_${attempt.studentId}`,
    certificateId: certRef.id,
  });

  return certRef.id;
}

export async function processGradedAttempt({
  attempt,
  graded,
  uid,
  forced = false,
}) {
  const resultId =
    attempt.classId && attempt.studentId
      ? `${attempt.classId}_${attempt.studentId}_${attempt.testId}`
      : `${attempt.studentId}_${attempt.testId}_${attempt.id}`;

  const attemptNumber = await getAttemptNumber(attempt.classId, attempt.studentId, attempt.testId);

  await saveStructuredTestResult({
    resultId,
    attempt,
    graded,
    attemptNumber,
    gradedBy: forced ? uid : "system",
  });

  if (graded.manualQueueItems?.length) {
    await createManualGradingQueueItems({
      testAttemptId: attempt.id,
      testId: attempt.testId,
      studentId: attempt.studentId,
      classId: attempt.classId,
      items: graded.manualQueueItems,
    });
  }

  await updateQuestionAnalytics(attempt.testId, graded.analyticsUpdates ?? []);

  await writeAuditLog({
    action: "test_auto_graded",
    entityType: "testResult",
    entityId: resultId,
    userId: uid,
    details: {
      passFail: graded.passFail,
      percentage: graded.percentage,
      manualPendingCount: graded.manualPendingCount ?? 0,
    },
  });

  if (graded.passFail === "fail") {
    await createRemediationForFailure({
      studentId: attempt.studentId,
      testResultId: resultId,
      classId: attempt.classId,
      assignedBy: uid,
    });
  }

  if (graded.passFail === "pass") {
    await createPendingCertificateAndTranscript({
      attempt: { ...attempt, id: attempt.id },
      testResultId: resultId,
      issuedByUid: uid,
    });
  }

  return { resultId, attemptNumber };
}

export async function recalculateTestResult(testResultId) {
  const resultSnap = await db().doc(`testResults/${testResultId}`).get();
  if (!resultSnap.exists) throw new Error("Test result not found.");
  const result = resultSnap.data();

  const pendingSnap = await db()
    .collection("manualGradingQueue")
    .where("testAttemptId", "==", result.testAttemptId)
    .where("status", "==", "pending")
    .get();
  if (!pendingSnap.empty) {
    await resultSnap.ref.set(
      { passFail: "pending_manual_review", passed: false, status: "pending", updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return { passFail: "pending_manual_review" };
  }

  const manualSnap = await db()
    .collection("manualGradingQueue")
    .where("testAttemptId", "==", result.testAttemptId)
    .where("status", "==", "graded")
    .get();

  const attemptSnap = await db().doc(`testAttempts/${result.testAttemptId}`).get();
  if (!attemptSnap.exists) throw new Error("Attempt not found.");
  const attempt = attemptSnap.data();
  const versionSnap = await db().doc(`testVersions/${attempt.testVersionId}`).get();
  const lockedQuestions = versionSnap.data()?.lockedQuestions ?? [];

  let autoEarned = 0;
  let possiblePoints = 0;
  const autoGrade = gradeAttemptAnswers(lockedQuestions, attempt.answers ?? [], result.passingScore);
  autoEarned = autoGrade.autoEarned;
  possiblePoints = autoGrade.possiblePoints;

  let manualEarned = 0;
  for (const docItem of manualSnap.docs) {
    manualEarned += Number(docItem.data().pointsAwarded ?? 0);
  }

  const earned = autoEarned + manualEarned;
  const percentage = possiblePoints > 0 ? Math.round((earned / possiblePoints) * 1000) / 10 : 0;
  const passFail = percentage >= Number(result.passingScore ?? 70) ? "pass" : "fail";

  await resultSnap.ref.set(
    {
      score: percentage,
      percentage,
      passFail,
      passed: passFail === "pass",
      status: passFail,
      gradedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (passFail === "pass") {
    await createPendingCertificateAndTranscript({
      attempt: { ...attempt, id: result.testAttemptId },
      testResultId,
    });
  }

  return { passFail, percentage };
}

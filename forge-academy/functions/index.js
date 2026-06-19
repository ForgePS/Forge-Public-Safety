import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";
import {
  buildRegistrationApprovedStudentEmail,
  buildRegistrationSubmittedDepartmentEmail,
  buildRegistrationSubmittedStudentEmail,
} from "./lib/templates.js";
import { sendEmailMessage } from "./lib/sendEmail.js";
import {
  createPortalUserAccount,
  resetPortalUserPasswordAccount,
  updatePortalUserAccount,
} from "./lib/portalUsers.js";
import {
  createTestAssignment,
  listActiveTestSessions,
  proctorTestAction,
  publishTestVersion,
  saveTestAnswers,
  startTestSession,
  submitTestAttempt,
} from "./lib/onlineTesting.js";
import {
  completeRemediation,
  getTestingDashboardMetrics,
  gradeManualQueueItem,
  overrideTestScore,
  recordStateCertificationTest,
  requestRetest,
  reviewCertificateRelease,
  reviewChallengeTestRequest,
  reviewRetestRequest,
  submitChallengeTestRequest,
} from "./lib/testGradingActions.js";
import { runScheduledReportExports } from "./lib/scheduledReports.js";
import { handleLmsCompletionWebhook, processLmsGradePassback } from "./lib/lmsWebhook.js";
import {
  notifyAdminsRegistrationSubmitted,
  notifyDepartmentRegistrationSubmitted,
  syncNotificationsForUser,
} from "./lib/notificationSync.js";
import { fetchPublishedGoogleSheet } from "./lib/googleSheetsFetch.js";
import { getDigitalDisplayPayload } from "./lib/digitalDashboardPlayer.js";
import { syncDigitalDashboardRssFeed } from "./lib/digitalDashboardRss.js";

initializeApp();
setGlobalOptions({
  region: "us-central1",
  serviceAccount: "firebase-adminsdk-fbsvc@forge-academy-95f84.iam.gserviceaccount.com",
});

const APPROVED_STATUSES = new Set(["enrolled", "waitlisted"]);

async function getDepartment(departmentId) {
  if (!departmentId) return null;
  const snap = await getFirestore().doc(`departments/${departmentId}`).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function sendRegistrationCreatedEmails(registration) {
  const tasks = [];

  if (registration.studentEmail) {
    const studentEmail = buildRegistrationSubmittedStudentEmail(registration);
    tasks.push(
      sendEmailMessage({
        to: registration.studentEmail,
        ...studentEmail,
        template: "registration_submitted_student",
        registrationId: registration.id,
      }),
    );
  }

  if (registration.departmentId) {
    const department = await getDepartment(registration.departmentId);

    if (department?.trainingOfficerEmail) {
      const deptEmail = buildRegistrationSubmittedDepartmentEmail(
        registration,
        department.trainingOfficerName || "Training Officer",
      );
      tasks.push(
        sendEmailMessage({
          to: department.trainingOfficerEmail,
          ...deptEmail,
          template: "registration_submitted_training_officer",
          registrationId: registration.id,
        }),
      );
    }

    if (department?.chiefEmail && department.chiefEmail !== department.trainingOfficerEmail) {
      const chiefEmail = buildRegistrationSubmittedDepartmentEmail(
        registration,
        department.chiefName || "Fire Chief",
      );
      tasks.push(
        sendEmailMessage({
          to: department.chiefEmail,
          ...chiefEmail,
          template: "registration_submitted_chief",
          registrationId: registration.id,
        }),
      );
    }
  }

  await Promise.all(tasks);
}

async function sendRegistrationApprovedEmail(registration) {
  if (!registration.studentEmail) return;

  const approvedEmail = buildRegistrationApprovedStudentEmail(registration);
  await sendEmailMessage({
    to: registration.studentEmail,
    ...approvedEmail,
    template: "registration_approved_student",
    registrationId: registration.id,
  });
}

export const emailOnRegistrationCreated = onDocumentCreated("registrations/{registrationId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const registration = { id: event.params.registrationId, ...data };
  await sendRegistrationCreatedEmails(registration);
  await notifyAdminsRegistrationSubmitted(registration);
  if (registration.status === "pending_department" && registration.departmentId) {
    await notifyDepartmentRegistrationSubmitted(registration.departmentId, registration);
  }
});

export const emailOnRegistrationUpdated = onDocumentUpdated("registrations/{registrationId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return;

  if (before.status === after.status) return;
  if (!APPROVED_STATUSES.has(after.status)) return;

  const registration = { id: event.params.registrationId, ...after };
  await sendRegistrationApprovedEmail(registration);
});

export const createPortalUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  try {
    return await createPortalUserAccount(request.auth.uid, request.data ?? {});
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error instanceof Error ? error.message : "Unable to create portal user.");
  }
});

export const updatePortalUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  try {
    return await updatePortalUserAccount(request.auth.uid, request.data ?? {});
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error instanceof Error ? error.message : "Unable to update portal user.");
  }
});

export const resetPortalUserPassword = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  try {
    return await resetPortalUserPasswordAccount(request.auth.uid, request.data ?? {});
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error instanceof Error ? error.message : "Unable to reset password.");
  }
});

function wrapCallable(handler) {
  return onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    try {
      return await handler(request.auth.uid, request.data ?? {});
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error instanceof Error ? error.message : "Request failed.");
    }
  });
}

export const publishTestVersionCallable = wrapCallable(publishTestVersion);
export const createTestAssignmentCallable = wrapCallable(createTestAssignment);
export const startTestSessionCallable = wrapCallable(startTestSession);
export const saveTestAnswersCallable = wrapCallable(saveTestAnswers);
export const submitTestAttemptCallable = wrapCallable(submitTestAttempt);
export const proctorTestActionCallable = wrapCallable(proctorTestAction);
export const listActiveTestSessionsCallable = wrapCallable(listActiveTestSessions);
export const gradeManualQueueItemCallable = wrapCallable(gradeManualQueueItem);
export const overrideTestScoreCallable = wrapCallable(overrideTestScore);
export const completeRemediationCallable = wrapCallable(completeRemediation);
export const requestRetestCallable = wrapCallable(requestRetest);
export const reviewRetestRequestCallable = wrapCallable(reviewRetestRequest);
export const reviewCertificateReleaseCallable = wrapCallable(reviewCertificateRelease);
export const recordStateCertificationTestCallable = wrapCallable(recordStateCertificationTest);
export const submitChallengeTestRequestCallable = wrapCallable(submitChallengeTestRequest);
export const reviewChallengeTestRequestCallable = wrapCallable(reviewChallengeTestRequest);
export const getTestingDashboardMetricsCallable = wrapCallable(getTestingDashboardMetrics);

export const scheduledReportExportsJob = onSchedule(
  {
    schedule: "0 6 * * *",
    timeZone: "America/Chicago",
  },
  async () => {
    await runScheduledReportExports();
  },
);

export const lmsCompletionWebhook = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const result = await handleLmsCompletionWebhook(req.body ?? {}, req.get("x-lms-secret"));
    res.status(result.status).json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Webhook processing failed.",
    });
  }
});

export const onLmsGradePassbackQueued = onDocumentCreated("lmsGradePassbackLog/{logId}", async (event) => {
  await processLmsGradePassback(event.params.logId);
});

export const syncMyNotificationsCallable = wrapCallable(async (uid) => syncNotificationsForUser(uid));

export const syncDigitalDashboardRssFeedCallable = wrapCallable(async (_uid, data) => {
  const feedId = String(data?.feedId ?? "").trim();
  if (!feedId) {
    throw new HttpsError("invalid-argument", "feedId is required.");
  }
  return await syncDigitalDashboardRssFeed(feedId);
});

export const getDigitalDisplayPayloadCallable = onCall(async (request) => {
  const displayId = String(request.data?.displayId ?? "").trim();
  const publicKey = String(request.data?.publicKey ?? "").trim();
  const virtualSession = Boolean(request.data?.virtualSession);
  if (!displayId || !publicKey) {
    throw new HttpsError("invalid-argument", "displayId and publicKey are required.");
  }

  try {
    return await getDigitalDisplayPayload(displayId, publicKey, { virtualSession });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error instanceof Error ? error.message : "Request failed.");
  }
});

export const fetchPublishedGoogleSheetCallable = onCall(async (request) => {
  const url = String(request.data?.url ?? "").trim();
  if (!url) {
    throw new HttpsError("invalid-argument", "url is required.");
  }

  try {
    return await fetchPublishedGoogleSheet(url);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error instanceof Error ? error.message : "Request failed.");
  }
});

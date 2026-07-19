import { CloudTasksClient } from "@google-cloud/tasks";
import { PubSub } from "@google-cloud/pubsub";
import { config } from "../config.js";
import { db, FieldValue, COLLECTIONS } from "../store/firestore.js";
import { buildEvent, persistEvent, upsertSyncState } from "./events.js";
import { resolvePersonIdentity, patchPersonIdentity } from "./identity.js";
import { connectDepartment, disconnectDepartment, upsertDepartment } from "./connections.js";
import { deliverToAcademy, deliverToRms } from "./adapters.js";
import { writeAudit } from "./audit.js";
// outboundHeaders used by adapters only

const SYNC_STATUSES = [
  "synchronized",
  "pending",
  "processing",
  "validation_required",
  "conflict_detected",
  "failed",
  "retry_scheduled",
  "manually_resolved",
];

/**
 * Ingest an event, persist, and kick the pipeline.
 * @param {Parameters<typeof buildEvent>[0]} raw
 */
export async function ingestEvent(raw) {
  const event = buildEvent(raw);
  await persistEvent(event);
  await upsertSyncState("event", event.eventId, {
    status: "pending",
    sourceSystem: event.sourceSystem,
    lastAction: "accepted",
  });

  if (config.mode === "gcp") {
    await publishInbound(event);
  } else {
    await processEvent(event);
  }

  return event;
}

async function publishInbound(event) {
  const pubsub = new PubSub({ projectId: config.projectId });
  await pubsub.topic(config.pubsubInboundTopic).publishMessage({ json: event });
}

/** @param {import('./events.js').HubEvent} event */
export async function processEvent(event) {
  await upsertSyncState("event", event.eventId, { status: "processing", lastAction: "process_start" });
  try {
    switch (event.eventType) {
      case "department.connection.authorized":
        await handleDepartmentConnect(event);
        break;
      case "department.updated":
        await upsertDepartment({ ...(event.data || {}), forgeDepartmentId: event.forgeDepartmentId });
        break;
      case "person.created":
      case "person.updated":
      case "person.status_changed":
        await handlePersonEvent(event);
        break;
      case "person.merged":
        await handlePersonMerged(event);
        break;
      case "course.completed":
      case "certificate.issued":
        await handleCertificateEvent(event);
        break;
      default:
        await upsertSyncState("event", event.eventId, {
          status: "validation_required",
          error: `Unhandled event type ${event.eventType}`,
        });
        return { ok: false, reason: "unhandled" };
    }

    await db().doc(`${COLLECTIONS.events}/${event.eventId}`).set(
      { status: "processed", processedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    await upsertSyncState("event", event.eventId, { status: "synchronized", lastAction: "processed" });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    await scheduleRetry(event, message);
    return { ok: false, error: message };
  }
}

async function handleDepartmentConnect(event) {
  const forgeDepartmentId = event.forgeDepartmentId || String(event.data?.forgeDepartmentId ?? "");
  if (!forgeDepartmentId) throw new Error("forgeDepartmentId required");
  await connectDepartment(forgeDepartmentId, event.data || {});
}

async function handlePersonEvent(event) {
  const person = { ...(event.data || {}), forgePersonId: event.forgePersonId || event.data?.forgePersonId };
  // Roster-level resync requests are not person upserts — ask Academy to pull RMS roster.
  if (person.resync === true && !person.firstName && !person.rmsPersonId && !person.email) {
    await deliverToAcademy({
      type: "pull_roster",
      forgeDepartmentId: event.forgeDepartmentId || person.forgeDepartmentId || null,
      correlationId: event.correlationId,
      eventId: event.eventId,
    });
    await upsertSyncState("event", event.eventId, {
      status: "synchronized",
      lastAction: "roster_pull_requested",
      sourceSystem: event.sourceSystem,
    });
    return;
  }

  if (!String(person.firstName || "").trim() || !String(person.lastName || "").trim()) {
    await upsertSyncState("event", event.eventId, {
      status: "validation_required",
      lastAction: "missing_name",
      error: "firstName and lastName are required for person upserts.",
    });
    throw new Error("firstName and lastName are required for person upserts.");
  }

  const resolved = await resolvePersonIdentity(person);

  if (resolved.review) {
    await upsertSyncState("person", resolved.review.id, {
      status: "validation_required",
      lastAction: "duplicate_review",
      error: resolved.review.reason,
    });
    await writeAudit({
      action: "duplicate.review_queued",
      forgePersonId: null,
      details: { reviewId: resolved.review.id, reason: resolved.review.reason },
    });
    return;
  }

  if (!resolved.identity) throw new Error("Unable to resolve person identity");

  const forgePersonId = resolved.identity.forgePersonId || resolved.identity.id;
  if (event.eventType === "person.status_changed" && person.status) {
    await patchPersonIdentity(forgePersonId, {
      status: person.status,
      employmentStatus: person.employmentStatus,
    });
  }

  const command = {
    type: "upsert_student",
    forgePersonId,
    forgeDepartmentId: person.forgeDepartmentId || resolved.identity.forgeDepartmentId || null,
    person: {
      ...person,
      forgePersonId,
      rmsPersonId: person.rmsPersonId || resolved.identity.rmsPersonId,
    },
    correlationId: event.correlationId,
    eventId: event.eventId,
  };

  const academyResult = await deliverToAcademy(command);
  const academyStudentId = String(academyResult?.studentId ?? "").trim();
  if (academyStudentId) {
    await patchPersonIdentity(forgePersonId, {
      academyStudentId,
      forgeAcademyStudentId: academyStudentId,
    });
  }
  await upsertSyncState("person", forgePersonId, {
    status: "synchronized",
    lastAction: event.eventType,
    sourceSystem: event.sourceSystem,
  });
  await writeAudit({
    action: event.eventType,
    forgePersonId,
    forgeDepartmentId: command.forgeDepartmentId,
    details: { eventId: event.eventId, academyStudentId: academyStudentId || null },
  });
}

async function handlePersonMerged(event) {
  const survivorPersonId = String(event.data?.survivorPersonId || event.forgePersonId || "").trim();
  const loserPersonId = String(event.data?.loserPersonId || "").trim();
  if (!survivorPersonId || !loserPersonId) {
    throw new Error("person.merged requires survivorPersonId and loserPersonId");
  }

  await deliverToAcademy({
    type: "retarget_person",
    forgePersonId: survivorPersonId,
    survivorPersonId,
    loserPersonId,
    mergeId: event.data?.mergeId || null,
    correlationId: event.correlationId,
    eventId: event.eventId,
  });

  await upsertSyncState("person", survivorPersonId, {
    status: "synchronized",
    lastAction: "person.merged",
    sourceSystem: "hub",
  });
  await writeAudit({
    action: "person.merged",
    forgePersonId: survivorPersonId,
    details: { loserPersonId, mergeId: event.data?.mergeId || null, eventId: event.eventId },
  });
}

async function handleCertificateEvent(event) {
  const data = event.data || {};
  const forgePersonId = event.forgePersonId || data.forgePersonId || null;
  const command = {
    type: "training_completed",
    forgePersonId,
    forgeCertificateId: data.forgeCertificateId || null,
    payload: {
      studentId: data.studentId || data.forgeAcademyStudentId || null,
      rmsPersonId: data.rmsPersonId || null,
      forgePersonId,
      courseName: data.courseName || "",
      courseNumber: data.courseNumber || "",
      completedDate: data.completedDate || "",
      certificateSerial: data.certificateSerial || null,
      tenantId: data.tenantId || "forge-platform",
    },
    correlationId: event.correlationId,
    eventId: event.eventId,
  };

  await deliverToRms(command);
  await upsertSyncState("certificate", String(data.certificateId || event.relatedRecordId || event.eventId), {
    status: "synchronized",
    lastAction: event.eventType,
    sourceSystem: "academy",
  });
  await writeAudit({
    action: event.eventType,
    forgePersonId,
    details: { eventId: event.eventId, certificateSerial: data.certificateSerial },
  });
}

/** @param {import('./events.js').HubEvent} event @param {string} error */
async function scheduleRetry(event, error) {
  const retryCount = Number(event.retryCount || 0) + 1;
  const failure = {
    eventId: event.eventId,
    eventType: event.eventType,
    error,
    retryCount,
    status: retryCount >= config.maxRetries ? "failed" : "retry_scheduled",
    payload: event,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  };

  await db().doc(`${COLLECTIONS.syncFailures}/${event.eventId}`).set(failure, { merge: true });
  await upsertSyncState("event", event.eventId, {
    status: failure.status,
    error,
    retryCount,
  });

  if (retryCount >= config.maxRetries) return;

  const next = { ...event, retryCount };
  if (config.mode === "gcp") {
    await enqueueCloudTask(next, retryCount);
  } else {
    const delayMs = Math.min(60_000, 1000 * 2 ** retryCount);
    setTimeout(() => {
      processEvent(next).catch(() => {});
    }, delayMs);
  }
}

async function enqueueCloudTask(event, retryCount) {
  const client = new CloudTasksClient();
  const parent = client.queuePath(config.projectId, config.tasksLocation, config.tasksQueue);
  const scheduleSeconds = Math.floor(Date.now() / 1000) + Math.min(3600, 2 ** retryCount);
  await client.createTask({
    parent,
    task: {
      scheduleTime: { seconds: scheduleSeconds },
      httpRequest: {
        httpMethod: "POST",
        url: `https://${config.tasksLocation}-${config.projectId}.cloudfunctions.net/hubRetryWorker`,
        headers: { "Content-Type": "application/json" },
        body: Buffer.from(JSON.stringify(event)).toString("base64"),
      },
    },
  });
}

/** @param {{ eventId?: string, entityType?: string, entityId?: string }} input */
export async function resync(input) {
  if (input.eventId) {
    const snap = await db().doc(`${COLLECTIONS.syncFailures}/${input.eventId}`).get();
    if (snap.exists) {
      const payload = snap.data()?.payload;
      if (payload) {
        await db().doc(`${COLLECTIONS.syncFailures}/${input.eventId}`).set(
          { status: "pending", updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
        return ingestEvent({ ...payload, retryCount: 0, correlationId: payload.correlationId });
      }
    }
    const eventSnap = await db().doc(`${COLLECTIONS.events}/${input.eventId}`).get();
    if (eventSnap.exists) {
      return processEvent(/** @type {any} */ (eventSnap.data()));
    }
    throw new Error("Event not found for resync");
  }

  if (input.entityType === "roster" || input.entityType === "personnel") {
    const event = await ingestEvent({
      eventType: "person.updated",
      sourceSystem: "hub",
      forgeDepartmentId: input.entityId || null,
      data: { resync: true, forgeDepartmentId: input.entityId },
    });
    // processEvent handles resync:true by asking Academy to pullRosterFromRms.
    return event;
  }

  throw new Error("Unsupported resync request");
}

export async function getSyncStatusSummary() {
  const firestore = db();
  const [failures, reviews, connections] = await Promise.all([
    firestore.collection(COLLECTIONS.syncFailures).where("status", "in", ["failed", "retry_scheduled"]).limit(50).get(),
    firestore.collection(COLLECTIONS.duplicateReviews).where("status", "==", "pending").limit(50).get(),
    firestore.collection(COLLECTIONS.connections).where("status", "==", "active").limit(100).get(),
  ]);

  return {
    ok: true,
    activeConnections: connections.size,
    openFailures: failures.docs.map((d) => ({ id: d.id, ...d.data() })),
    pendingDuplicateReviews: reviews.docs.map((d) => ({ id: d.id, ...d.data() })),
    statuses: SYNC_STATUSES,
    pipelineMode: config.mode,
  };
}

export { disconnectDepartment };

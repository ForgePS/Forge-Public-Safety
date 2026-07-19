import { db, FieldValue, COLLECTIONS } from "../store/firestore.js";
import { newCorrelationId, newEventId } from "../ids.js";

/**
 * @typedef {Object} HubEvent
 * @property {string} eventId
 * @property {string} eventType
 * @property {string} eventVersion
 * @property {string} occurredAt
 * @property {"rms"|"academy"|"hub"} sourceSystem
 * @property {string|null} forgeDepartmentId
 * @property {string|null} forgePersonId
 * @property {string|null} relatedRecordId
 * @property {string} correlationId
 * @property {number} retryCount
 * @property {Record<string, unknown>} data
 */

/** @param {Partial<HubEvent> & { eventType: string, sourceSystem: HubEvent["sourceSystem"] }} input */
export function buildEvent(input) {
  return {
    eventId: input.eventId || newEventId(),
    eventType: input.eventType,
    eventVersion: input.eventVersion || "1",
    occurredAt: input.occurredAt || new Date().toISOString(),
    sourceSystem: input.sourceSystem,
    forgeDepartmentId: input.forgeDepartmentId ?? null,
    forgePersonId: input.forgePersonId ?? null,
    relatedRecordId: input.relatedRecordId ?? null,
    correlationId: input.correlationId || newCorrelationId(),
    retryCount: Number(input.retryCount ?? 0),
    data: input.data && typeof input.data === "object" ? input.data : {},
  };
}

/** @param {HubEvent} event */
export async function persistEvent(event) {
  await db()
    .doc(`${COLLECTIONS.events}/${event.eventId}`)
    .set({
      ...event,
      status: "accepted",
      createdAt: FieldValue.serverTimestamp(),
    });
  return event;
}

/** @param {string} eventId */
export async function getEvent(eventId) {
  const snap = await db().doc(`${COLLECTIONS.events}/${eventId}`).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * @param {string} entityType
 * @param {string} entityId
 * @param {Record<string, unknown>} patch
 */
export async function upsertSyncState(entityType, entityId, patch) {
  const id = `${entityType}_${entityId}`;
  await db()
    .doc(`${COLLECTIONS.syncState}/${id}`)
    .set(
      {
        entityType,
        entityId,
        updatedAt: FieldValue.serverTimestamp(),
        ...patch,
      },
      { merge: true },
    );
}

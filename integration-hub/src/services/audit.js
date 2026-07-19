import { db, FieldValue, COLLECTIONS } from "../store/firestore.js";

/** @param {{ action: string, forgeDepartmentId?: string|null, forgePersonId?: string|null, details?: Record<string, unknown>, user?: string }} input */
export async function writeAudit(input) {
  await db().collection(COLLECTIONS.auditLogs).add({
    action: input.action,
    forgeDepartmentId: input.forgeDepartmentId ?? null,
    forgePersonId: input.forgePersonId ?? null,
    details: input.details ?? {},
    user: input.user ?? "system",
    createdAt: FieldValue.serverTimestamp(),
  });
}

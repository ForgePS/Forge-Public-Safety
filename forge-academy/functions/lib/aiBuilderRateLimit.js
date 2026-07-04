import { getFirestore, FieldValue } from "firebase-admin/firestore";

const HOURLY_LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * @param {string} userId
 * @returns {Promise<{ allowed: boolean, remaining: number }>}
 */
export async function checkAiBuilderRateLimit(userId) {
  if (!userId) return { allowed: false, remaining: 0 };

  const db = getFirestore();
  const ref = db.doc(`aiBuilderUsage/${userId}`);
  const snap = await ref.get();
  const now = Date.now();

  if (!snap.exists) {
    await ref.set({ count: 1, windowStart: now, updatedAt: FieldValue.serverTimestamp() });
    return { allowed: true, remaining: HOURLY_LIMIT - 1 };
  }

  const data = snap.data() ?? {};
  let count = Number(data.count ?? 0);
  let windowStart = Number(data.windowStart ?? now);

  if (now - windowStart > WINDOW_MS) {
    count = 0;
    windowStart = now;
  }

  if (count >= HOURLY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  await ref.set({
    count: count + 1,
    windowStart,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { allowed: true, remaining: HOURLY_LIMIT - count - 1 };
}

/**
 * @param {{
 *   userId: string,
 *   targetType: string,
 *   targetId?: string,
 *   prompt: string,
 *   model: string,
 *   source: string,
 *   valid: boolean,
 *   errors?: string[],
 * }} entry
 */
export async function writeAiBuilderAuditLog(entry) {
  const db = getFirestore();
  await db.collection("aiBuilderAuditLogs").add({
    userId: entry.userId,
    targetType: entry.targetType,
    targetId: entry.targetId ?? "",
    promptPreview: String(entry.prompt ?? "").slice(0, 500),
    model: entry.model,
    source: entry.source,
    valid: entry.valid,
    errors: entry.errors ?? [],
    createdAt: FieldValue.serverTimestamp(),
  });
}

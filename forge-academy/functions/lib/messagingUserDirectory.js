import { getFirestore, FieldValue } from "firebase-admin/firestore";

/** @param {Record<string, unknown>} data */
export function buildUserDirectoryPayload(data) {
  return {
    displayName: String(data.displayName ?? ""),
    email: String(data.email ?? ""),
    photoUrl: String(data.photoUrl ?? ""),
    role: String(data.role ?? ""),
    disabled: Boolean(data.disabled),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/** @param {string} userId @param {Record<string, unknown>} data */
export async function syncUserDirectoryFromProfile(userId, data) {
  if (!userId || !data) return;
  await getFirestore()
    .doc(`userDirectory/${userId}`)
    .set(buildUserDirectoryPayload(data), { merge: true });
}

export async function backfillAllUserDirectoryEntries() {
  const db = getFirestore();
  const snap = await db.collection("users").get();
  const batchSize = 400;
  let batch = db.batch();
  let pending = 0;

  for (const item of snap.docs) {
    batch.set(db.doc(`userDirectory/${item.id}`), buildUserDirectoryPayload(item.data()), { merge: true });
    pending += 1;
    if (pending >= batchSize) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) {
    await batch.commit();
  }

  return { synced: snap.size };
}

import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { validateAiBuilderOutput } from "./aiBuilderSchemas.js";
import { checkAiBuilderRateLimit, writeAiBuilderAuditLog } from "./aiBuilderRateLimit.js";
import { generateAiBuilderOutput } from "./aiBuilderGenerate.js";

const ALLOWED_TARGET_TYPES = new Set(["signageLayout", "questionBank", "testBlueprint"]);
const ADMIN_ROLES = new Set(["creator", "super_admin", "academy_admin"]);

/**
 * @param {string} uid
 */
async function assertAiBuilderAccess(uid) {
  const snap = await getFirestore().doc(`users/${uid}`).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "User profile not found.");
  }
  const role = String(snap.data()?.role ?? "").toLowerCase();
  if (!ADMIN_ROLES.has(role)) {
    throw new HttpsError("permission-denied", "AI Builder requires an admin role.");
  }

  const settingsSnap = await getFirestore().doc("systemSettings/default").get();
  const aiEnabled = settingsSnap.data()?.features?.aiBuilderEnabled;
  if (aiEnabled === false) {
    throw new HttpsError("failed-precondition", "AI Builder is disabled in system settings.");
  }
}

/**
 * @param {unknown} raw
 * @returns {Array<{ name: string, mimeType: string, base64?: string, textContent?: string }>}
 */
function normalizeAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 5).map((item) => {
    const row = /** @type {Record<string, unknown>} */ (item ?? {});
    return {
      name: String(row.name ?? "attachment"),
      mimeType: String(row.mimeType ?? "application/octet-stream"),
      base64: row.base64 ? String(row.base64) : undefined,
      textContent: row.textContent ? String(row.textContent).slice(0, 50000) : undefined,
    };
  });
}

/**
 * @param {string} uid
 * @param {Record<string, unknown>} data
 */
export async function forgeAiBuild(uid, data) {
  await assertAiBuilderAccess(uid);

  const rate = await checkAiBuilderRateLimit(uid);
  if (!rate.allowed) {
    throw new HttpsError("resource-exhausted", "AI Builder hourly limit reached. Try again later.");
  }

  const targetType = String(data.targetType ?? "").trim();
  if (!ALLOWED_TARGET_TYPES.has(targetType)) {
    throw new HttpsError("invalid-argument", "Invalid targetType.");
  }

  const userPrompt = String(data.userPrompt ?? "").trim();
  if (!userPrompt && !normalizeAttachments(data.attachments).length) {
    throw new HttpsError("invalid-argument", "Provide a prompt or at least one attachment.");
  }

  const currentState =
    data.currentState && typeof data.currentState === "object"
      ? /** @type {Record<string, unknown>} */ (data.currentState)
      : {};
  const context =
    data.context && typeof data.context === "object"
      ? /** @type {Record<string, unknown>} */ (data.context)
      : {};
  const targetId = String(data.targetId ?? "").trim();
  const attachments = normalizeAttachments(data.attachments);

  const { output, model, source } = await generateAiBuilderOutput({
    targetType,
    userPrompt,
    currentState,
    context,
    attachments,
  });

  const validation = validateAiBuilderOutput(targetType, output);

  await writeAiBuilderAuditLog({
    userId: uid,
    targetType,
    targetId,
    prompt: userPrompt,
    model,
    source,
    valid: validation.valid,
    errors: validation.errors,
  });

  if (!validation.valid) {
    return {
      ok: false,
      targetType,
      errors: validation.errors,
      draft: output,
      model,
      source,
      rateLimitRemaining: rate.remaining,
    };
  }

  return {
    ok: true,
    targetType,
    output: validation.data,
    draft: validation.data,
    model,
    source,
    rateLimitRemaining: rate.remaining,
  };
}

/**
 * @param {string} uid
 * @param {Record<string, unknown>} data
 */
export async function logAiBuilderApply(uid, data) {
  await assertAiBuilderAccess(uid);

  const targetType = String(data.targetType ?? "").trim();
  const targetId = String(data.targetId ?? "").trim();
  const action = String(data.action ?? "apply").trim();

  await writeAiBuilderAuditLog({
    userId: uid,
    targetType,
    targetId,
    prompt: `[${action}] applied AI builder output`,
    model: "n/a",
    source: "client-apply",
    valid: true,
    errors: [],
  });

  return { ok: true };
}

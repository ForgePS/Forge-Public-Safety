import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.js";

/**
 * @param {File} file
 * @returns {Promise<{ name: string, mimeType: string, base64?: string, textContent?: string }>}
 */
export async function fileToAttachmentPayload(file) {
  const name = file.name;
  const mimeType = file.type || "application/octet-stream";

  if (
    mimeType.startsWith("text/") ||
    name.endsWith(".csv") ||
    name.endsWith(".json") ||
    name.endsWith(".md")
  ) {
    const textContent = await file.text();
    return { name, mimeType: mimeType || "text/plain", textContent };
  }

  if (mimeType.startsWith("image/")) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return { name, mimeType, base64 };
  }

  const textContent = await file.text().catch(() => "");
  return { name, mimeType, textContent: textContent.slice(0, 50000) };
}

/**
 * @param {{
 *   targetType: string,
 *   targetId?: string,
 *   userPrompt: string,
 *   currentState?: Record<string, unknown>,
 *   context?: Record<string, unknown>,
 *   attachments?: File[],
 * }} input
 */
export async function callForgeAiBuild(input) {
  const attachmentPayloads = [];
  for (const file of input.attachments ?? []) {
    attachmentPayloads.push(await fileToAttachmentPayload(file));
  }

  const callable = httpsCallable(functions, "forgeAiBuildCallable");
  const result = await callable({
    targetType: input.targetType,
    targetId: input.targetId ?? "",
    userPrompt: input.userPrompt,
    currentState: input.currentState ?? {},
    context: input.context ?? {},
    attachments: attachmentPayloads,
  });
  return /** @type {Record<string, unknown>} */ (result.data);
}

/**
 * @param {{ targetType: string, targetId?: string, action?: string }} input
 */
export async function logForgeAiBuilderApply(input) {
  const callable = httpsCallable(functions, "logAiBuilderApplyCallable");
  const result = await callable({
    targetType: input.targetType,
    targetId: input.targetId ?? "",
    action: input.action ?? "apply",
  });
  return result.data;
}

/**
 * @param {unknown} before
 * @param {unknown} after
 * @returns {Array<{ path: string, before: unknown, after: unknown }>}
 */
export function diffObjects(before, after, basePath = "") {
  /** @type {Array<{ path: string, before: unknown, after: unknown }>} */
  const changes = [];

  if (before === after) return changes;

  if (
    before === null ||
    after === null ||
    typeof before !== "object" ||
    typeof after !== "object" ||
    Array.isArray(before) !== Array.isArray(after)
  ) {
    changes.push({ path: basePath || "(root)", before, after });
    return changes;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const max = Math.max(before.length, after.length);
    for (let i = 0; i < max; i += 1) {
      changes.push(...diffObjects(before[i], after[i], `${basePath}[${i}]`));
    }
    return changes;
  }

  const beforeObj = /** @type {Record<string, unknown>} */ (before);
  const afterObj = /** @type {Record<string, unknown>} */ (after);
  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  for (const key of keys) {
    const path = basePath ? `${basePath}.${key}` : key;
    changes.push(...diffObjects(beforeObj[key], afterObj[key], path));
  }
  return changes.filter((item) => JSON.stringify(item.before) !== JSON.stringify(item.after));
}

export const AI_BUILDER_ACCEPT =
  "image/*,.pdf,.csv,.xlsx,.xls,.txt,.md,.json,application/pdf,text/csv";

export const AI_BUILDER_TARGET_LABELS = {
  signageLayout: "Signage layout",
  questionBank: "Question bank",
  testBlueprint: "Test blueprint",
};

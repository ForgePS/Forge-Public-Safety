import { config } from "../config.js";
import { hubOutboundHeaders } from "./outboundHeaders.js";

/**
 * Deliver a normalized command to Academy hubAcademyCommand.
 * @param {Record<string, unknown>} command
 */
export async function deliverToAcademy(command) {
  if (!config.academyCommandUrl) {
    throw new Error("HUB_ACADEMY_COMMAND_URL is not configured");
  }
  const headers = await hubOutboundHeaders();
  const response = await fetch(config.academyCommandUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(command),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Academy command failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return response.json().catch(() => ({ ok: true }));
}

/**
 * Deliver a normalized command to RMS hubRmsCommand (or training webhook compat).
 * @param {Record<string, unknown>} command
 */
export async function deliverToRms(command) {
  if (!config.rmsCommandUrl) {
    throw new Error("HUB_RMS_COMMAND_URL is not configured");
  }
  const headers = await hubOutboundHeaders();
  const response = await fetch(config.rmsCommandUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(command),
  });

  // Compat: if RMS hub endpoint is missing, fall back to legacy training webhook for training_completed.
  if (response.status === 404 && command.type === "training_completed") {
    const legacyUrl = config.rmsCommandUrl.replace(/\/hubRmsCommand\/?$/, "/trainingCompletedWebhook");
    const legacy = await fetch(legacyUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(command.payload || {}),
    });
    if (!legacy.ok) {
      const text = await legacy.text();
      throw new Error(`RMS legacy training webhook failed (${legacy.status}): ${text.slice(0, 300)}`);
    }
    return legacy.json().catch(() => ({ ok: true, legacy: true }));
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RMS command failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return response.json().catch(() => ({ ok: true }));
}

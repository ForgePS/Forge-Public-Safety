import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.js";

/** @param {unknown} error */
export function getPortalUserErrorMessage(error) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code ?? "");
    const message = "message" in error && typeof error.message === "string" ? error.message : "";

    if (message && message !== "INTERNAL") {
      return message;
    }

    if (code === "functions/permission-denied") {
      return "You do not have permission to manage portal users.";
    }
    if (code === "functions/unauthenticated") {
      return "Your session expired. Sign in again and retry.";
    }
    if (code === "functions/already-exists") {
      return "A Firebase Auth account already exists for this email.";
    }
    if (code === "functions/invalid-argument") {
      return message || "Check the form fields and try again.";
    }
    if (code === "functions/internal") {
      return "The server could not complete this request. Try again in a moment.";
    }
  }

  return error instanceof Error ? error.message : "Unable to save portal user.";
}

export function generateTempPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/**
 * @param {{
 *   email: string,
 *   password: string,
 *   displayName: string,
 *   role: string,
 *   departmentId?: string,
 *   studentId?: string,
 *   instructorId?: string,
 *   createInstructorProfile?: boolean,
 *   permissions?: { digitalDashboard?: Record<string, { view?: boolean, edit?: boolean }> } | null,
 * }} input
 */
export async function createPortalUser(input) {
  const callable = httpsCallable(functions, "createPortalUser");
  const result = await callable(input);
  return result.data;
}

/**
 * @param {{
 *   uid: string,
 *   displayName: string,
 *   role: string,
 *   departmentId?: string,
 *   studentId?: string,
 *   instructorId?: string,
 *   disabled?: boolean,
 *   permissions?: { digitalDashboard?: Record<string, { view?: boolean, edit?: boolean }> } | null,
 * }} input
 */
export async function updatePortalUser(input) {
  const callable = httpsCallable(functions, "updatePortalUser");
  const result = await callable(input);
  return result.data;
}

/** @param {{ uid: string, password: string }} input */
export async function resetPortalUserPassword(input) {
  const callable = httpsCallable(functions, "resetPortalUserPassword");
  const result = await callable(input);
  return result.data;
}

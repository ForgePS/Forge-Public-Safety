import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.js";

/** @param {string} displayId @param {string} publicKey @param {{ virtualSession?: boolean }} [options] */
export async function fetchDigitalDisplayPayload(displayId, publicKey, options = {}) {
  const callable = httpsCallable(functions, "getDigitalDisplayPayloadCallable");
  const result = await callable({
    displayId,
    publicKey,
    virtualSession: Boolean(options.virtualSession),
  });
  return result.data;
}

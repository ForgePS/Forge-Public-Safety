import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { getSystemSettings, saveSystemSettingsSection } from "./systemSettings.js";

const LEGACY_DOC_ID = "default";

/**
 * @typedef {Object} HousingSettingsRecord
 * @property {string} studentInstructions
 * @property {string} academyNotes
 * @property {string} checkInTime
 * @property {string} checkOutTime
 */

/** @returns {Promise<HousingSettingsRecord>} */
export async function getHousingSettings() {
  const settings = await getSystemSettings();
  const housing = settings.housing;
  return {
    studentInstructions: housing.studentInstructions,
    academyNotes: housing.academyNotes,
    checkInTime: housing.checkInTime,
    checkOutTime: housing.checkOutTime,
  };
}

/** @param {Partial<HousingSettingsRecord>} input @param {string} [userId] */
export async function saveHousingSettings(input, userId = "system") {
  await saveSystemSettingsSection(
    "housing",
    {
      studentInstructions: input.studentInstructions,
      academyNotes: input.academyNotes,
      checkInTime: input.checkInTime,
      checkOutTime: input.checkOutTime,
    },
    userId,
  );

  await setDoc(
    doc(db, "housingSettings", LEGACY_DOC_ID),
    {
      studentInstructions: input.studentInstructions?.trim(),
      academyNotes: input.academyNotes?.trim(),
      checkInTime: input.checkInTime,
      checkOutTime: input.checkOutTime,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** @deprecated Legacy direct read */
export async function getLegacyHousingSettingsDoc() {
  const snap = await getDoc(doc(db, "housingSettings", LEGACY_DOC_ID));
  return snap.exists() ? snap.data() : null;
}

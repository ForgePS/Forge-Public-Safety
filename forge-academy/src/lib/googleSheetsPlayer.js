import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.js";
import { googleSheetsCsvUrl, parseCsv } from "./googleSheetsEmbed.js";

/**
 * @param {string} url
 * @returns {Promise<string[][]>}
 */
export async function fetchPublishedGoogleSheetRows(url) {
  const csvUrl = googleSheetsCsvUrl(url);
  if (!csvUrl) throw new Error("Unsupported Google Sheets URL.");

  let csvText = "";
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`Sheet request failed (${response.status}).`);
    csvText = await response.text();
  } catch {
    const callable = httpsCallable(functions, "fetchPublishedGoogleSheetCallable");
    const result = await callable({ url });
    csvText = String(result.data?.csv || "");
    if (!csvText) throw new Error("Unable to load sheet data.");
  }

  return parseCsv(csvText);
}

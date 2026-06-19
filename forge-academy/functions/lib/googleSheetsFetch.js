import { HttpsError } from "firebase-functions/v2/https";

function isGoogleSheetsEmbedUrl(url = "") {
  return /docs\.google\.com\/spreadsheets\//i.test(String(url));
}

function googleSheetsCsvUrl(url = "") {
  if (!isGoogleSheetsEmbedUrl(url)) return null;

  try {
    const parsed = new URL(url);
    const gid = parsed.searchParams.get("gid") || "0";
    const pubMatch = url.match(/\/spreadsheets\/d\/e\/([^/]+)/i);
    if (pubMatch) {
      return `https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?gid=${gid}&single=true&output=csv`;
    }

    const docMatch = url.match(/\/spreadsheets\/d\/([^/]+)/i);
    if (docMatch) {
      return `https://docs.google.com/spreadsheets/d/${docMatch[1]}/export?format=csv&gid=${gid}`;
    }
    return null;
  } catch {
    return null;
  }
}

/** @param {string} url */
export async function fetchPublishedGoogleSheet(url) {
  const csvUrl = googleSheetsCsvUrl(url);
  if (!csvUrl) {
    throw new HttpsError("invalid-argument", "Not a supported Google Sheets URL.");
  }

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new HttpsError("internal", `Sheet fetch failed (${response.status}).`);
  }

  return { csv: await response.text() };
}

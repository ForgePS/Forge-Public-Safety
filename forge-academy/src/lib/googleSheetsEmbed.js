const DAY_PATTERN =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i;

const SKIP_TITLE_PATTERN = /untitled spreadsheet|google drive|sheet\d+\s*$/i;

/** @param {string} [url] */
export function isGoogleSheetsEmbedUrl(url = "") {
  return /docs\.google\.com\/spreadsheets\//i.test(String(url));
}

/**
 * Find a published Google Sheets URL on a playlist media item.
 * @param {Record<string, unknown>} [item]
 */
export function resolveMediaEmbedUrl(item = {}) {
  const candidates = [item.url, item.embedUrl, item.content, item.sourceUrl]
    .filter(Boolean)
    .map((value) => String(value).trim());

  for (const candidate of candidates) {
    if (/^https?:\/\//i.test(candidate) && isGoogleSheetsEmbedUrl(candidate)) {
      return candidate;
    }

    const match = candidate.match(/https:\/\/docs\.google\.com\/spreadsheets\/[^\s"'<>]+/i);
    if (match?.[0] && isGoogleSheetsEmbedUrl(match[0])) {
      return match[0];
    }
  }

  return null;
}

/**
 * Compact Google iframe viewer URL for fallback display.
 * @param {string} url
 */
export function googleSheetsWidgetUrl(url = "") {
  if (!isGoogleSheetsEmbedUrl(url)) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("widget", "true");
    parsed.searchParams.set("headers", "false");
    parsed.searchParams.set("chrome", "false");
    if (!parsed.searchParams.get("gid")) parsed.searchParams.set("gid", "0");
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Convert a published Google Sheets viewer URL to a CSV export URL.
 * @param {string} url
 */
export function googleSheetsCsvUrl(url = "") {
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

/** @param {string} text */
export function parseCsv(text = "") {
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => String(value).trim())) rows.push(row);
  }

  return normalizeRows(rows);
}

/** @param {string[][]} rows */
function normalizeRows(rows) {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return rows
    .map((row) => {
      const padded = [...row];
      while (padded.length < maxColumns) padded.push("");
      return padded.map((cell) => String(cell ?? "").trim());
    })
    .filter((row) => row.some((cell) => cell));
}

/** @param {string[][]} rows */
function findHeaderRowIndex(rows) {
  for (let index = 0; index < rows.length; index += 1) {
    const dayCells = rows[index].filter((cell) => DAY_PATTERN.test(cell));
    if (dayCells.length >= 2) return index;
  }
  return -1;
}

/** @param {string[][]} rows @param {number} headerIndex @param {string} fallback */
function extractSheetTitle(rows, headerIndex, fallback = "Schedule") {
  for (let index = 0; index < headerIndex; index += 1) {
    const cells = rows[index].filter(Boolean);
    if (!cells.length) continue;
    const text = cells.join(" · ");
    if (SKIP_TITLE_PATTERN.test(text)) continue;
    return text;
  }
  return fallback;
}

/** @param {string} label */
function isTodayColumn(label = "") {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const short = today.slice(0, 3);
  const normalized = label.toLowerCase();
  return normalized.includes(today) || normalized.startsWith(short);
}

/**
 * @param {string[][]} rows
 * @param {string} [fallbackTitle]
 */
export function buildSheetDisplayModel(rows, fallbackTitle = "Schedule") {
  if (!rows.length) {
    return { mode: "empty", title: fallbackTitle, headers: [], bodyRows: [] };
  }

  const headerIndex = findHeaderRowIndex(rows);
  if (headerIndex >= 0) {
    const headers = rows[headerIndex];
    const bodyRows = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cell));
    return {
      mode: "schedule",
      title: extractSheetTitle(rows, headerIndex, fallbackTitle),
      headers,
      bodyRows,
    };
  }

  return {
    mode: "table",
    title: fallbackTitle,
    headers: rows[0] || [],
    bodyRows: rows.slice(1),
  };
}

/**
 * Roster-style card layout: one column per weekday, cards stacked by row label (room, unit, etc.).
 * @param {{ headers?: string[], bodyRows?: string[][] }} model
 */
export function buildScheduleCardLayout(model = {}) {
  const headers = model.headers || [];
  const bodyRows = model.bodyRows || [];
  const labelColumnIndex = headers.findIndex((cell, index) => index === 0 || !DAY_PATTERN.test(cell));

  let dayStartIndex = 1;
  if (labelColumnIndex > 0) dayStartIndex = labelColumnIndex + 1;
  if (!headers.slice(dayStartIndex).some((cell) => DAY_PATTERN.test(cell))) {
    dayStartIndex = 1;
  }

  const dayHeaders = headers.slice(dayStartIndex);
  const rowLabels = bodyRows.map((row, index) => row[Math.max(0, labelColumnIndex)] || `Item ${index + 1}`);

  const dayColumns = dayHeaders.map((label, dayIndex) => {
    const columnIndex = dayStartIndex + dayIndex;
    const key = label.toLowerCase().replace(/\s+/g, "-") || `day-${dayIndex}`;
    return {
      key,
      label: label || `Day ${dayIndex + 1}`,
      isToday: isTodayColumn(label),
      cards: bodyRows.map((row, rowIndex) => {
        const value = row[columnIndex] || "";
        return {
          key: `${key}-${rowIndex}`,
          label: rowLabels[rowIndex],
          value,
          vacant: !value.trim(),
        };
      }),
    };
  });

  return { dayColumns, rowLabels };
}

export { isTodayColumn, DAY_PATTERN };

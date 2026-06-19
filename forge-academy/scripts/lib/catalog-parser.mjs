import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CATALOG_SECTIONS = [
  "Emergency Medical Services",
  "Officer",
  "Operations",
  "Training",
  "Risk Reduction",
  "Rescue",
  "Industrial",
];

const METADATA_PREFIXES = [
  /^book:/i,
  /^pre-requisites?:/i,
  /^hours:/i,
  /^\$/,
  /^note:/i,
  /^ppe including/i,
  /^formally /i,
  /^those fire fighters/i,
  /^in development/i,
  /^course description includes/i,
  /^each individual level/i,
];

const SKIP_LINES = new Set([
  "",
  "Overview",
  "Certification Courses\tNon-Certification Courses",
  "Name \tPg.\tName\tPg.",
]);

/** @param {string} name */
export function normalizeCatalogName(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\bifsac\b/g, "")
    .replace(/\bpro board\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** @param {string} hoursText */
export function parseCatalogHours(hoursText) {
  if (!hoursText) return 0;
  const text = hoursText.trim();
  const range = text.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) return Math.max(Number(range[1]), Number(range[2]));
  const plus = text.match(/(\d+)\+/);
  if (plus) return Number(plus[1]);
  const numbers = text.match(/\d+/g);
  if (!numbers?.length) return 0;
  return Math.max(...numbers.map(Number));
}

function isMetadataLine(line) {
  return METADATA_PREFIXES.some((pattern) => pattern.test(line.trim()));
}

function isSectionHeader(line) {
  return CATALOG_SECTIONS.includes(line.trim());
}

function cleanTitle(line) {
  return line
    .trim()
    .replace(/\s+/g, " ")
    .replace(/:$/, "");
}

function nextNonEmptyLine(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index]?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function isLikelyTitle(line, lines, lineIndex) {
  const trimmed = cleanTitle(line);
  const following = nextNonEmptyLine(lines, lineIndex + 1);
  if (!trimmed || SKIP_LINES.has(trimmed) || isSectionHeader(trimmed)) return false;
  if (trimmed.length > 120) return false;
  if (isMetadataLine(trimmed)) return false;
  if (/^\d/.test(trimmed)) return false;
  if (trimmed.includes("\t")) return false;
  if (/^[a-z]/.test(trimmed)) return false;
  if (trimmed.endsWith(".") && !/\([^)]*\)$/.test(trimmed)) return false;
  if (/^[A-Z\s]{3,}$/.test(trimmed) && trimmed.length > 40) return false;
  if (
    following &&
    !/^(this|these|the|formally|in development|students|book:|pre-requisite|hours:|\$)/i.test(
      following,
    ) &&
    !isSectionHeader(following)
  ) {
    return false;
  }
  return true;
}

/**
 * @param {string} text
 * @returns {import('./catalog-parser.mjs').CatalogEntry[]}
 */
export function parseCatalogText(text) {
  const startMarker = "Emergency Medical Services\nAHA Classes";
  const endMarker = "2026 ON-CAMPUS CLASS SCHEDULE";
  const startIdx = text.indexOf(startMarker);
  const endIdx = text.indexOf(endMarker);
  if (startIdx < 0) throw new Error("Unable to locate catalog course content.");
  const body = text.slice(startIdx, endIdx > startIdx ? endIdx : undefined);
  const lines = body.split("\n");

  /** @type {import('./catalog-parser.mjs').CatalogEntry[]} */
  const entries = [];
  let currentSection = "Emergency Medical Services";
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (isSectionHeader(trimmed)) {
      currentSection = trimmed;
      index += 1;
      continue;
    }

    if (!isLikelyTitle(trimmed, lines, index)) {
      index += 1;
      continue;
    }

    const title = cleanTitle(trimmed);
    index += 1;
    const descriptionLines = [];
    let book = "";
    let prerequisites = "";
    let hoursText = "";
    let certification = /\bifsac\b/i.test(title) || /\bpro board\b/i.test(title);

    while (index < lines.length) {
      const current = lines[index];
      const currentTrimmed = current.trim();

      if (isSectionHeader(currentTrimmed)) break;

      if (/^hours:/i.test(currentTrimmed)) {
        hoursText = currentTrimmed.replace(/^hours:\s*/i, "");
        index += 1;
        break;
      }

      if (/^book:/i.test(currentTrimmed)) {
        book = currentTrimmed.replace(/^book:\s*/i, "");
        index += 1;
        continue;
      }

      if (/^pre-requisites?:/i.test(currentTrimmed)) {
        prerequisites = currentTrimmed.replace(/^pre-requisites?:\s*/i, "");
        index += 1;
        continue;
      }

      if (/^\$/.test(currentTrimmed)) {
        certification = true;
        index += 1;
        continue;
      }

      if (isLikelyTitle(currentTrimmed, lines, index) && descriptionLines.length > 0) {
        break;
      }

      if (isLikelyTitle(currentTrimmed, lines, index) && !descriptionLines.length) {
        break;
      }

      if (currentTrimmed && !SKIP_LINES.has(currentTrimmed)) {
        descriptionLines.push(currentTrimmed);
      }

      index += 1;
    }

    const description = descriptionLines.join(" ").replace(/\s+/g, " ").trim();
    if (!description && !book && !prerequisites && !hoursText) continue;
    if (description.length < 40 && !book && !hoursText) continue;

    entries.push({
      name: title,
      section: currentSection,
      description,
      book,
      prerequisites,
      hours: parseCatalogHours(hoursText),
      hoursText,
      certification,
      normalizedName: normalizeCatalogName(title),
    });
  }

  return dedupeEntries(entries);
}

/** @param {import('./catalog-parser.mjs').CatalogEntry[]} entries */
function dedupeEntries(entries) {
  const byKey = new Map();
  for (const entry of entries) {
    const key = entry.normalizedName;
    const existing = byKey.get(key);
    if (!existing || entry.description.length > existing.description.length) {
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {string} [rawPath] */
export function loadCatalogEntries(rawPath) {
  const path = rawPath ?? join(__dirname, "../data/catalog-2026-raw.txt");
  const text = readFileSync(path, "utf8");
  return parseCatalogText(text);
}

/** @type {Record<string, string>} */
export const SCHEDULE_CATALOG_ALIASES = {
  "fire officer i": "Fire Officer I",
  "fire officer ii": "Fire Officer II",
  "inspector i": "Fire Inspector I",
  "instructor i": "Fire Instructor I",
  "plans examiner i": "Plans Examiner",
  "driver operator aerial": "Driver Operator - Aerial",
  "driver operator pumper": "Driver Operator - Pumper",
  "driver operator module 6 water shuttle": "Water Shuttle",
  "basic pump operations": "Basic Pump Operations",
  "national fire academy incident safety officer": "Incident Safety Officer - NFA",
  "hazmat awareness and operations": "Hazardous Material Awareness",
  "rope rescue awareness and operations": "Rope Rescue: Awareness and Operations",
  "trench rescue awareness operations and technician":
    "Trench Rescue: Awareness, Operations, and Technician",
  "structure fires i and ii": "Structure Fires I",
  "structure fires iii and iv": "Structure Fires III",
  "company officer": "Fire Officer I",
  "firefighter standards": "Firefighter Standards NFPA 1010",
  "chief officer": "Arkansas Executive Fire Officer Program",
  "arson investigator": "Fire Investigator",
  "arson investigator refresher": "Certified Fire Investigator Refresher",
  "emergency medical technician": "Emergency Medical Technician (EMT)",
};

/**
 * @param {string} scheduleName
 * @param {import('./catalog-parser.mjs').CatalogEntry[]} entries
 */
export function matchCatalogEntry(scheduleName, entries) {
  const normalizedSchedule = normalizeCatalogName(scheduleName);
  const alias = SCHEDULE_CATALOG_ALIASES[normalizedSchedule];
  if (alias) {
    const aliasNormalized = normalizeCatalogName(alias);
    const aliasMatch = entries.find(
      (entry) =>
        entry.normalizedName === aliasNormalized ||
        entry.normalizedName.startsWith(`${aliasNormalized} `),
    );
    if (aliasMatch) return aliasMatch;
  }

  const exact = entries.find((entry) => entry.normalizedName === normalizedSchedule);
  if (exact) return exact;

  const contains = entries.filter((entry) => {
    if (entry.normalizedName === normalizedSchedule) return true;
    if (normalizedSchedule.startsWith(`${entry.normalizedName} `)) return true;
    if (entry.normalizedName.startsWith(`${normalizedSchedule} `)) return true;
    return false;
  });
  if (contains.length >= 1) {
    return contains.sort((a, b) => a.normalizedName.length - b.normalizedName.length)[0];
  }

  if (/ifsta 7th edition/i.test(scheduleName)) {
    return entries.find((entry) => entry.name.startsWith("IFSTA Chapter Series - 7th Edition"));
  }
  if (/ifsta 8th edition/i.test(scheduleName)) {
    return entries.find((entry) => entry.name.startsWith("IFSTA Chapter Series - 8th Edition"));
  }

  let best = null;
  let bestScore = 0;
  for (const entry of entries) {
    const score = similarityScore(normalizedSchedule, entry.normalizedName);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return bestScore >= 0.55 ? best : null;
}

function similarityScore(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

/**
 * @param {import('./catalog-parser.mjs').CatalogEntry} entry
 * @param {string} scheduleName
 */
export function buildClassCatalogPayload(entry, scheduleName) {
  const supplemental = [];
  if (/ifsta/i.test(scheduleName)) supplemental.push(`Schedule offering: ${scheduleName}`);
  if (/structure fires i and ii/i.test(scheduleName)) {
    supplemental.push("Combined offering covers Structure Fires I and II modules.");
  }
  if (/structure fires iii and iv/i.test(scheduleName)) {
    supplemental.push("Combined offering covers Structure Fires III and IV modules.");
  }
  if (/hazmat awareness and operations/i.test(scheduleName)) {
    supplemental.push("Combined offering covers Hazardous Materials Awareness and Operations.");
  }

  return {
    catalogDescription: [entry.description, ...supplemental].filter(Boolean).join(" "),
    catalogPrerequisites: entry.prerequisites,
    catalogBook: entry.book,
    catalogHours: entry.hours || null,
    catalogSection: entry.section,
    catalogCourseName: entry.name,
    catalogImportBatch: "afta-catalog-2026",
  };
}

/**
 * @param {import('./catalog-parser.mjs').CatalogEntry} entry
 */
export function buildCourseCatalogPayload(entry) {
  const requiredDocuments = [];
  if (entry.book) requiredDocuments.push(`Textbook: ${entry.book}`);
  if (entry.prerequisites) requiredDocuments.push(`Prerequisites: ${entry.prerequisites}`);
  if (entry.hoursText) requiredDocuments.push(`Catalog hours: ${entry.hoursText}`);

  return {
    description: entry.description || `AFTA 2026 catalog — ${entry.name}`,
    hours: entry.hours || 40,
    category: inferCategory(entry),
    certificationType: inferCertificationType(entry.name),
    requiredDocuments,
    requiredEquipment: entry.book,
    testRequired: entry.certification,
    skillsRequired: entry.certification,
    certificateIssued: entry.certification,
    catalogPrerequisites: entry.prerequisites,
    catalogBook: entry.book,
    catalogSection: entry.section,
    catalogImportBatch: "afta-catalog-2026",
  };
}

/** @param {import('./catalog-parser.mjs').CatalogEntry} entry */
function inferCategory(entry) {
  const name = entry.normalizedName;
  if (entry.section === "Emergency Medical Services") return "ems_ce";
  if (name.includes("fire officer") || name.includes("chief officer") || name.includes("company officer")) {
    return "fire_officer";
  }
  if (name.includes("instructor")) return "fire_instructor";
  if (name.includes("inspector") || name.includes("plans examiner") || name.includes("inspection")) {
    return "fire_inspector";
  }
  if (name.includes("investigator")) return "fire_investigator";
  if (name.includes("driver operator") || name.includes("pump operation") || name.includes("water shuttle")) {
    return "driver_operator";
  }
  if (name.includes("aerial")) return "aerial_operations";
  if (name.includes("hazmat") || name.includes("hazardous material")) return "hazmat_operations";
  if (name.includes("firefighter ii") || name.includes("ffii")) return "firefighter_ii";
  if (name.includes("firefighter")) return "firefighter_i";
  if (name.includes("rope") || name.includes("trench") || name.includes("confined space") || name.includes("swift water") || name.includes("surface water")) {
    return "technical_rescue";
  }
  if (name.includes("extrication") || name.includes("rescue")) return "rescue";
  if (name.includes("structure fire") || name.includes("exterior fire") || name.includes("live fire")) {
    return "live_fire";
  }
  if (name.includes("incident command") || name.includes("leadership") || name.includes("safety officer")) {
    return "leadership";
  }
  if (name.includes("wildland") || name.includes("forestry")) return "wildland";
  if (name.includes("fire brigade")) return "live_fire";
  return "leadership";
}

/** @param {string} name */
function inferCertificationType(name) {
  const match = name.match(/\(([^)]+)\)/);
  if (match) return match[1].replace(/\s+/g, " ").trim();
  if (/fire officer i\b/i.test(name)) return "Fire Officer I";
  if (/fire officer ii\b/i.test(name)) return "Fire Officer II";
  if (/firefighter i\b/i.test(name)) return "Firefighter I";
  if (/firefighter ii\b/i.test(name)) return "Firefighter II";
  return "";
}

/**
 * @typedef {Object} CatalogEntry
 * @property {string} name
 * @property {string} section
 * @property {string} description
 * @property {string} book
 * @property {string} prerequisites
 * @property {number} hours
 * @property {string} hoursText
 * @property {boolean} certification
 * @property {string} normalizedName
 */

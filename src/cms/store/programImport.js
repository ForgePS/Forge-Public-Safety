import { DEFAULT_PROGRAMS, belongsToProgram, programSingletonId } from "../core/programs.js";
import { getLocalStore, setLocalStore } from "./localStore.js";
import { save, remove, isUsingFirebase } from "./index.js";
import { clearSeedCache } from "./contentFallback.js";
import { getProgramContentSource, hasBundledContent } from "./programContentSources.js";
import {
  buildProgramBundle,
  buildMarketingBundleFromContent,
  normalizeLegacyContentJson,
} from "./contentBuilders.js";

const PROGRAM_CONTENT_KEYS = [
  "pages",
  "branding",
  "navigation",
  "footers",
  "forms",
  "collections",
  "settings",
  "emailTemplates",
  "redirects",
  "seoGlobal",
  "search",
  "popups",
  "media",
];

const SINGLETON_KEYS = new Set(["branding", "navigation", "settings", "seoGlobal", "search"]);

function findProgram(programId) {
  return DEFAULT_PROGRAMS.find((p) => p.id === programId) || { id: programId, name: programId };
}

function stripProgramContent(store, programId) {
  const next = { ...store };
  PROGRAM_CONTENT_KEYS.forEach((key) => {
    const items = store[key];
    if (!Array.isArray(items)) return;
    if (SINGLETON_KEYS.has(key)) {
      next[key] = items.filter((item) => !belongsToProgram(item, programId));
    } else {
      next[key] = items.filter((item) => !belongsToProgram(item, programId));
    }
  });
  return next;
}

function mergeBundleIntoStore(store, bundle) {
  const next = { ...store };
  PROGRAM_CONTENT_KEYS.forEach((key) => {
    const incoming = bundle[key];
    if (!incoming?.length) return;
    const existing = Array.isArray(next[key]) ? next[key] : [];
    next[key] = [...existing, ...incoming];
  });
  return next;
}

async function saveBundleToFirebase(programId, bundle, userId) {
  for (const key of PROGRAM_CONTENT_KEYS) {
    const items = bundle[key];
    if (!items?.length) continue;
    for (const item of items) {
      await save(key, item, userId, programId);
    }
  }
}

async function removeProgramFromFirebase(programId) {
  for (const key of PROGRAM_CONTENT_KEYS) {
    const { getAll } = await import("./index.js");
    const items = await getAll(key, programId);
    for (const item of items || []) {
      if (item?.id) await remove(key, item.id);
    }
    if (SINGLETON_KEYS.has(key)) {
      const singletonId = programSingletonId(programId);
      await remove(key, singletonId).catch(() => {});
    }
  }
}

export function buildBundledProgramContent(programId) {
  const program = findProgram(programId);
  const content = getProgramContentSource(programId);
  if (!content) {
    return buildProgramBundle(program);
  }
  return buildProgramBundle(program, content);
}

export function buildContentFromJson(programId, json) {
  const program = findProgram(programId);
  const normalized = normalizeLegacyContentJson(json);
  if (!normalized?.global?.site) {
    throw new Error("Unrecognized JSON format. Expected content folder files (global, home, footer, etc.) or a CMS export.");
  }
  return buildMarketingBundleFromContent(program, normalized);
}

export function buildContentFromCmsExport(programId, json) {
  const bundle = {};
  PROGRAM_CONTENT_KEYS.forEach((key) => {
    const items = json[key];
    if (!Array.isArray(items)) return;
    bundle[key] = items.map((item) => ({ ...item, programId }));
  });
  if (!bundle.pages?.length) {
    throw new Error("CMS export must include a pages array.");
  }
  return bundle;
}

function detectJsonFormat(json) {
  if (Array.isArray(json.pages) && json.pages.length) return "cms-export";
  if (json.global?.site || json.home || json["products-page"]) return "legacy-content";
  return "unknown";
}

export async function importProgramContent(programId, options = {}) {
  const {
    source = "bundled",
    json = null,
    replace = true,
    userId = "import",
    sourceProgramId = null,
  } = options;

  let bundle;
  if (source === "bundled") {
    if (!hasBundledContent(programId) && !sourceProgramId) {
      throw new Error("No bundled content available for this program.");
    }
    if (sourceProgramId) {
      const content = getProgramContentSource(sourceProgramId);
      if (!content) throw new Error(`No bundled content for source program "${sourceProgramId}".`);
      bundle = buildMarketingBundleFromContent(findProgram(programId), content);
    } else {
      bundle = buildBundledProgramContent(programId);
    }
  } else if (source === "json") {
    if (!json) throw new Error("JSON data is required for json import.");
    const format = detectJsonFormat(json);
    bundle = format === "cms-export"
      ? buildContentFromCmsExport(programId, json)
      : buildContentFromJson(programId, json);
  } else {
    throw new Error(`Unknown import source: ${source}`);
  }

  if (isUsingFirebase()) {
    if (replace) await removeProgramFromFirebase(programId);
    await saveBundleToFirebase(programId, bundle, userId);
  } else {
    const store = getLocalStore();
    const base = replace ? stripProgramContent(store, programId) : store;
    setLocalStore(mergeBundleIntoStore(base, bundle));
  }

  clearSeedCache();
  return {
    programId,
    pagesImported: bundle.pages?.length || 0,
    replace,
    source,
  };
}

export function getImportOptionsForProgram(programId) {
  const options = [];
  if (hasBundledContent(programId)) {
    options.push({
      id: "bundled",
      label: "Import bundled site content",
      description: "Load the pre-built pages, branding, and navigation stored in this repository for this program.",
    });
  }
  options.push({
    id: "json",
    label: "Import from JSON file",
    description: "Upload a content folder export (global.json, home.json, etc.) or a CMS backup JSON file.",
  });
  if (programId !== "forge-marketing" && hasBundledContent("forge-marketing")) {
    options.push({
      id: "copy-marketing",
      label: "Copy from Forge Public Safety",
      description: "Use the main marketing site content as a starting point (you can customize after import).",
      sourceProgramId: "forge-marketing",
    });
  }
  return options;
}

export async function importProgramFromFile(programId, file, replace = true) {
  const text = await file.text();
  const json = JSON.parse(text);
  return importProgramContent(programId, { source: "json", json, replace });
}

export async function importBundledProgram(programId, replace = true) {
  return importProgramContent(programId, { source: "bundled", replace });
}

export async function copyProgramContent(targetProgramId, sourceProgramId, replace = true) {
  return importProgramContent(targetProgramId, {
    source: "bundled",
    sourceProgramId,
    replace,
  });
}

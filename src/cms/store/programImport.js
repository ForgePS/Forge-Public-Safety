import { DEFAULT_PROGRAMS, belongsToProgram, programSingletonId } from "../core/programs.js";
import { getLocalStore, setLocalStore } from "./localStore.js";
import * as cmsStore from "./index.js";
import { clearSeedCache } from "./contentFallback.js";
import { getProgramContentSource, hasBundledContent } from "./programContentSources.js";
import {
  buildProgramBundle,
  buildMarketingBundleFromContent,
  normalizeLegacyContentJson,
  mergeUploadedContentFiles,
  parseJsonText,
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

function filterItemsForProgram(items, programId) {
  if (!Array.isArray(items) || !items.length) return [];
  const tagged = items.some((item) => item?.programId);
  if (!tagged) return items;
  return items.filter((item) => belongsToProgram(item, programId));
}

function stripProgramContent(store, programId) {
  const next = { ...store };
  PROGRAM_CONTENT_KEYS.forEach((key) => {
    const items = store[key];
    if (!Array.isArray(items)) return;
    next[key] = items.filter((item) => !belongsToProgram(item, programId));
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
      await cmsStore.save(key, item, userId, programId);
    }
  }
}

async function removeProgramFromFirebase(programId) {
  for (const key of PROGRAM_CONTENT_KEYS) {
    const items = await cmsStore.getAll(key, programId);
    for (const item of items || []) {
      if (item?.id) await cmsStore.remove(key, item.id);
    }
    if (SINGLETON_KEYS.has(key)) {
      const singletonId = programSingletonId(programId);
      await cmsStore.remove(key, singletonId).catch(() => {});
    }
  }
}

async function verifyProgramImport(programId) {
  const pages = await cmsStore.getAll("pages", programId);
  if (!pages?.length) {
    throw new Error(
      "Import finished but no pages were saved for this program. Export your site from Admin first (Export backup), then import that file — content/*.json files only rebuild the default 9-page template from copy."
    );
  }
  return pages.length;
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
    if (json.home || json.contact || json.footer) {
      throw new Error("Missing global.json. Include global.json with your other content files.");
    }
    throw new Error("Unrecognized JSON format. Use Export backup from this admin panel, or include global.json + home.json content files.");
  }
  return buildMarketingBundleFromContent(program, normalized);
}

export function buildContentFromCmsExport(programId, json) {
  const bundle = {};
  const allPages = Array.isArray(json.pages) ? json.pages : [];

  PROGRAM_CONTENT_KEYS.forEach((key) => {
    const items = json[key];
    if (!Array.isArray(items)) return;
    const filtered = filterItemsForProgram(items, programId);
    if (filtered.length) {
      bundle[key] = filtered.map((item) => ({ ...item, programId }));
    }
  });

  if (!bundle.pages?.length) {
    if (allPages.length && !allPages.some((page) => page?.programId)) {
      bundle.pages = allPages.map((page) => ({ ...page, programId }));
    } else if (allPages.length) {
      throw new Error(
        `This backup has ${allPages.length} pages, but none belong to program "${programId}". Switch to the correct program before importing, or export from the program you want to restore.`
      );
    } else {
      throw new Error("CMS backup must include a pages array with at least one page.");
    }
  }

  return bundle;
}

function detectJsonFormat(json) {
  if (Array.isArray(json.pages) && json.pages.length) return "cms-export";
  if (json.global?.site || json.site || json.home || json["products-page"]) return "legacy-content";
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
  let importMode = source;

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
    if (format === "cms-export") {
      bundle = buildContentFromCmsExport(programId, json);
      importMode = "cms-backup";
    } else if (format === "legacy-content") {
      bundle = buildContentFromJson(programId, json);
      importMode = "content-rebuild";
    } else {
      throw new Error("Unrecognized JSON format. Export a backup from Admin, or upload global.json + home.json content files.");
    }
  } else {
    throw new Error(`Unknown import source: ${source}`);
  }

  if (cmsStore.isUsingFirebase()) {
    if (replace) await removeProgramFromFirebase(programId);
    await saveBundleToFirebase(programId, bundle, userId);
  } else {
    const store = getLocalStore();
    const base = replace ? stripProgramContent(store, programId) : store;
    setLocalStore(mergeBundleIntoStore(base, bundle));
  }

  clearSeedCache();
  const pagesImported = await verifyProgramImport(programId);

  return {
    programId,
    pagesImported,
    replace,
    source,
    importMode,
    rebuiltFromContent: importMode === "content-rebuild",
  };
}

export async function exportProgramContent(programId) {
  const bundle = { programId, exportedAt: new Date().toISOString(), version: 1 };
  for (const key of PROGRAM_CONTENT_KEYS) {
    const data = await cmsStore.getAll(key, programId);
    if (Array.isArray(data)) {
      bundle[key] = data;
    } else if (data) {
      bundle[key] = [data];
    } else {
      bundle[key] = [];
    }
  }
  return bundle;
}

export function downloadProgramExport(programId, programName = programId) {
  return exportProgramContent(programId).then((bundle) => {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${programName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-cms-backup.json`;
    link.click();
    URL.revokeObjectURL(url);
    return bundle;
  });
}

export function getImportOptionsForProgram(programId) {
  const options = [];
  if (hasBundledContent(programId)) {
    options.push({
      id: "bundled",
      label: "Import bundled site content",
      description: "Load the pre-built pages stored in this repository for this program.",
    });
  }
  options.push({
    id: "json",
    label: "Import CMS backup (recommended)",
    description: "Upload a backup JSON exported from Admin. This restores your exact pages, sections, and edits.",
  });
  options.push({
    id: "json-content",
    label: "Import content copy files",
    description: "Upload content/*.json files (global.json, home.json, etc.). These rebuild the standard 9-page site from marketing copy — not custom CMS edits.",
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
  return importProgramFromFiles(programId, [file], replace);
}

export async function importProgramFromFiles(programId, files, replace = true, { contentRebuild = false } = {}) {
  if (!files?.length) throw new Error("No files selected.");

  const fileDataList = [];
  for (const file of files) {
    const name = file.name || "upload.json";
    const lower = name.toLowerCase();
    if (!lower.endsWith(".json")) {
      throw new Error(`"${name}" is not a JSON file. Please select .json files only.`);
    }
    try {
      const data = parseJsonText(await file.text());
      fileDataList.push({ name, data });
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error(`"${name}" is not valid JSON. Check the file for syntax errors.`);
      }
      throw err;
    }
  }

  const merged = mergeUploadedContentFiles(fileDataList);

  if (contentRebuild && !Array.isArray(merged.pages)) {
    return importProgramContent(programId, { source: "json", json: merged, replace });
  }

  if (Array.isArray(merged.pages) && merged.pages.length) {
    return importProgramContent(programId, { source: "json", json: merged, replace });
  }

  if (contentRebuild || merged.global || merged.home || merged.site) {
    return importProgramContent(programId, { source: "json", json: merged, replace });
  }

  throw new Error("Could not detect import format. Export a CMS backup from Admin, or include global.json with your content files.");
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

export async function restoreProgramWebsite(programId) {
  return importBundledProgram(programId, true);
}

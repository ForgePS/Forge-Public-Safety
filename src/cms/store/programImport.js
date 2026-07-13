import { DEFAULT_PROGRAMS, belongsToProgram, programSingletonId, withProgramId } from "../core/programs.js";
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
  extractPagesFromPayload,
  analyzeMergedUpload,
  looksLikeCmsPage,
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

function normalizeSingletonArray(items, programId) {
  if (!Array.isArray(items)) return items ? [withProgramId(items, programId)] : [];
  return items.map((item) => withProgramId(item, programId));
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

async function verifyProgramImport(programId, expectedPages = null) {
  const pages = await cmsStore.getAll("pages", programId);
  if (!pages?.length) {
    throw new Error(
      "Import finished but no pages were saved for this program. Use a CMS backup JSON with a pages array (Export backup from Admin), not content/*.json copy files."
    );
  }
  if (expectedPages?.length) {
    const importedSlugs = new Set(pages.map((p) => p.slug));
    const expectedSlugs = new Set(expectedPages.map((p) => p.slug));
    const matched = [...expectedSlugs].filter((slug) => importedSlugs.has(slug)).length;
    if (matched === 0) {
      throw new Error(
        `Import saved ${pages.length} pages, but none matched the uploaded files. Try switching to the correct program before importing.`
      );
    }
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
    if (json.home || json.contact || json.footer || json.media) {
      throw new Error("Missing global.json (or site name). Include global.json with your other content files.");
    }
    throw new Error("Unrecognized JSON format. Use Export backup from this admin panel, or include global.json + home.json content files.");
  }
  if (!normalized.home) {
    throw new Error("Missing home.json. Content copy imports need at least global.json and home.json.");
  }
  try {
    return buildMarketingBundleFromContent(program, normalized);
  } catch (err) {
    throw new Error(`Could not rebuild pages from content files: ${err.message}`);
  }
}

export function buildContentFromCmsExport(programId, json) {
  const bundle = {};
  const allPages = extractPagesFromPayload(json);

  if (allPages.length) {
    bundle.pages = allPages.map((page) => withProgramId({ ...page }, programId));
  }

  PROGRAM_CONTENT_KEYS.forEach((key) => {
    if (key === "pages") return;
    const items = json[key];
    if (!Array.isArray(items)) return;
    const filtered = filterItemsForProgram(items, programId);
    const source = filtered.length ? filtered : items;
    if (source.length) {
      bundle[key] = normalizeSingletonArray(source, programId);
    }
  });

  if (!bundle.pages?.length) {
    throw new Error("CMS backup must include at least one page with sections.");
  }

  return bundle;
}

function detectJsonFormat(json) {
  const pages = extractPagesFromPayload(json);
  if (pages.length) return "cms-export";
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
    expectedPages = null,
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
    try {
      await saveBundleToFirebase(programId, bundle, userId);
    } catch (err) {
      const msg = err?.message || String(err);
      if (/permission|Missing or insufficient/i.test(msg)) {
        throw new Error(
          "Import failed: Firebase permission denied. Sign in with a real Firebase admin account (not the local “admin” password)."
        );
      }
      throw err;
    }
  } else {
    const store = getLocalStore();
    const base = replace ? stripProgramContent(store, programId) : store;
    setLocalStore(mergeBundleIntoStore(base, bundle));
  }

  clearSeedCache();
  const pagesImported = await verifyProgramImport(programId, expectedPages);

  return {
    programId,
    pagesImported,
    replace,
    source,
    importMode,
    rebuiltFromContent: importMode === "content-rebuild",
    importedPageTitles: (bundle.pages || []).map((p) => p.title || p.slug),
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
    description: "Upload a backup JSON exported from Admin, individual page JSON files, or a full CMS store export with pages[].",
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

export async function importProgramFromFile(programId, file, replace = true, options = {}) {
  return importProgramFromFiles(programId, [file], replace, options);
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
  const analysis = analyzeMergedUpload(merged);
  const expectedPages = extractPagesFromPayload(merged);

  if (analysis.format === "cms-backup") {
    return importProgramContent(programId, {
      source: "json",
      json: merged,
      replace,
      expectedPages,
    });
  }

  if (contentRebuild) {
    if (analysis.format === "unknown") {
      throw new Error(
        `Could not recognize content copy files in: ${fileDataList.map((f) => f.name).join(", ")}. ` +
        "Include at least global.json (with site) and home.json."
      );
    }
    return importProgramContent(programId, { source: "json", json: merged, replace });
  }

  const fileNames = fileDataList.map((f) => f.name).join(", ");
  throw new Error(
    `No CMS pages found in: ${fileNames}. ` +
    "Content copy files (global.json, home.json, etc.) only rebuild the template site — use \"Import content copy files\" for those. " +
    "To restore custom pages, export a CMS backup from Admin first, or upload JSON files that contain page objects with sections."
  );
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
  // Prefer the deployed cms-seed.json — that is what Hosting actually has.
  // Falling back to rebuild-from-bundled only if seed fetch fails.
  const { fetchProductionBootstrap, getProgramSliceFromBootstrap } = await import("./productionBootstrap.js");
  const bootstrap = await fetchProductionBootstrap({ force: true });

  if (bootstrap?.pages?.length) {
    const slice = getProgramSliceFromBootstrap(bootstrap, programId);
    if (!slice?.pages?.length) {
      throw new Error(`Deployed seed has no pages for program "${programId}".`);
    }

    const bundle = {
      pages: slice.pages,
      branding: slice.branding ? [slice.branding] : [],
      navigation: slice.navigation ? [slice.navigation] : [],
      footers: slice.footers || [],
      forms: slice.forms || [],
      collections: slice.collections || [],
      settings: slice.settings ? [slice.settings] : [],
      redirects: slice.redirects || [],
      seoGlobal: slice.seoGlobal ? [slice.seoGlobal] : [],
      popups: slice.popups || [],
      media: [],
      emailTemplates: [],
      search: [],
    };

    if (cmsStore.isUsingFirebase()) {
      try {
        await removeProgramFromFirebase(programId);
        await saveBundleToFirebase(programId, bundle, "restore");
      } catch (err) {
        const msg = err?.message || String(err);
        if (/permission|Missing or insufficient/i.test(msg)) {
          throw new Error(
            "Firestore failed: Firebase permission denied. Sign in with a real Firebase admin account (not the local “admin” password)."
          );
        }
        throw err;
      }
    } else {
      const store = getLocalStore();
      const base = stripProgramContent(store, programId);
      const next = mergeBundleIntoStore(base, bundle);
      next.seedVersion = bootstrap.seedVersion || next.seedVersion;
      // Keep programs list from full seed when available
      if (bootstrap.programs?.length) next.programs = bootstrap.programs;
      setLocalStore(next);
    }

    clearSeedCache();
    const pagesImported = await verifyProgramImport(programId, bundle.pages);
    return {
      programId,
      pagesImported,
      replace: true,
      source: "cms-seed",
      importMode: "deployed-seed",
      rebuiltFromContent: false,
      importedPageTitles: (bundle.pages || []).map((p) => p.title || p.slug),
    };
  }

  return importBundledProgram(programId, true);
}

export async function hardResetSiteFromDeployedSeed() {
  const { resetBrowserSiteFromSeed } = await import("./productionBootstrap.js");
  const bootstrap = await resetBrowserSiteFromSeed();
  return {
    pagesImported: bootstrap.pages?.length || 0,
    seedVersion: bootstrap.seedVersion,
  };
}

export { analyzeMergedUpload, looksLikeCmsPage };

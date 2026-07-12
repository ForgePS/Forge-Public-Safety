import { buildSeedData } from "./seed.js";
import { belongsToProgram } from "../core/programs.js";

let cachedSeedData = null;

function getCachedSeedData() {
  if (!cachedSeedData) {
    cachedSeedData = buildSeedData();
  }
  return cachedSeedData;
}

function filterByProgram(items, programId) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => belongsToProgram(item, programId));
}

function firstForProgram(items, programId) {
  return filterByProgram(items, programId)[0] || null;
}

export function getProgramContentFromSeed(programId) {
  const seed = getCachedSeedData();
  return {
    programs: seed.programs,
    pages: filterByProgram(seed.pages, programId),
    branding: firstForProgram(seed.branding, programId),
    navigation: firstForProgram(seed.navigation, programId),
    footers: filterByProgram(seed.footers, programId),
    forms: filterByProgram(seed.forms, programId),
    settings: firstForProgram(seed.settings, programId),
    popups: filterByProgram(seed.popups, programId),
    redirects: filterByProgram(seed.redirects, programId),
    seoGlobal: firstForProgram(seed.seoGlobal, programId),
    collections: filterByProgram(seed.collections, programId),
  };
}

export function hasPublishedHome(pages) {
  return (pages || []).some((p) => p.slug === "home" && p.status === "published");
}

export function clearSeedCache() {
  cachedSeedData = null;
}

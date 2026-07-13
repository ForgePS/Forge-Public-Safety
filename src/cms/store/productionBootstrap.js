import { DEFAULT_PROGRAM_ID } from "../core/programs.js";
import { LOCAL_STORE_KEY } from "../core/constants.js";
import { setLocalStore, getLocalStore, clearLocalStore } from "./localStore.js";
import { isUsingFirebase } from "./index.js";
import { clearSeedCache } from "./contentFallback.js";

let cachedBootstrap = null;

export async function fetchProductionBootstrap({ force = false } = {}) {
  if (cachedBootstrap && !force) return cachedBootstrap;
  try {
    const res = await fetch(`/cms-seed.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    cachedBootstrap = await res.json();
    return cachedBootstrap;
  } catch {
    return null;
  }
}

export function getLocalSeedVersion() {
  try {
    return getLocalStore()?.seedVersion || null;
  } catch {
    return null;
  }
}

export function persistBootstrapToLocalStore(data, { force = false } = {}) {
  if (!data || isUsingFirebase()) return false;
  try {
    const existing = localStorage.getItem(LOCAL_STORE_KEY);
    if (existing && !force) {
      const localVersion = getLocalSeedVersion();
      const seedVersion = data.seedVersion || null;
      if (!(seedVersion && localVersion !== seedVersion)) return false;
    }
    setLocalStore(data);
    clearSeedCache();
    return true;
  } catch {
    return false;
  }
}

export function getProgramSliceFromBootstrap(data, programId = DEFAULT_PROGRAM_ID) {
  if (!data) return null;
  const pid = programId || DEFAULT_PROGRAM_ID;
  const belongs = (item) => (item?.programId || DEFAULT_PROGRAM_ID) === pid;
  const first = (items) => (Array.isArray(items) ? items.find(belongs) : null);

  return {
    programs: data.programs,
    pages: (data.pages || []).filter(belongs),
    branding: first(data.branding),
    navigation: first(data.navigation),
    footers: (data.footers || []).filter(belongs),
    forms: (data.forms || []).filter(belongs),
    settings: first(data.settings),
    popups: (data.popups || []).filter(belongs),
    redirects: (data.redirects || []).filter(belongs),
    seoGlobal: first(data.seoGlobal),
    collections: (data.collections || []).filter(belongs),
  };
}

/** Wipe browser CMS data and reload the deployed cms-seed.json (local mode only). */
export async function resetBrowserSiteFromSeed() {
  if (isUsingFirebase()) {
    throw new Error(
      "This site is connected to Firebase. Restore needs a real Firebase admin login — the local “admin” password cannot update Firestore content."
    );
  }
  const bootstrap = await fetchProductionBootstrap({ force: true });
  if (!bootstrap?.pages?.length) {
    throw new Error("Could not download /cms-seed.json. Redeploy the site, then try again.");
  }
  clearLocalStore();
  setLocalStore(bootstrap);
  clearSeedCache();
  cachedBootstrap = bootstrap;
  return bootstrap;
}

export async function ensurePublicSiteBootstrap(programId) {
  const bootstrap = await fetchProductionBootstrap();
  if (!bootstrap) return null;

  const store = getLocalStore();
  const hasPages = (store.pages || []).some(
    (p) => (p.programId || DEFAULT_PROGRAM_ID) === programId
  );
  const localVersion = store.seedVersion || null;
  const seedVersion = bootstrap.seedVersion || null;
  const seedChanged = Boolean(seedVersion && localVersion !== seedVersion);

  if (hasPages && !seedChanged) return null;

  persistBootstrapToLocalStore(bootstrap, { force: true });
  return getProgramSliceFromBootstrap(bootstrap, programId);
}

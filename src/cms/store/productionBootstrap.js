import { DEFAULT_PROGRAM_ID } from "../core/programs.js";
import { LOCAL_STORE_KEY } from "../core/constants.js";
import { setLocalStore, getLocalStore } from "./localStore.js";
import { isUsingFirebase } from "./index.js";
import { clearSeedCache } from "./contentFallback.js";

let cachedBootstrap = null;

export async function fetchProductionBootstrap() {
  if (cachedBootstrap) return cachedBootstrap;
  try {
    const res = await fetch("/cms-seed.json", { cache: "no-cache" });
    if (!res.ok) return null;
    cachedBootstrap = await res.json();
    return cachedBootstrap;
  } catch {
    return null;
  }
}

export function persistBootstrapToLocalStore(data) {
  if (!data || isUsingFirebase()) return false;
  try {
    if (localStorage.getItem(LOCAL_STORE_KEY)) return false;
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

export async function ensurePublicSiteBootstrap(programId) {
  const store = getLocalStore();
  const hasPages = (store.pages || []).some(
    (p) => (p.programId || DEFAULT_PROGRAM_ID) === programId
  );
  if (hasPages) return null;

  const bootstrap = await fetchProductionBootstrap();
  if (!bootstrap) return null;

  persistBootstrapToLocalStore(bootstrap);
  return getProgramSliceFromBootstrap(bootstrap, programId);
}

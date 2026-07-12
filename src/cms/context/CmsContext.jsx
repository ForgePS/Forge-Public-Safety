import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import * as cmsStore from "../store/index.js";
import { seedLocalStore } from "../store/seed.js";
import { isSeeded, migrateLegacyStore } from "../store/index.js";
import {
  DEFAULT_PROGRAM_ID,
  DEFAULT_PROGRAMS,
  resolveProgramFromHost,
} from "../core/programs.js";

const ACTIVE_PROGRAM_KEY = "forge_cms_active_program";

const GLOBAL_STORE_KEYS = new Set(["programs", "roles", "users"]);

const CmsContext = createContext(null);

function readStoredProgramId() {
  try {
    return localStorage.getItem(ACTIVE_PROGRAM_KEY) || DEFAULT_PROGRAM_ID;
  } catch {
    return DEFAULT_PROGRAM_ID;
  }
}

function writeStoredProgramId(id) {
  try {
    localStorage.setItem(ACTIVE_PROGRAM_KEY, id);
  } catch {
    /* ignore */
  }
}

export function CmsProvider({ children }) {
  const location = useLocation();
  const isAdminMode = location.pathname.startsWith("/admin") && !location.pathname.startsWith("/admin/login");

  const [programs, setPrograms] = useState(DEFAULT_PROGRAMS);
  const [programId, setProgramIdState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_PROGRAM_ID;
    if (window.location.pathname.startsWith("/admin")) return readStoredProgramId();
    return resolveProgramFromHost(window.location.hostname, DEFAULT_PROGRAMS).id;
  });

  const [pages, setPages] = useState([]);
  const [branding, setBranding] = useState(null);
  const [navigation, setNavigation] = useState(null);
  const [footers, setFooters] = useState([]);
  const [forms, setForms] = useState([]);
  const [settings, setSettings] = useState(null);
  const [popups, setPopups] = useState([]);
  const [redirects, setRedirects] = useState([]);
  const [seoGlobal, setSeoGlobal] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const program = useMemo(
    () => programs.find((p) => p.id === programId) || programs[0] || DEFAULT_PROGRAMS[0],
    [programs, programId]
  );

  const setProgramId = useCallback((id) => {
    writeStoredProgramId(id);
    setProgramIdState(id);
  }, []);

  const refreshPrograms = useCallback(async () => {
    const list = await cmsStore.getAll("programs");
    setPrograms(Array.isArray(list) && list.length ? list : DEFAULT_PROGRAMS);
  }, []);

  const loadAll = useCallback(async (pid = programId) => {
    migrateLegacyStore();
    if (!cmsStore.isSeeded()) {
      seedLocalStore();
    }

    const [
      programList,
      p,
      b,
      n,
      f,
      fm,
      s,
      pop,
      red,
      seo,
      col,
    ] = await Promise.all([
      cmsStore.getAll("programs"),
      cmsStore.getAll("pages", pid),
      cmsStore.getAll("branding", pid),
      cmsStore.getAll("navigation", pid),
      cmsStore.getAll("footers", pid),
      cmsStore.getAll("forms", pid),
      cmsStore.getAll("settings", pid),
      cmsStore.getAll("popups", pid),
      cmsStore.getAll("redirects", pid),
      cmsStore.getAll("seoGlobal", pid),
      cmsStore.getAll("collections", pid),
    ]);

    setPrograms(Array.isArray(programList) && programList.length ? programList : DEFAULT_PROGRAMS);
    setPages(Array.isArray(p) ? p : []);
    setBranding(b?.id ? b : (Array.isArray(b) ? b[0] : null));
    setNavigation(n?.id ? n : (Array.isArray(n) ? n[0] : null));
    setFooters(Array.isArray(f) ? f : []);
    setForms(Array.isArray(fm) ? fm : []);
    setSettings(s?.id ? s : (Array.isArray(s) ? s[0] : null));
    setPopups(Array.isArray(pop) ? pop : []);
    setRedirects(Array.isArray(red) ? red : []);
    setSeoGlobal(seo?.id ? seo : (Array.isArray(seo) ? seo[0] : null));
    setCollections(Array.isArray(col) ? col : []);
    setLoading(false);
    setInitialized(true);
  }, [programId]);

  useEffect(() => {
    if (!isAdminMode) {
      const resolved = resolveProgramFromHost(window.location.hostname, programs);
      if (resolved.id !== programId) setProgramIdState(resolved.id);
    }
  }, [isAdminMode, programs, programId]);

  useEffect(() => {
    setLoading(true);
    loadAll(programId);
  }, [programId, loadAll]);

  useEffect(() => {
    const onStoreChange = () => loadAll(programId);
    window.addEventListener("cms-store-changed", onStoreChange);
    return () => window.removeEventListener("cms-store-changed", onStoreChange);
  }, [loadAll, programId]);

  const getPublishedPage = useCallback((slug) => {
    const normalized = slug === "/" || slug === "" ? "home" : slug.replace(/^\//, "");
    const now = new Date();
    return pages.find((p) => {
      if (p.slug !== normalized) return false;
      if (p.status === "published") return true;
      if (p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) <= now) return true;
      return false;
    });
  }, [pages]);

  const getFooter = useCallback((footerId) => {
    return footers.find((f) => f.id === footerId) || footers[0] || null;
  }, [footers]);

  const store = useMemo(() => ({
    getAll: (key) => (GLOBAL_STORE_KEYS.has(key) ? cmsStore.getAll(key) : cmsStore.getAll(key, programId)),
    getById: (key, id) => cmsStore.getById(key, id),
    getPageBySlug: (slug) => cmsStore.getPageBySlug(slug, programId),
    getPublishedPages: () => cmsStore.getPublishedPages(programId),
    save: (key, item, userId = "system") => (
      GLOBAL_STORE_KEYS.has(key)
        ? cmsStore.save(key, item, userId)
        : cmsStore.save(key, item, userId, programId)
    ),
    remove: (key, id) => cmsStore.remove(key, id),
    getVersions: (resourceType, resourceId) => cmsStore.getVersions(resourceType, resourceId, programId),
    subscribe: cmsStore.subscribe,
    isSeeded: cmsStore.isSeeded,
    isUsingFirebase: cmsStore.isUsingFirebase,
  }), [programId]);

  const value = useMemo(() => ({
    pages,
    branding,
    navigation,
    footers,
    forms,
    settings,
    popups,
    redirects,
    seoGlobal,
    collections,
    programs,
    program,
    programId,
    setProgramId,
    isAdminMode,
    loading,
    initialized,
    getPublishedPage,
    getFooter,
    refresh: () => loadAll(programId),
    refreshPrograms,
    store,
  }), [
    pages, branding, navigation, footers, forms, settings, popups, redirects,
    seoGlobal, collections, programs, program, programId, setProgramId,
    isAdminMode, loading, initialized, getPublishedPage, getFooter, loadAll, refreshPrograms, store,
  ]);

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

export function useCms() {
  const ctx = useContext(CmsContext);
  if (!ctx) throw new Error("useCms must be used within CmsProvider");
  return ctx;
}

export function useBrandingStyles() {
  const { branding } = useCms();
  if (!branding) return {};
  const c = branding.colors || {};
  const f = branding.fonts || {};
  return {
    "--cms-primary": c.primary,
    "--cms-secondary": c.secondary,
    "--cms-accent": c.accent,
    "--cms-bg": c.background,
    "--cms-bg-alt": c.backgroundAlt,
    "--cms-text": c.text,
    "--cms-text-muted": c.textMuted,
    "--cms-link": c.link,
    "--cms-button": c.button,
    "--cms-button-text": c.buttonText,
    "--cms-border": c.border,
    "--cms-font-heading": f.heading,
    "--cms-font-body": f.body,
    "--cms-container-width": branding.styles?.containerWidth || "1280px",
  };
}

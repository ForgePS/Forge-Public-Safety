import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import * as cmsStore from "../store/index.js";
import { seedLocalStore } from "../store/seed.js";
import { migrateLegacyStore } from "../store/index.js";
import { getProgramContentFromSeed, hasPublishedHome } from "../store/contentFallback.js";
import { brandingStylesFromBranding } from "../core/brandingStyles.js";
import {
  DEFAULT_PROGRAM_ID,
  DEFAULT_PROGRAMS,
  resolveProgramFromHost,
  isPreviewHost,
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

function normalizeSingleton(data) {
  return data?.id ? data : (Array.isArray(data) ? data[0] : null);
}

function applyContentToState(content, setters) {
  setters.setPages(Array.isArray(content.pages) ? content.pages : []);
  setters.setBranding(content.branding || null);
  setters.setNavigation(content.navigation || null);
  setters.setFooters(Array.isArray(content.footers) ? content.footers : []);
  setters.setForms(Array.isArray(content.forms) ? content.forms : []);
  setters.setSettings(content.settings || null);
  setters.setPopups(Array.isArray(content.popups) ? content.popups : []);
  setters.setRedirects(Array.isArray(content.redirects) ? content.redirects : []);
  setters.setSeoGlobal(content.seoGlobal || null);
  setters.setCollections(Array.isArray(content.collections) ? content.collections : []);
  if (content.programs?.length) setters.setPrograms(content.programs);
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
  const [contentError, setContentError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

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

  const stateSetters = useMemo(() => ({
    setPrograms,
    setPages,
    setBranding,
    setNavigation,
    setFooters,
    setForms,
    setSettings,
    setPopups,
    setRedirects,
    setSeoGlobal,
    setCollections,
  }), []);

  const loadAll = useCallback(async (pid = programId) => {
    setContentError(null);
    setUsingFallback(false);

    try {
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

      const loadedPages = Array.isArray(p) ? p : [];
      setPrograms(Array.isArray(programList) && programList.length ? programList : DEFAULT_PROGRAMS);

      if (loadedPages.length === 0 || !hasPublishedHome(loadedPages)) {
        if (!cmsStore.isUsingFirebase()) {
          seedLocalStore();
          const [
            rePages, reB, reN, reF, reFm, reS, rePop, reRed, reSeo, reCol,
          ] = await Promise.all([
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
          if (Array.isArray(rePages) && rePages.length > 0) {
            setPages(rePages);
            setBranding(normalizeSingleton(reB));
            setNavigation(normalizeSingleton(reN));
            setFooters(Array.isArray(reF) ? reF : []);
            setForms(Array.isArray(reFm) ? reFm : []);
            setSettings(normalizeSingleton(reS));
            setPopups(Array.isArray(rePop) ? rePop : []);
            setRedirects(Array.isArray(reRed) ? reRed : []);
            setSeoGlobal(normalizeSingleton(reSeo));
            setCollections(Array.isArray(reCol) ? reCol : []);
            setLoading(false);
            setInitialized(true);
            return;
          }
        }

        const fallback = getProgramContentFromSeed(pid);
        applyContentToState(fallback, stateSetters);
        setUsingFallback(true);
        setLoading(false);
        setInitialized(true);
        return;
      }

      setPages(loadedPages);
      setBranding(normalizeSingleton(b));
      setNavigation(normalizeSingleton(n));
      setFooters(Array.isArray(f) ? f : []);
      setForms(Array.isArray(fm) ? fm : []);
      setSettings(normalizeSingleton(s));
      setPopups(Array.isArray(pop) ? pop : []);
      setRedirects(Array.isArray(red) ? red : []);
      setSeoGlobal(normalizeSingleton(seo));
      setCollections(Array.isArray(col) ? col : []);
    } catch (err) {
      console.error("CMS load failed, using seed content:", err);
      setContentError(err.message || "Failed to load content");
      const fallback = getProgramContentFromSeed(pid);
      applyContentToState(fallback, stateSetters);
      setUsingFallback(true);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [programId, stateSetters]);

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

  const getPageForDisplay = useCallback((slug) => {
    const published = getPublishedPage(slug);
    if (published) return published;
    if (!isPreviewHost(window.location.hostname)) return null;
    const normalized = slug === "/" || slug === "" ? "home" : slug.replace(/^\//, "");
    return pages.find((p) => p.slug === normalized) || null;
  }, [pages, getPublishedPage]);

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
    contentError,
    usingFallback,
    getPublishedPage,
    getPageForDisplay,
    getFooter,
    refresh: () => loadAll(programId),
    refreshPrograms,
    store,
  }), [
    pages, branding, navigation, footers, forms, settings, popups, redirects,
    seoGlobal, collections, programs, program, programId, setProgramId,
    isAdminMode, loading, initialized, contentError, usingFallback,
    getPublishedPage, getPageForDisplay, getFooter, loadAll, refreshPrograms, store,
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
  return brandingStylesFromBranding(branding);
}

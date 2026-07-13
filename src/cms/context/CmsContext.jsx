import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import * as cmsStore from "../store/index.js";
import { seedLocalStore } from "../store/seed.js";
import { migrateLegacyStore } from "../store/index.js";
import { getProgramContentFromSeed, clearSeedCache } from "../store/contentFallback.js";
import { ensurePublicSiteBootstrap } from "../store/productionBootstrap.js";
import { brandingStylesFromBranding } from "../core/brandingStyles.js";
import {
  DEFAULT_PROGRAM_ID,
  DEFAULT_PROGRAMS,
  resolveProgramFromHost,
  isPreviewHost,
} from "../core/programs.js";
import { LOCAL_STORE_KEY } from "../core/constants.js";
import { isValidSlug, sanitizeSlug } from "../core/validation.js";

const ACTIVE_PROGRAM_KEY = "forge_cms_active_program";

const GLOBAL_STORE_KEYS = new Set(["programs", "roles", "users"]);

const CmsContext = createContext(null);

function readStoredProgramId() {
  try {
    const stored = localStorage.getItem(ACTIVE_PROGRAM_KEY) || DEFAULT_PROGRAM_ID;
    return DEFAULT_PROGRAMS.some((p) => p.id === stored) ? stored : DEFAULT_PROGRAM_ID;
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

function mergeProgramDefaults(storedPrograms) {
  const list = Array.isArray(storedPrograms) && storedPrograms.length ? storedPrograms : DEFAULT_PROGRAMS;
  return list.map((p) => {
    const defaults = DEFAULT_PROGRAMS.find((d) => d.id === p.id);
    return defaults ? { ...defaults, ...p, name: defaults.name, shortName: defaults.shortName, description: defaults.description } : p;
  });
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
  if (content.programs?.length) setters.setPrograms(mergeProgramDefaults(content.programs));
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
  const [switchingProgram, setSwitchingProgram] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [contentError, setContentError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const loadGenerationRef = useRef(0);
  const programIdRef = useRef(programId);
  programIdRef.current = programId;

  const program = useMemo(
    () => programs.find((p) => p.id === programId) || programs[0] || DEFAULT_PROGRAMS[0],
    [programs, programId]
  );

  const setProgramId = useCallback((id) => {
    if (!id || id === programIdRef.current) return;
    if (!DEFAULT_PROGRAMS.some((p) => p.id === id)) return;
    writeStoredProgramId(id);
    setSwitchingProgram(true);
    setProgramIdState(id);
  }, []);

  const refreshPrograms = useCallback(async () => {
    const list = await cmsStore.getAll("programs");
    setPrograms(mergeProgramDefaults(list));
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

  const loadAll = useCallback(async (pid) => {
    const generation = ++loadGenerationRef.current;
    setLoading(true);

    try {
      migrateLegacyStore();

      if (!isAdminMode && !cmsStore.isUsingFirebase()) {
        await ensurePublicSiteBootstrap(pid);
      }

      const hasExistingStore = typeof window !== "undefined" && Boolean(localStorage.getItem(LOCAL_STORE_KEY));
      if (!cmsStore.isSeeded() && !hasExistingStore) {
        seedLocalStore();
        clearSeedCache();
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

      if (generation !== loadGenerationRef.current) return;

      let loadedPages = Array.isArray(p) ? p : [];

      // Auto-fix legacy invalid slugs (e.g. products/rms → products-rms).
      if (isAdminMode && loadedPages.length) {
        const fixed = [];
        for (const page of loadedPages) {
          if (page?.slug && !isValidSlug(page.slug)) {
            const nextSlug = sanitizeSlug(page.slug);
            if (nextSlug && nextSlug !== page.slug) {
              const updated = { ...page, slug: nextSlug };
              try {
                await cmsStore.save("pages", updated, "system", pid);
                fixed.push(updated);
                continue;
              } catch (err) {
                console.warn("Failed to auto-fix page slug", page.slug, err);
              }
            }
          }
          fixed.push(page);
        }
        loadedPages = fixed;
      }
      setPrograms((prev) => {
        const next = mergeProgramDefaults(programList);
        if (prev.length === next.length && prev.every((item, i) => item.id === next[i]?.id)) return prev;
        return next;
      });

      const applyLoadedContent = () => {
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
        setUsingFallback(false);
      };

      if (loadedPages.length === 0) {
        if (isAdminMode) {
          setPages([]);
          setBranding(null);
          setNavigation(null);
          setFooters([]);
          setForms([]);
          setSettings(null);
          setPopups([]);
          setRedirects([]);
          setSeoGlobal(null);
          setCollections([]);
          setUsingFallback(false);
        } else {
          const bootstrapSlice = await ensurePublicSiteBootstrap(pid);
          const fallback = bootstrapSlice?.pages?.length
            ? bootstrapSlice
            : getProgramContentFromSeed(pid);
          applyContentToState(fallback, stateSetters);
          setUsingFallback(true);
        }
      } else {
        applyLoadedContent();
      }
      setContentError(null);
    } catch (err) {
      if (generation !== loadGenerationRef.current) return;
      console.error("CMS load failed, using seed content:", err);
      setContentError(err.message || "Failed to load content");
      if (!isAdminMode) {
        const bootstrapSlice = await ensurePublicSiteBootstrap(pid);
        const fallback = bootstrapSlice?.pages?.length
          ? bootstrapSlice
          : getProgramContentFromSeed(pid);
        applyContentToState(fallback, stateSetters);
        setUsingFallback(true);
      }
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
        setSwitchingProgram(false);
        setInitialized(true);
      }
    }
  }, [stateSetters, isAdminMode]);

  useEffect(() => {
    if (isAdminMode) return;
    const resolved = resolveProgramFromHost(window.location.hostname, DEFAULT_PROGRAMS);
    if (resolved.id !== programId) setProgramIdState(resolved.id);
  }, [isAdminMode, programId]);

  useEffect(() => {
    loadAll(programId);
  }, [programId, loadAll]);

  useEffect(() => {
    let timer;
    const onStoreChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        loadAll(programIdRef.current);
      }, 300);
    };
    window.addEventListener("cms-store-changed", onStoreChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("cms-store-changed", onStoreChange);
    };
  }, [loadAll]);

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
    switchingProgram,
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
    isAdminMode, loading, switchingProgram, initialized, contentError, usingFallback,
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

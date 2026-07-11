import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import * as cmsStore from "../store/index.js";
import { seedLocalStore } from "../store/seed.js";
import { isSeeded } from "../store/index.js";

const CmsContext = createContext(null);

export function CmsProvider({ children }) {
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

  const loadAll = useCallback(async () => {
    if (!cmsStore.isSeeded()) {
      seedLocalStore();
    }
    const [p, b, n, f, fm, s, pop, red, seo, col] = await Promise.all([
      cmsStore.getAll("pages"),
      cmsStore.getAll("branding"),
      cmsStore.getAll("navigation"),
      cmsStore.getAll("footers"),
      cmsStore.getAll("forms"),
      cmsStore.getAll("settings"),
      cmsStore.getAll("popups"),
      cmsStore.getAll("redirects"),
      cmsStore.getAll("seoGlobal"),
      cmsStore.getAll("collections"),
    ]);
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
  }, []);

  useEffect(() => {
    loadAll();
    const unsubs = [
      cmsStore.subscribe("pages", (data) => setPages(data)),
    ];
    const onStoreChange = () => loadAll();
    window.addEventListener("cms-store-changed", onStoreChange);
    return () => {
      unsubs.forEach((u) => u());
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

  const getFooter = useCallback((footerId = "default") => {
    return footers.find((f) => f.id === footerId) || footers[0] || null;
  }, [footers]);

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
    loading,
    initialized,
    getPublishedPage,
    getFooter,
    refresh: loadAll,
    store: cmsStore,
  }), [pages, branding, navigation, footers, forms, settings, popups, redirects, seoGlobal, collections, loading, initialized, getPublishedPage, getFooter, loadAll]);

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

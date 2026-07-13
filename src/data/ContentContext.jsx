import { createContext, useContext, useMemo } from "react";
import { content as staticContent } from "./loadContent.js";
import { useCms } from "../cms/context/CmsContext.jsx";

const ContentContext = createContext(staticContent);

export const useContent = () => useContext(ContentContext);

function findPublishedPage(pages, slug, programId) {
  return (pages || []).find(
    (p) => p.slug === slug && p.status === "published" && (!programId || p.programId === programId)
  ) || null;
}

function findHeroContent(page) {
  for (const section of page?.sections || []) {
    for (const block of section.blocks || []) {
      if (block.type === "hero" && block.content) return block.content;
    }
  }
  return null;
}

function findImageContent(page) {
  for (const section of page?.sections || []) {
    for (const block of section.blocks || []) {
      if (block.type === "image" && block.content?.src) return block.content;
    }
  }
  return null;
}

function mergeCmsNavigation(baseNav, cmsNav) {
  if (!cmsNav) return baseNav;
  const main = (cmsNav.mainMenu || []).map((item) => ({
    label: item.label,
    href: item.href,
    children: (item.children || []).map((child) => ({
      label: child.label,
      href: child.href,
    })),
  }));
  if (!main.length) return baseNav;
  const ctaLabel = cmsNav.headerButtons?.[0]?.label || baseNav.ctaLabel;
  const ctaHref = cmsNav.headerButtons?.[0]?.href || baseNav.ctaHref || "/contact";
  return {
    ...baseNav,
    main,
    ctaLabel,
    ctaHref,
  };
}

function mergeProductLinesFromCms(productLines, pages, programId) {
  if (!productLines) return productLines;
  const next = { ...productLines };
  Object.keys(next).forEach((slug) => {
    const page = findPublishedPage(pages, `products/${slug}`, programId);
    if (!page) return;
    const hero = findHeroContent(page);
    const image = findImageContent(page);
    next[slug] = {
      ...next[slug],
      emblem: image?.src || next[slug].emblem,
      hero: hero
        ? {
            ...next[slug].hero,
            eyebrow: hero.eyebrow ?? next[slug].hero?.eyebrow,
            title: hero.title ?? next[slug].hero?.title,
            lead: hero.lead ?? next[slug].hero?.lead,
            body: hero.body ?? next[slug].hero?.body,
          }
        : next[slug].hero,
    };
  });
  return next;
}

/** Overlay CMS edits onto static marketing content so admin saves show on the public site. */
export function mergeMarketingContent(base, pages, programId, cmsNavigation) {
  const homePage = findPublishedPage(pages, "home", programId);
  const hero = findHeroContent(homePage);

  return {
    ...base,
    images: {
      ...base.images,
      hero: hero?.backgroundImage || base.images?.hero,
    },
    home: hero
      ? {
          ...base.home,
          heroEyebrow: hero.eyebrow ?? base.home?.heroEyebrow,
          heroTitle: hero.title ?? base.home?.heroTitle,
          heroLead: hero.lead ?? base.home?.heroLead,
          heroBody: hero.body ?? base.home?.heroBody,
          heroBullets: Array.isArray(hero.bullets) && hero.bullets.length
            ? hero.bullets
            : base.home?.heroBullets,
        }
      : base.home,
    navigation: mergeCmsNavigation(base.navigation, cmsNavigation),
    productLines: mergeProductLinesFromCms(base.productLines, pages, programId),
  };
}

export function MarketingContentProvider({ children }) {
  const { pages, programId, navigation } = useCms();
  const value = useMemo(
    () => mergeMarketingContent(staticContent, pages, programId, navigation),
    [pages, programId, navigation]
  );
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

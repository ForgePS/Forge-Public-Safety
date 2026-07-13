import { createContext, useContext, useMemo } from "react";
import { content as staticContent } from "./loadContent.js";
import { useCms } from "../cms/context/CmsContext.jsx";

const ContentContext = createContext(staticContent);

export const useContent = () => useContext(ContentContext);

function findHeroContent(pages, programId) {
  const home = (pages || []).find(
    (p) => p.slug === "home" && p.status === "published" && (!programId || p.programId === programId)
  );
  if (!home) return null;
  for (const section of home.sections || []) {
    for (const block of section.blocks || []) {
      if (block.type === "hero" && block.content) return block.content;
    }
  }
  return null;
}

/** Overlay CMS home/hero edits onto the static marketing content so Live View saves show on the public site. */
export function mergeMarketingContent(base, pages, programId) {
  const hero = findHeroContent(pages, programId);
  if (!hero) return base;

  return {
    ...base,
    images: {
      ...base.images,
      hero: hero.backgroundImage || base.images?.hero,
    },
    home: {
      ...base.home,
      heroEyebrow: hero.eyebrow ?? base.home?.heroEyebrow,
      heroTitle: hero.title ?? base.home?.heroTitle,
      heroLead: hero.lead ?? base.home?.heroLead,
      heroBody: hero.body ?? base.home?.heroBody,
      heroBullets: Array.isArray(hero.bullets) && hero.bullets.length ? hero.bullets : base.home?.heroBullets,
    },
  };
}

export function MarketingContentProvider({ children }) {
  const { pages, programId } = useCms();
  const value = useMemo(
    () => mergeMarketingContent(staticContent, pages, programId),
    [pages, programId]
  );
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

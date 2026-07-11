import { useEffect } from "react";
import { useCms } from "../context/CmsContext.jsx";

export default function SeoHead({ page }) {
  const { branding, seoGlobal } = useCms();
  const seo = page?.seo || {};
  const siteName = branding?.companyName || seoGlobal?.defaultTitle || "Website";

  const title = seo.title || page?.title || siteName;
  const description = seo.description || seoGlobal?.defaultDescription || "";
  const socialTitle = seo.socialTitle || title;
  const socialDescription = seo.socialDescription || description;
  const socialImage = seo.socialImage || branding?.logos?.primary || "";
  const robots = `${seo.index !== false ? "index" : "noindex"}, ${seo.follow !== false ? "follow" : "nofollow"}`;

  useEffect(() => {
    document.title = title;

    const setMeta = (name, content, property = false) => {
      if (!content) return;
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("robots", robots);
    setMeta("og:title", socialTitle, true);
    setMeta("og:description", socialDescription, true);
    setMeta("og:type", seo.ogType || "website", true);
    setMeta("og:image", socialImage, true);
    setMeta("twitter:card", seo.twitterCard || "summary_large_image");
    setMeta("twitter:title", socialTitle);
    setMeta("twitter:description", socialDescription);
    setMeta("twitter:image", socialImage);

    if (seo.canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = seo.canonicalUrl;
    }

    if (seo.structuredData) {
      let script = document.querySelector('script[data-cms-structured-data]');
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-cms-structured-data", "true");
        document.head.appendChild(script);
      }
      script.textContent = seo.structuredData;
    }
  }, [title, description, socialTitle, socialDescription, socialImage, robots, seo]);

  return null;
}

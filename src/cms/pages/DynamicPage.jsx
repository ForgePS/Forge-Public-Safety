import { Link, useParams, Navigate } from "react-router-dom";
import { useCms, useBrandingStyles } from "../context/CmsContext.jsx";
import { PageRenderer } from "../renderer/BlockRenderer.jsx";
import SeoHead from "../components/SeoHead.jsx";
import DynamicHeader from "../components/DynamicHeader.jsx";
import DynamicFooter from "../components/DynamicFooter.jsx";
import PopupsManager from "../components/PopupsManager.jsx";
import { isPreviewHost } from "../core/programs.js";

export default function DynamicPage({ slug: propSlug }) {
  const params = useParams();
  const { getPageForDisplay, branding, forms, collections, loading, contentError, redirects, settings, pages, program } = useCms();
  const brandingStyles = useBrandingStyles();

  const slug = propSlug || params.slug || "home";
  const page = getPageForDisplay(slug);
  const isDraftPreview = page && page.status !== "published" && isPreviewHost(window.location.hostname);

  const redirect = redirects?.find((r) => r.enabled && r.from === `/${slug}`);
  if (redirect) return <Navigate to={redirect.to} replace />;

  if (settings?.maintenance?.enabled && !window.location.pathname.startsWith("/admin")) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8" style={brandingStyles}>
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-black text-white mb-4">Maintenance Mode</h1>
          <p className="text-[#94A3B8]">{settings.maintenance.message}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-[#64748B] mb-4">Loading website...</div>
          {contentError && (
            <p className="text-sm text-yellow-400 max-w-md px-4">{contentError}</p>
          )}
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-black" style={brandingStyles}>
        <DynamicHeader />
        <main className="py-32 px-6 text-center max-w-xl mx-auto">
          <h1 className="text-6xl font-black text-white mb-4">404</h1>
          <p className="text-[#94A3B8] mb-6">
            {pages.length === 0
              ? "No website content is loaded yet for this program."
              : "This page was not found or is not published yet."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/admin" className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold bg-[#F97316] text-white hover:bg-[#ea580c]">
              Open Admin to publish content
            </Link>
            <Link to="/admin/pages" className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold border border-[#1E293B] text-white hover:bg-white/5">
              Manage pages
            </Link>
          </div>
          {program && (
            <p className="text-xs text-[#64748B] mt-6">Program: {program.name}</p>
          )}
        </main>
        <DynamicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={brandingStyles}>
      <SeoHead page={page} />
      {isDraftPreview && (
        <div className="bg-yellow-500/15 border-b border-yellow-500/30 text-yellow-200 text-center text-sm py-2 px-4">
          Draft preview — this page is not published yet. <Link to="/admin/pages" className="underline font-bold">Publish in admin</Link>
        </div>
      )}
      <DynamicHeader />
      <main>
        <PageRenderer page={page} branding={branding} forms={forms} collections={collections} />
      </main>
      <DynamicFooter footerId={page.footerId} />
      <PopupsManager />
      {branding?.customCss && <style>{branding.customCss}</style>}
      {page.customCss && <style>{page.customCss}</style>}
    </div>
  );
}

export function CmsLayout({ children }) {
  const brandingStyles = useBrandingStyles();
  const { branding } = useCms();

  return (
    <div className="min-h-screen bg-black text-white" style={brandingStyles}>
      <DynamicHeader />
      <main>{children}</main>
      <DynamicFooter />
      <PopupsManager />
      {branding?.customCss && <style>{branding.customCss}</style>}
    </div>
  );
}

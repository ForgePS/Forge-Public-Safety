import { Monitor, Tablet, Smartphone, Radio } from "lucide-react";
import { useState } from "react";
import { PageRenderer } from "../../cms/renderer/BlockRenderer.jsx";
import DynamicHeader from "../../cms/components/DynamicHeader.jsx";
import DynamicFooter from "../../cms/components/DynamicFooter.jsx";
import { brandingStylesFromBranding } from "../../cms/core/brandingStyles.js";

const BREAKPOINTS = [
  { id: "desktop", icon: Monitor, width: "100%", label: "Desktop" },
  { id: "tablet", icon: Tablet, width: "768px", label: "Tablet" },
  { id: "mobile", icon: Smartphone, width: "375px", label: "Mobile" },
];

export default function LiveSitePreview({
  branding,
  navigation,
  footer,
  page,
  forms = [],
  collections = [],
  children,
  highlight = null,
  onSectionClick,
  onSectionHover,
  className = "",
  showChrome = true,
  label = "Live Preview",
}) {
  const [breakpoint, setBreakpoint] = useState("desktop");
  const bp = BREAKPOINTS.find((b) => b.id === breakpoint) || BREAKPOINTS[0];
  const styles = brandingStylesFromBranding(branding);

  return (
    <div className={`flex flex-col h-full bg-[#0B1220] ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1E293B] bg-[#111827] shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <Radio size={14} className="text-green-400" />
          <span className="text-xs font-semibold text-white">{label}</span>
          <span className="text-[10px] text-[#64748B] uppercase tracking-wider">Updates as you edit</span>
        </div>
        <div className="flex rounded-lg border border-[#1E293B] overflow-hidden">
          {BREAKPOINTS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setBreakpoint(id)}
              title={BREAKPOINTS.find((b) => b.id === id)?.label}
              className={`p-1.5 ${breakpoint === id ? "bg-[#F97316]/15 text-[#F97316]" : "text-[#64748B] hover:text-white"}`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-[#1a1f2e]">
        <div
          className="mx-auto transition-all duration-300 shadow-2xl rounded-lg overflow-hidden border border-[#334155]"
          style={{ width: bp.width, maxWidth: "100%" }}
        >
          <div className="min-h-[400px] bg-black text-white" style={styles}>
            {showChrome && (
              <DynamicHeader navigation={navigation} branding={branding} preview />
            )}

            <main>
              {page ? (
                <InteractivePage
                  page={page}
                  branding={branding}
                  forms={forms}
                  collections={collections}
                  highlight={highlight}
                  onSectionClick={onSectionClick}
                  onSectionHover={onSectionHover}
                />
              ) : children}
            </main>

            {showChrome && footer && (
              <DynamicFooter footer={footer} branding={branding} preview />
            )}

            {branding?.customCss && <style>{branding.customCss}</style>}
            {page?.customCss && <style>{page.customCss}</style>}
          </div>
        </div>
      </div>
    </div>
  );
}

function InteractivePage({ page, branding, forms, collections, highlight, onSectionClick, onSectionHover }) {
  if (!onSectionClick) {
    return <PageRenderer page={page} branding={branding} forms={forms} collections={collections} />;
  }

  return (
    <>
      {(page.sections || []).map((section) => {
        if (section.hidden) return null;
        const isSelected = highlight === section.id;
        return (
          <div
            key={section.id}
            className={`relative group transition-all ${isSelected ? "ring-2 ring-[#F97316] ring-inset" : "hover:ring-2 hover:ring-[#F97316]/40 hover:ring-inset"}`}
            onClick={(e) => { e.stopPropagation(); onSectionClick(section.id); }}
            onMouseEnter={() => onSectionHover?.(section.id)}
            onMouseLeave={() => onSectionHover?.(null)}
          >
            <div className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-opacity pointer-events-none ${
              isSelected ? "bg-[#F97316] text-white opacity-100" : "bg-black/70 text-white opacity-0 group-hover:opacity-100"
            }`}>
              {section.blocks?.[0]?.type || "section"}
            </div>
            <PageRenderer
              page={{ ...page, sections: [section] }}
              branding={branding}
              forms={forms}
              collections={collections}
            />
          </div>
        );
      })}
    </>
  );
}

export function BrandingPreviewSample({ branding }) {
  const styles = brandingStylesFromBranding(branding);
  const c = branding?.colors || {};
  const logo = branding?.logos?.primary;

  return (
    <div className="p-8 space-y-8" style={styles}>
      <div className="flex items-center gap-4">
        {logo && <img src={logo} alt="" className="h-16 w-auto object-contain" />}
        <div>
          <h2 className="text-2xl font-black text-white" style={{ fontFamily: branding?.fonts?.heading }}>{branding?.companyName || "Company Name"}</h2>
          <p className="text-sm text-[var(--cms-text-muted,#94A3B8)]">{branding?.tagline || "Your tagline here"}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(c).slice(0, 8).map(([name, color]) => (
          <div key={name} className="rounded-xl overflow-hidden border border-[var(--cms-border,#1E293B)]">
            <div className="h-12" style={{ backgroundColor: color }} />
            <p className="text-[10px] text-[#64748B] p-2 capitalize">{name.replace(/([A-Z])/g, " $1")}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white" style={{ fontFamily: branding?.fonts?.heading }}>Heading Preview</h3>
        <p className="text-[var(--cms-text-muted,#94A3B8)]" style={{ fontFamily: branding?.fonts?.body }}>
          Body text preview — this is how your content will look across the site with your chosen fonts and colors.
        </p>
        <button type="button" className="rounded-full px-6 py-3 text-sm font-bold text-white" style={{ backgroundColor: c.primary || "#F97316" }}>
          Primary Button
        </button>
      </div>
    </div>
  );
}

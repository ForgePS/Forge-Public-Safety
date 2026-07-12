import { Link } from "react-router-dom";
import { useCms } from "../context/CmsContext.jsx";

export default function DynamicFooter({ footerId, footer: footerProp, branding: brandingProp, preview = false }) {
  const cms = useCms();
  const branding = brandingProp ?? cms.branding;
  const footer = footerProp ?? cms.getFooter(footerId);
  if (!footer) return null;

  const logo = footer.logo || branding?.logos?.primary || "/assets/forge-logo.png";
  const companyName = branding?.companyName || "Website";

  return (
    <footer className="border-t border-[var(--cms-border,#1E293B)] bg-black" style={{ backgroundColor: footer.backgroundColor, color: footer.textColor }}>
      <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8 py-16">
        <div className={`grid gap-10 md:grid-cols-2 ${footer.mobileStack !== false ? "lg:grid-cols-5" : ""}`}>
          <div className="lg:col-span-1">
            <img src={logo} alt={companyName} className="h-16 w-auto mb-4" />
            {footer.blurb && <p className="text-sm text-[#94A3B8] leading-relaxed">{footer.blurb}</p>}
          </div>

          {(footer.columns || []).map((col) => (
            <div key={col.id}>
              {col.title && <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4">{col.title}</h4>}
              {col.type === "text" ? (
                <p className="text-sm text-[#94A3B8]">{col.content}</p>
              ) : (
                <ul className="space-y-2">
                  {(col.links || []).map((link) => (
                    <li key={link.id}>
                      {preview ? (
                        <span className="text-sm text-[#94A3B8]">{link.label}</span>
                      ) : link.href?.startsWith("http") ? (
                        <a href={link.href} className="text-sm text-[#94A3B8] hover:text-white transition-colors" target={link.newTab ? "_blank" : undefined} rel="noreferrer">{link.label}</a>
                      ) : (
                        <Link to={link.href || "/"} className="text-sm text-[#94A3B8] hover:text-white transition-colors">{link.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-[#1E293B] flex flex-col md:flex-row gap-4 md:items-center md:justify-between text-sm text-[#64748B]">
          <p>{footer.copyright || `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`}</p>
          <div className="flex flex-wrap gap-4">
            {(footer.legalLinks || []).map((link) => (
              preview ? (
                <span key={link.id} className="text-[#64748B]">{link.label}</span>
              ) : (
                <Link key={link.id} to={link.href || "/"} className="hover:text-white">{link.label}</Link>
              )
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

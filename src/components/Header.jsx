import { Link } from "react-router-dom";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useContent } from "../data/ContentContext.jsx";

export default function Header() {
  const content = useContent();
  const { navigation } = content;
  const productLines = content.productLines ? Object.values(content.productLines) : [];
  const ctaHref = navigation?.ctaHref || "/contact";

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur border-b border-[#1E293B]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex h-28 items-center justify-between gap-6">
          <Link to="/" className="flex items-center shrink-0" aria-label={`${content.site.name} — Home`}>
            <img
              src={content.images.logo}
              alt={`Forge — ${content.site.tagline}`}
              className="h-20 md:h-24 w-auto object-contain"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-9" aria-label="Main navigation">
            {(navigation?.main || []).map((item) => {
              const childItems = item.children?.length
                ? item.children
                : (item.label === "Products" || item.href === "/products") && productLines.length
                  ? [
                      { label: "All Products", href: "/products" },
                      ...productLines.map((line) => ({ label: line.name, href: `/products/${line.slug}` })),
                    ]
                  : [];
              const isProducts = childItems.length > 0;

              if (!isProducts) {
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    to={item.href}
                    className="text-sm font-semibold uppercase tracking-[0.12em] text-[#94A3B8] hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <div key={`${item.href}-${item.label}`} className="relative group">
                  <Link
                    to={item.href}
                    className="flex items-center gap-1 text-sm font-semibold uppercase tracking-[0.12em] text-[#94A3B8] group-hover:text-white transition-colors"
                  >
                    {item.label}
                    <ChevronDown size={14} strokeWidth={2.5} className="mt-0.5" />
                  </Link>
                  <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-4 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
                    <div className="border border-[#1E293B] bg-[#0B1220] shadow-2xl shadow-black/50">
                      {childItems.map((child) => {
                        const line = productLines.find((p) => `/products/${p.slug}` === child.href);
                        return (
                          <Link
                            key={`${child.href}-${child.label}`}
                            to={child.href}
                            className="flex items-center gap-3 px-5 py-3 text-sm font-semibold text-[#CBD5E1] hover:text-white hover:bg-white/5 transition-colors"
                          >
                            {line?.emblem && (
                              <img src={line.emblem} alt="" className="h-8 w-8 object-contain" />
                            )}
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <Link to={ctaHref} className="btn-forge text-sm">
            {navigation?.ctaLabel || "Request Demo"}
            <ChevronRight size={15} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </header>
  );
}

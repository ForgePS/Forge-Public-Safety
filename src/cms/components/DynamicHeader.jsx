import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useCms } from "../context/CmsContext.jsx";

export default function DynamicHeader() {
  const { navigation, branding } = useCms();
  if (!navigation) return null;

  const logo = branding?.logos?.primary || "/assets/forge-logo.png";
  const companyName = branding?.companyName || "Website";
  const tagline = branding?.tagline || "";
  const primary = branding?.colors?.primary || "#F97316";
  const sticky = navigation.sticky !== false;

  return (
    <>
      {navigation.announcementBar?.enabled && (
        <div className="text-center text-sm py-2 px-4" style={{ backgroundColor: navigation.announcementBar.backgroundColor, color: navigation.announcementBar.textColor }}>
          {navigation.announcementBar.text}
          {navigation.announcementBar.link && (
            <a href={navigation.announcementBar.link} className="ml-2 underline font-bold">{navigation.announcementBar.linkLabel || "Learn more"}</a>
          )}
        </div>
      )}
      <header className={`${sticky ? "sticky top-0" : ""} z-50 bg-black border-b border-white/5`}>
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <div className="flex h-28 items-center justify-between gap-6">
            <Link to="/" className="flex items-center shrink-0" aria-label={`${companyName} — Home`}>
              <img src={logo} alt={`${companyName} — ${tagline}`} className="h-20 md:h-24 w-auto object-contain" />
            </Link>

            <nav className="hidden lg:flex items-center gap-8" aria-label="Main navigation">
              {(navigation.mainMenu || []).map((item) => (
                <NavItem key={item.id} item={item} />
              ))}
            </nav>

            <div className="flex items-center gap-4">
              {navigation.phone && <a href={`tel:${navigation.phone}`} className="hidden md:block text-sm text-[#94A3B8] hover:text-white">{navigation.phone}</a>}
              {(navigation.headerButtons || []).map((btn) => {
                const isExternal = btn.href?.startsWith("http");
                const cls = "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90";
                return isExternal ? (
                  <a key={btn.id} href={btn.href} className={cls} style={{ backgroundColor: primary }} target={btn.newTab ? "_blank" : undefined} rel="noreferrer">
                    {btn.label}<ArrowUpRight size={14} />
                  </a>
                ) : (
                  <Link key={btn.id} to={btn.href || "/contact"} className={cls} style={{ backgroundColor: primary }}>
                    {btn.label}<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15"><ArrowUpRight size={14} /></span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

function NavItem({ item }) {
  if (item.children?.length > 0) {
    return (
      <div className="relative group">
        <button className="text-base font-bold tracking-wide text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1">
          {item.label}
        </button>
        <div className="absolute top-full left-0 pt-2 hidden group-hover:block min-w-[200px]">
          <div className="rounded-xl border border-[#1E293B] bg-[#111827] py-2 shadow-xl">
            {item.children.map((child) => (
              <NavLink key={child.id} item={child} className="block px-4 py-2 text-sm text-[#94A3B8] hover:text-white hover:bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return <NavLink item={item} className="text-base font-bold tracking-wide text-[#94A3B8] hover:text-white transition-colors" />;
}

function NavLink({ item, className }) {
  if (item.href?.startsWith("http")) {
    return <a href={item.href} className={className} target={item.newTab ? "_blank" : undefined} rel="noreferrer">{item.label}</a>;
  }
  return <Link to={item.href || "/"} className={className}>{item.label}</Link>;
}

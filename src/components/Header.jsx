import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { content } from "../data/loadContent.js";

export default function Header() {
  const { navigation } = content;

  return (
    <header className="sticky top-0 z-50 bg-black border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex h-28 items-center justify-between gap-6">
          <Link to="/" className="flex items-center shrink-0" aria-label={`${content.site.name} — Home`}>
            <img
              src="/assets/forge-logo.png"
              alt={`Forge — ${content.site.tagline}`}
              className="h-20 md:h-24 w-auto object-contain"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-8" aria-label="Main navigation">
            {navigation.main.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="text-base font-bold tracking-wide text-[#94A3B8] hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#ea580c] transition-colors"
          >
            {navigation.ctaLabel}
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
              <ArrowUpRight size={14} />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

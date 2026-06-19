import { Link } from "react-router-dom";
import { content } from "../data/loadContent.js";

export default function Footer() {
  return (
    <footer className="border-t border-[#1E293B] bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <img src="/assets/forge-logo.png" alt={content.site.name} className="h-16 w-auto mb-4" />
            <p className="text-sm text-[#94A3B8] leading-relaxed">{content.site.footerBlurb}</p>
          </div>

          {Object.entries(content.footerColumns).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-[#94A3B8] hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-[#1E293B] flex flex-col md:flex-row gap-4 md:items-center md:justify-between text-sm text-[#64748B]">
          <p>© {new Date().getFullYear()} {content.site.name}. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
            <Link to="/security" className="hover:text-white">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

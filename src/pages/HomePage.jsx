import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import CtaButton, { SectionHeading } from "../components/CtaButton.jsx";
import { content, productHref } from "../data/loadContent.js";

export default function HomePage() {
  const { home, site } = content;
  const heroImage = content.images?.hero || "/assets/uploads/hero-three-responders.png";

  return (
    <>
      <section className="relative overflow-hidden bg-[#0B1220]">
        <div className="absolute inset-0">
          <img src={heroImage} alt="" className="h-full w-full object-cover object-center opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F97316] mb-4">{home.heroEyebrow}</p>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.05] mb-6">{home.heroTitle}</h1>
            <p className="text-xl text-[#CBD5E1] mb-4 leading-relaxed">{home.heroLead}</p>
            <p className="text-base text-[#94A3B8] mb-8 leading-relaxed">{home.heroBody}</p>
            <div className="flex flex-wrap gap-4">
              <CtaButton to="/contact">{content.navigation.ctaLabel}</CtaButton>
              <Link to="/products" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors">
                Learn More
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-6 text-sm font-medium text-[#94A3B8]">
              {home.heroBullets.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>
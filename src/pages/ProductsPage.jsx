import { Link } from "react-router-dom";
import { ChevronRight, Check } from "lucide-react";
import CtaButton, { SectionHeading } from "../components/CtaButton.jsx";
import { useContent } from "../data/ContentContext.jsx";

export default function ProductsPage() {
  const content = useContent();
  const { productLinesOverview: overview, productLines, sharedPlatform: shared, ui } = content;
  const lines = productLines ? Object.values(productLines) : [];

  return (
    <div className="bg-black">
      {/* HERO */}
      <section className="bg-[#0B1220] border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-24">
          <SectionHeading
            eyebrow={overview.heroEyebrow}
            title={overview.heroTitle}
            description={overview.heroDescription}
          />
        </div>
      </section>

      <div className="hazard-stripe" />

      {/* PRODUCT LINES */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid gap-6 md:grid-cols-3">
          {lines.map((line) => (
            <Link key={line.slug} to={`/products/${line.slug}`} className="group metal-frame clip-chamfer block h-full">
              <article className="metal-inner clip-chamfer h-full p-8 flex flex-col items-center text-center">
                {line.emblem && (
                  <div className="h-28 flex items-center justify-center mb-5">
                    <img src={line.emblem} alt={line.name} className="h-24 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
                  </div>
                )}
                <h3 className="text-2xl font-bold text-white mb-1">{line.name}</h3>
                <p className="text-sm font-semibold text-[#F97316] mb-4 normal-case">{line.hero.eyebrow}</p>
                <p className="text-[#94A3B8] leading-relaxed mb-6 normal-case">{line.hero.lead}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-white group-hover:text-[#F97316] transition-colors">
                  Explore {line.name}
                  <ChevronRight size={15} strokeWidth={2.5} />
                </span>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* SHARED PLATFORM */}
      {shared && (
        <section className="py-24 bg-[#0B1220] border-t border-[#1E293B]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <SectionHeading eyebrow={shared.eyebrow} title={shared.title} description={shared.description} />
            <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shared.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 border border-[#1E293B] bg-[#111827] px-4 py-3 text-[#CBD5E1] normal-case">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center clip-chamfer-sm bg-[#F97316]/15 text-[#F97316]">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* CLOSING CTA */}
      <div className="hazard-stripe" />
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <SectionHeading align="center" title="Find Your Forge" description="Not sure which product fits? Tell us about your team and we'll point you to the right starting package." />
          <div className="mt-8 flex justify-center">
            <CtaButton to="/contact">{ui.requestDemoLabel}</CtaButton>
          </div>
        </div>
      </section>
    </div>
  );
}

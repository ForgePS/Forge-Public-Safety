import { Navigate, useParams, Link } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import CtaButton, { SectionHeading } from "../components/CtaButton.jsx";
import { useContent } from "../data/ContentContext.jsx";

export default function ProductLinePage() {
  const { slug } = useParams();
  const content = useContent();
  const line = content.productLines?.[slug];
  const shared = content.sharedPlatform;
  const { ui, site } = content;

  if (!line) return <Navigate to="/products" replace />;

  return (
    <div className="bg-black">
      {/* HERO */}
      <section className="relative overflow-hidden bg-[#0B1220] border-b border-[#1E293B]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#F97316]/10 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28 grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] uppercase text-[#F97316] mb-5 eyebrow-tick">{line.hero.eyebrow}</p>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-chrome leading-[1.03] mb-6">{line.hero.title}</h1>
            <p className="text-xl text-[#E2E8F0] leading-relaxed mb-4">{line.hero.lead}</p>
            <p className="text-base text-[#94A3B8] leading-relaxed mb-9 normal-case">{line.hero.body}</p>
            <div className="flex flex-wrap gap-4">
              <CtaButton to="/contact">{ui.requestDemoLabel}</CtaButton>
              <CtaButton to="/products" variant="ghost">All Products</CtaButton>
            </div>
          </div>
          {line.emblem && (
            <div className="hidden lg:flex justify-center items-center">
              <img
                src={line.emblem}
                alt={line.name}
                className="max-h-[28rem] xl:max-h-[32rem] w-auto object-contain drop-shadow-[0_20px_60px_rgba(249,115,22,0.35)]"
              />
            </div>
          )}
        </div>
      </section>

      <div className="hazard-stripe" />

      {/* WHO IT'S BUILT FOR */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-start">
          <SectionHeading eyebrow="Who it's for" title={line.whoForTitle} />
          <ul className="grid sm:grid-cols-2 gap-4">
            {line.whoFor.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[#CBD5E1] normal-case">
                <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center clip-chamfer-sm bg-[#F97316]/15 text-[#F97316]">
                  <Check size={13} strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CORE PACKAGE */}
      <section className="py-24 bg-[#0B1220]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={line.core.eyebrow} title={line.core.title} description={line.core.description} />
          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {line.core.features.map((feature) => (
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

      {/* MODULES */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={line.modulesEyebrow} title={line.modulesTitle} description={line.modulesDescription} />

          {line.modulePackages ? (
            <div className="mt-14 space-y-16">
              {line.modulePackages.map((pkg, i) => (
                <div key={pkg.name}>
                  <div className="flex items-center gap-4 mb-7">
                    <span className="inline-flex h-9 min-w-9 items-center justify-center clip-chamfer-sm bg-[#F97316] px-2.5 text-sm font-bold text-black">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-2xl font-bold uppercase tracking-tight text-white leading-none">{pkg.name}</h3>
                      {pkg.description && <p className="mt-1.5 text-sm text-[#94A3B8] normal-case">{pkg.description}</p>}
                    </div>
                  </div>
                  <div className="hazard-stripe mb-7 opacity-60" />
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {pkg.modules.map((module) => (
                      <ModuleCard key={module.name} module={module} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {line.modules.map((module) => (
                <ModuleCard key={module.name} module={module} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SPOTLIGHT */}
      {line.spotlight && (
        <>
          <div className="hazard-stripe" />
          <section className="py-24 bg-[#0B1220]">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-start">
              <SectionHeading eyebrow={line.spotlight.eyebrow} title={line.spotlight.title} description={line.spotlight.description} />
              <div>
                <ul className="space-y-4">
                  {line.spotlight.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-[#CBD5E1] normal-case">
                      <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center clip-chamfer-sm bg-[#F97316]/15 text-[#F97316]">
                        <Check size={13} strokeWidth={3} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
                {line.spotlight.quote && (
                  <blockquote className="mt-8 border-l-2 border-[#F97316] pl-5 text-lg italic text-[#E2E8F0] normal-case">
                    “{line.spotlight.quote}”
                    {line.spotlight.quoteAuthor && (
                      <footer className="mt-3 text-sm not-italic font-semibold text-[#94A3B8]">— {line.spotlight.quoteAuthor}</footer>
                    )}
                  </blockquote>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* SHARED PLATFORM */}
      {shared && (
        <section className="py-24 bg-black border-t border-[#1E293B]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <SectionHeading eyebrow={shared.eyebrow} title={shared.title} description={shared.description} />
            <div className="mt-12 flex flex-wrap gap-3">
              {shared.features.map((feature) => (
                <span key={feature} className="border border-[#1E293B] bg-[#111827] px-4 py-2 text-sm text-[#94A3B8] normal-case">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CLOSING CTA */}
      <div className="hazard-stripe" />
      <section className="py-24 bg-[#0B1220]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <SectionHeading align="center" title={`See ${line.name} In Action`} description="Simple to use. Modular by need. Affordable for small and mid-size organizations. See how it fits your team." />
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <CtaButton to="/contact">{ui.requestDemoLabel}</CtaButton>
            {slug === "rms" && site?.rmsUrl && (
              <CtaButton to={site.rmsUrl} external variant="ghost">{ui.exploreRmsLabel}</CtaButton>
            )}
          </div>
          <p className="mt-8 text-sm text-[#64748B] normal-case">{site?.pricingNote}</p>
        </div>
      </section>
    </div>
  );
}

function ModuleCard({ module }) {
  return (
    <div className="metal-frame clip-chamfer h-full">
      <article className="metal-inner clip-chamfer h-full p-7 flex flex-col">
        <h3 className="text-xl font-bold text-white mb-1">{module.name}</h3>
        {module.tag && <p className="text-sm font-semibold text-[#F97316] mb-3 normal-case">{module.tag}</p>}
        {module.description && <p className="text-sm text-[#94A3B8] leading-relaxed normal-case">{module.description}</p>}
        {module.features && (
          <>
            <p className="mt-5 mb-2.5 text-[11px] font-semibold tracking-[0.22em] uppercase text-[#64748B]">Includes</p>
            <ul className="space-y-2">
              {module.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-[#94A3B8] normal-case">
                  <span className="mt-[7px] inline-block h-1.5 w-1.5 rotate-45 bg-[#F97316] shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
    </div>
  );
}

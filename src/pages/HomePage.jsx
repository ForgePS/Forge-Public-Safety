import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import {
  ClipboardList,
  Users,
  GraduationCap,
  ShieldCheck,
  Truck,
  BarChart3,
  Radio,
  Map,
  HeartPulse,
  Command,
  Smartphone,
  Flame,
} from "lucide-react";
import CtaButton, { SectionHeading } from "../components/CtaButton.jsx";
import { productHref } from "../data/loadContent.js";
import { useContent } from "../data/ContentContext.jsx";

const PRODUCT_ICONS = {
  "forge-rms": ClipboardList,
  personnel: Users,
  training: GraduationCap,
  prevention: ShieldCheck,
  fleet: Truck,
  analytics: BarChart3,
  command: Radio,
};

const MODULE_ICONS = {
  "Forge Operations": Map,
  "Forge Prevention": ShieldCheck,
  "Forge EMS": HeartPulse,
  "Forge Command": Command,
  "Forge Mobile": Smartphone,
};

const PRODUCT_EMBLEMS = [
  { name: "Forge RMS", src: "/assets/uploads/forge-rms.png", href: "/products/rms" },
  { name: "Forge Industrial Safety", src: "/assets/uploads/forge-industrial-safety.png", href: "/products/industrial-safety" },
  { name: "Forge Academy", src: "/assets/uploads/forge-academy.png", href: "/products/academy" },
];

function CardIcon({ icon: Icon }) {
  return (
    <span className="inline-flex h-14 w-14 items-center justify-center clip-chamfer-sm border border-[#F97316]/40 bg-[#F97316]/10 text-[#F97316] mb-5">
      <Icon size={26} strokeWidth={1.75} />
    </span>
  );
}

export default function HomePage() {
  const content = useContent();
  const { home, site, ui } = content;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-black">
        <div className="absolute inset-0">
          <img src={content.images.hero} alt="" className="h-full w-full object-cover object-[right_top]" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.72) 26%, rgba(0,0,0,0.38) 50%, rgba(0,0,0,0.12) 100%)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-28 md:py-40">
          <div className="max-w-2xl">
            <p
              className="text-xs font-semibold tracking-[0.28em] uppercase text-[#F97316] mb-5 eyebrow-tick"
            >
              {home.heroEyebrow}
            </p>
            <h1
              className="text-5xl md:text-7xl font-bold tracking-tight text-chrome leading-[1.02] mb-6"
            >
              {home.heroTitle}
            </h1>
            <p
              className="text-xl text-[#E2E8F0] mb-4 leading-relaxed"
            >
              {home.heroLead}
            </p>
            <p
              className="text-base text-[#94A3B8] mb-9 leading-relaxed"
            >
              {home.heroBody}
            </p>
            <div className="flex flex-wrap gap-4">
              <CtaButton to="/contact">{content.navigation.ctaLabel}</CtaButton>
              <CtaButton to="/products" variant="ghost">{ui.learnMoreLabel}</CtaButton>
            </div>
            <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#CBD5E1]">
              {home.heroBullets.map((item, i) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rotate-45 bg-[#F97316]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="hazard-stripe" />

      {/* MODULES */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading
            eyebrow={home.modulesEyebrow}
            title={home.modulesTitle}
            description={home.modulesDescription}
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {content.addOnModules.map((module) => {
              const Icon = MODULE_ICONS[module.name] || Flame;
              return (
                <div key={module.name} className="metal-frame clip-chamfer h-full">
                  <article className="metal-inner clip-chamfer h-full p-8">
                    <CardIcon icon={Icon} />
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#64748B] mb-2">{ui.moduleTagLabel}</p>
                    <h3 className="text-2xl font-bold text-white mb-2">{module.name}</h3>
                    <p className="text-sm font-semibold text-[#F97316] mb-3 normal-case">{module.subtitle}</p>
                    <p className="text-[#94A3B8] leading-relaxed normal-case">{module.description}</p>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="py-24 bg-[#0B1220]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading
            eyebrow={home.productsEyebrow}
            title={home.productsTitle}
            description={home.productsDescription}
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {content.productModules.map((product) => {
              const Icon = PRODUCT_ICONS[product.id] || Flame;
              return (
                <div key={product.id} id={product.id} className="metal-frame clip-chamfer h-full">
                  <article className="metal-inner clip-chamfer h-full p-8 flex flex-col">
                    <CardIcon icon={Icon} />
                    <h3 className="text-2xl font-bold text-white mb-1">{product.name}</h3>
                    <p className="text-sm font-semibold text-[#F97316] mb-3 normal-case">{product.subtitle}</p>
                    <p className="text-[#94A3B8] leading-relaxed mb-6 normal-case">{product.description}</p>
                    <div className="mt-auto">
                      {productHref(product) ? (
                        <a href={productHref(product)} className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-white hover:text-[#F97316] transition-colors" target="_blank" rel="noreferrer">
                          {ui.exploreProductPrefix} {product.name}
                          <ChevronRight size={15} strokeWidth={2.5} />
                        </a>
                      ) : (
                        <Link to="/contact" className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-white hover:text-[#F97316] transition-colors">
                          {content.navigation.ctaLabel}
                          <ChevronRight size={15} strokeWidth={2.5} />
                        </Link>
                      )}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRODUCT FAMILY EMBLEMS */}
      <section className="py-24 bg-black border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-center text-center">
            <SectionHeading
              align="center"
              eyebrow="Product family"
              title="One Family. Every Discipline."
              description="Purpose-built products for every corner of public safety — each battle-tested on its own, seamlessly connected as one."
            />
          </div>
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PRODUCT_EMBLEMS.map((emblem) => (
              <Link key={emblem.name} to={emblem.href} className="group metal-frame clip-chamfer block">
                <div className="metal-inner clip-chamfer h-full px-6 py-8 flex flex-col items-center gap-5">
                  <div className="h-28 flex items-center justify-center">
                    <img
                      src={emblem.src}
                      alt={emblem.name}
                      className="h-24 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#CBD5E1] group-hover:text-white transition-colors">{emblem.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHY FORGE */}
      <section className="py-24 bg-[#0B1220]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-start">
          <SectionHeading
            eyebrow={home.whyEyebrow}
            title={home.whyTitle}
            description={home.whyDescription}
          />
          <div className="space-y-5">
            {home.whyCards.map((item, i) => (
              <div key={item.title} className="metal-frame clip-chamfer-sm">
                <div className="metal-inner clip-chamfer-sm p-6 flex gap-5">
                  <span className="text-3xl font-bold text-[#F97316]/70 leading-none shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-[#94A3B8] leading-relaxed normal-case">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <div className="hazard-stripe" />
      <section className="py-24 bg-[#0B1220] border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <SectionHeading
            align="center"
            title={home.closingTitle}
            description={home.closingDescription}
          />
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <CtaButton to="/contact">{ui.requestDemoLabel}</CtaButton>
            <CtaButton to={site.rmsUrl} external variant="ghost">{ui.exploreRmsLabel}</CtaButton>
          </div>
          <p className="mt-8 text-sm text-[#64748B] normal-case">{site.pricingNote}</p>
        </div>
      </section>
    </>
  );
}

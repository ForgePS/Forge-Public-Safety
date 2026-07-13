import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import CtaButton, { SectionHeading } from "../components/CtaButton.jsx";
import { content, productHref } from "../data/loadContent.js";

function ProductLineCard({ line }) {
  return (
    <Link
      to={line.href || "/solutions"}
      className="group relative block overflow-hidden rounded-[28px] border border-[#1E293B] bg-[#111827] hover:border-[#F97316]/40 transition-colors"
    >
      <div className="aspect-[3/4] w-full overflow-hidden bg-gradient-to-b from-[#1E293B] to-[#0B1220]">
        {line.image ? (
          <img
            src={line.image}
            alt={line.title}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#F97316] mb-1">{line.subtitle}</p>
        <h3 className="text-2xl font-black text-white">{line.title}</h3>
        <p className="mt-2 text-sm text-[#CBD5E1] leading-relaxed line-clamp-3">{line.description}</p>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { home, site, productLines } = content;
  const lines = productLines?.lines || [];

  return (
    <>
      <section className="relative overflow-hidden bg-[#0B1220]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-10 pb-16 md:pt-14 md:pb-20">
          {lines.length > 0 && (
            <div className="grid gap-5 md:grid-cols-3 mb-12 md:mb-16">
              {lines.map((line) => (
                <ProductLineCard key={line.id} line={line} />
              ))}
            </div>
          )}

          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F97316] mb-4">{home.heroEyebrow}</p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.05] mb-6">{home.heroTitle}</h1>
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

      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={home.modulesEyebrow} title={home.modulesTitle} description={home.modulesDescription} />
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {content.addOnModules.map((module) => (
              <article key={module.name} className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8 hover:-translate-y-1 transition-transform">
                <p className="text-xs uppercase tracking-wider text-[#475569] mb-2">Module</p>
                <h3 className="text-2xl font-bold text-white mb-2">{module.name}</h3>
                <p className="text-sm font-medium text-[#F97316] mb-3">{module.subtitle}</p>
                <p className="text-[#94A3B8] leading-relaxed">{module.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#0B1220]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={home.productsEyebrow} title={home.productsTitle} description={home.productsDescription} />
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {content.productModules.map((product) => (
              <article key={product.id} id={product.id} className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8">
                <h3 className="text-2xl font-bold text-white mb-1">{product.name}</h3>
                <p className="text-sm font-medium text-[#F97316] mb-3">{product.subtitle}</p>
                <p className="text-[#94A3B8] leading-relaxed mb-6">{product.description}</p>
                {productHref(product) ? (
                  <a href={productHref(product)} className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-[#F97316]" target="_blank" rel="noreferrer">
                    Explore {product.name}
                    <ArrowUpRight size={14} />
                  </a>
                ) : (
                  <Link to="/contact" className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-[#F97316]">
                    {content.navigation.ctaLabel}
                    <ArrowUpRight size={14} />
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <SectionHeading eyebrow={home.whyEyebrow} title={home.whyTitle} description={home.whyDescription} />
          <div className="space-y-6">
            {home.whyCards.map((item) => (
              <div key={item.title} className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6">
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-[#94A3B8] leading-relaxed">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#0B1220] border-y border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <SectionHeading align="center" title={home.closingTitle} description={home.closingDescription} />
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <CtaButton to="/contact">Request a Demo</CtaButton>
            <CtaButton to={site.rmsUrl} external>Explore Forge RMS</CtaButton>
          </div>
          <p className="mt-8 text-sm text-[#64748B]">{site.pricingNote}</p>
        </div>
      </section>
    </>
  );
}

import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import CtaButton, { SectionHeading } from "../components/CtaButton.jsx";
import { content, productHref } from "../data/loadContent.js";

export default function ProductsPage() {
  const { products } = content;

  return (
    <div className="bg-black">
      <section className="py-20 bg-[#0B1220] border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={products.heroEyebrow} title={products.heroTitle} description={products.heroDescription} />
          <div className="mt-8 flex flex-wrap gap-4">
            <CtaButton to="/contact">{content.navigation.ctaLabel}</CtaButton>
            <Link to="/contact" className="inline-flex items-center gap-2 text-sm font-bold text-[#F97316]">
              {products.heroSecondaryLink}
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={products.baseEyebrow} title={products.baseTitle} description={products.baseDescription} />
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {content.basePackageFeatures.map((feature) => (
              <li key={feature} className="rounded-2xl border border-[#1E293B] bg-[#111827] px-5 py-4 text-[#CBD5E1]">{feature}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-20 bg-[#0B1220]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={products.addonsEyebrow} title={products.addonsTitle} description={products.addonsDescription} />
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {content.addOnModules.map((module) => (
              <article key={module.name} className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8">
                <h3 className="text-2xl font-bold text-white mb-2">{module.name}</h3>
                <p className="text-sm font-medium text-[#F97316] mb-3">{module.subtitle}</p>
                <p className="text-[#94A3B8] leading-relaxed">{module.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading title={products.coreTitle} description={products.coreDescription} />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {content.productModules.map((product) => (
              <article key={product.id} id={product.id} className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8">
                <h3 className="text-2xl font-bold text-white mb-1">{product.name}</h3>
                <p className="text-sm font-medium text-[#F97316] mb-3">{product.subtitle}</p>
                <p className="text-[#94A3B8] leading-relaxed mb-6">{product.description}</p>
                {productHref(product) ? (
                  <a href={productHref(product)} className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-[#F97316]" target="_blank" rel="noreferrer">
                    Open live platform
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
          <div className="mt-12 text-center">
            <CtaButton to="/contact">Request a Demo</CtaButton>
          </div>
        </div>
      </section>
    </div>
  );
}

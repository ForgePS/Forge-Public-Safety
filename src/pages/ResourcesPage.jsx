import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import CtaButton, { SectionHeading } from "../components/CtaButton.jsx";
import { content } from "../data/loadContent.js";

export default function ResourcesPage() {
  const { resources } = content;

  return (
    <div className="bg-black">
      <section className="py-20 bg-[#0B1220] border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={resources.eyebrow} title={resources.title} description={resources.description} />
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid gap-6 md:grid-cols-3">
          {resources.cards.map((card) => (
            <article key={card.title} className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8">
              <h2 className="text-2xl font-bold text-white mb-3">{card.title}</h2>
              <p className="text-[#94A3B8] mb-6 leading-relaxed">{card.copy}</p>
              {card.linkLabel === content.navigation.ctaLabel ? (
                <CtaButton to={card.linkHref}>{card.linkLabel}</CtaButton>
              ) : card.external ? (
                <a href={card.linkHref} className="inline-flex items-center gap-2 text-sm font-bold text-[#F97316]" target="_blank" rel="noreferrer">
                  {card.linkLabel}
                  <ArrowUpRight size={14} />
                </a>
              ) : (
                <Link to={card.linkHref} className="inline-flex items-center gap-2 text-sm font-bold text-[#F97316]">
                  {card.linkLabel}
                  <ArrowUpRight size={14} />
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

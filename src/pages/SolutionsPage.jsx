import CtaButton, { SectionHeading } from "../components/CtaButton.jsx";
import { content } from "../data/loadContent.js";

export default function SolutionsPage() {
  const { solutions } = content;

  return (
    <div className="bg-black">
      <section className="py-20 bg-[#0B1220] border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={solutions.eyebrow} title={solutions.title} description={solutions.description} />
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid gap-6 md:grid-cols-2">
          {solutions.items.map((item) => (
            <article key={item.title} className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8">
              <h2 className="text-3xl font-black text-white mb-4">{item.title}</h2>
              <p className="text-[#94A3B8] leading-relaxed">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="py-20 bg-[#0B1220]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <SectionHeading align="center" title={solutions.closingTitle} description={solutions.closingDescription} />
          <div className="mt-8 flex justify-center">
            <CtaButton to="/contact">{content.navigation.ctaLabel}</CtaButton>
          </div>
        </div>
      </section>
    </div>
  );
}

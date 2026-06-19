import CtaButton, { SectionHeading } from "../components/CtaButton.jsx";
import { content } from "../data/loadContent.js";

export default function CompanyPage() {
  const { company } = content;

  return (
    <div className="bg-black">
      <section className="py-20 bg-[#0B1220] border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={company.eyebrow} title={company.title} description={company.description} />
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 space-y-6 text-[#94A3B8] text-lg leading-relaxed">
          {company.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="py-20 bg-[#0B1220]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <SectionHeading align="center" title={company.closingTitle} description={company.closingDescription} />
          <div className="mt-8 flex justify-center">
            <CtaButton to="/contact">{content.navigation.ctaLabel}</CtaButton>
          </div>
        </div>
      </section>
    </div>
  );
}

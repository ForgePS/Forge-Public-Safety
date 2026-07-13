import { Link } from "react-router-dom";
import CtaButton from "../components/CtaButton.jsx";
import { useContent } from "../data/ContentContext.jsx";

export default function NotFoundPage() {
  const content = useContent();
  const { notFound } = content;

  return (
    <section className="py-32 bg-black">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F97316] mb-4">{notFound.eyebrow}</p>
        <h1 className="text-5xl font-black text-white mb-4">{notFound.title}</h1>
        <p className="text-lg text-[#94A3B8] mb-8">
          {notFound.body}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <CtaButton to="/">{notFound.homeLabel}</CtaButton>
          <Link to="/contact" className="inline-flex items-center rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-white hover:bg-white/5">
            {notFound.contactLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

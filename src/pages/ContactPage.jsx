import DemoForm from "../components/DemoForm.jsx";
import { content } from "../data/loadContent.js";

export default function ContactPage() {
  const { contact, site } = content;

  return (
    <div className="bg-black">
      <section className="py-20 bg-[#0B1220] border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F97316] mb-4">{contact.eyebrow}</p>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-4">{contact.title}</h1>
          <p className="max-w-2xl text-lg text-[#94A3B8] leading-relaxed">{contact.description}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[1.2fr_0.8fr] gap-12">
          <DemoForm />
          <aside className="space-y-6">
            <div className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8">
              <h2 className="text-xl font-bold text-white mb-4">{contact.sidebarTitle}</h2>
              <p className="text-[#94A3B8] mb-4">{contact.sidebarBody}</p>
              <p className="text-white font-medium">{site.demoEmail}</p>
            </div>
            <blockquote className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8 text-[#CBD5E1] italic">
              "{contact.quote}"
            </blockquote>
          </aside>
        </div>
      </section>
    </div>
  );
}

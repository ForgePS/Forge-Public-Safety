import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronDown, Star } from "lucide-react";
import { sectionStyle } from "../core/responsive.js";
import CmsForm from "./CmsForm.jsx";

function sanitize(html) {
  return DOMPurify.sanitize(html || "", { ADD_TAGS: ["iframe"], ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling"] });
}

function ButtonEl({ btn, branding }) {
  const primary = branding?.colors?.primary || "#F97316";
  const styles = {
    primary: `background-color:${primary};color:${branding?.colors?.buttonText || "#fff"}`,
    outline: "border:1px solid rgba(255,255,255,0.15);color:#fff;background:transparent",
    secondary: "background:#1E293B;color:#fff",
    ghost: "color:#94A3B8;background:transparent",
  };
  const cls = `inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-colors hover:opacity-90`;
  const isExternal = btn.href?.startsWith("http");
  if (isExternal) {
    return (
      <a href={btn.href} className={cls} style={styles[btn.style] || styles.primary} target={btn.newTab ? "_blank" : undefined} rel={btn.newTab ? "noreferrer" : undefined}>
        {btn.label}<ArrowUpRight size={14} />
      </a>
    );
  }
  return <Link to={btn.href || "/"} className={cls} style={styles[btn.style] || styles.primary}>{btn.label}{btn.style !== "ghost" && <ArrowUpRight size={14} />}</Link>;
}

function SectionHeading({ eyebrow, title, description, align = "left" }) {
  const alignCls = align === "center" ? "text-center mx-auto" : align === "right" ? "text-right ml-auto" : "";
  return (
    <div className={`max-w-3xl ${alignCls}`}>
      {eyebrow && <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--cms-primary,#F97316)] mb-4">{eyebrow}</p>}
      {title && <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight mb-4">{title}</h2>}
      {description && <p className="text-lg text-[var(--cms-text-muted,#94A3B8)] leading-relaxed">{description}</p>}
    </div>
  );
}

export function BlockRenderer({ block, branding, forms, collections }) {
  if (block.hidden) return null;
  const c = block.content || {};

  switch (block.type) {
    case "hero":
      return (
        <section className="relative overflow-hidden">
          {c.backgroundImage && (
            <div className="absolute inset-0">
              <img src={c.backgroundImage} alt="" className="h-full w-full object-cover opacity-90" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />
            </div>
          )}
          <div className="relative max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8 py-24 md:py-32">
            <div className="max-w-2xl">
              {c.eyebrow && <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--cms-primary,#F97316)] mb-4">{c.eyebrow}</p>}
              {c.title && <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.05] mb-6">{c.title}</h1>}
              {c.lead && <p className="text-xl text-[#CBD5E1] mb-4 leading-relaxed">{c.lead}</p>}
              {c.body && <p className="text-base text-[#94A3B8] mb-8 leading-relaxed">{c.body}</p>}
              {c.buttons?.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {c.buttons.map((btn, i) => <ButtonEl key={i} btn={btn} branding={branding} />)}
                </div>
              )}
              {c.bullets?.length > 0 && (
                <ul className="mt-10 flex flex-wrap gap-6 text-sm font-medium text-[#94A3B8]">
                  {c.bullets.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </div>
          </div>
        </section>
      );

    case "heading":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={c.eyebrow} title={c.title} description={c.description} align={c.align} />
        </div>
      );

    case "text":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={c.eyebrow} title={c.title} align={c.align} />
          <div className="prose prose-invert max-w-3xl mt-6 text-[#94A3B8] leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitize(c.content) }} />
        </div>
      );

    case "image":
      return (
        <figure className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          {c.link ? (
            <a href={c.link}>{c.src && <img src={c.src} alt={c.alt || ""} className="rounded-2xl w-full" loading="lazy" />}</a>
          ) : (
            c.src && <img src={c.src} alt={c.alt || ""} className="rounded-2xl w-full" loading="lazy" />
          )}
          {c.caption && <figcaption className="mt-2 text-sm text-[#64748B] text-center">{c.caption}</figcaption>}
        </figure>
      );

    case "imageText":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          {c.imagePosition !== "right" && c.image && <img src={c.image} alt={c.imageAlt || ""} className="rounded-2xl w-full" loading="lazy" />}
          <div>
            <SectionHeading eyebrow={c.eyebrow} title={c.title} />
            <div className="prose prose-invert mt-4 text-[#94A3B8]" dangerouslySetInnerHTML={{ __html: sanitize(c.content) }} />
            {c.buttons?.length > 0 && <div className="mt-6 flex gap-4">{c.buttons.map((btn, i) => <ButtonEl key={i} btn={btn} branding={branding} />)}</div>}
          </div>
          {c.imagePosition === "right" && c.image && <img src={c.image} alt={c.imageAlt || ""} className="rounded-2xl w-full" loading="lazy" />}
        </div>
      );

    case "video":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          {c.url && (
            <div className="aspect-video rounded-2xl overflow-hidden bg-[#111827]">
              <iframe src={c.url} title={c.caption || "Video"} className="w-full h-full" allowFullScreen />
            </div>
          )}
          {c.caption && <p className="mt-2 text-sm text-[#64748B] text-center">{c.caption}</p>}
        </div>
      );

    case "gallery":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <div className={`grid gap-4 grid-cols-2 md:grid-cols-${c.columns || 3}`}>
            {(c.images || []).map((img, i) => (
              <img key={i} src={img.src || img} alt={img.alt || ""} className="rounded-xl w-full aspect-square object-cover" loading="lazy" />
            ))}
          </div>
        </div>
      );

    case "cardGrid":
    case "featureGrid":
    case "serviceListings":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={c.eyebrow} title={c.title} description={c.description || c.description} />
          <div className={`mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-${c.columns || 3}`}>
            {(c.cards || c.features || c.services || []).map((card, i) => (
              <article key={card.id || i} id={card.id} className="rounded-[32px] border border-[var(--cms-border,#1E293B)] bg-[#111827] p-8 hover:-translate-y-1 transition-transform">
                {card.badge && <p className="text-xs uppercase tracking-wider text-[#475569] mb-2">{card.badge}</p>}
                <h3 className="text-2xl font-bold text-white mb-2">{card.title || card.name}</h3>
                {card.subtitle && <p className="text-sm font-medium text-[var(--cms-primary,#F97316)] mb-3">{card.subtitle}</p>}
                <p className="text-[#94A3B8] leading-relaxed">{card.description || card.copy}</p>
                {card.link && (
                  <a href={card.link} className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-white hover:text-[var(--cms-primary,#F97316)]" target={card.link?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                    {card.linkLabel || "Learn More"}<ArrowUpRight size={14} />
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      );

    case "cta":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8 text-center">
          <SectionHeading eyebrow={c.eyebrow} title={c.title} description={c.description} align={c.align || "center"} />
          {c.buttons?.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {c.buttons.map((btn, i) => <ButtonEl key={i} btn={btn} branding={branding} />)}
            </div>
          )}
          {c.note && <p className="mt-8 text-sm text-[#64748B]">{c.note}</p>}
        </div>
      );

    case "testimonials":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={c.eyebrow} title={c.title} align="center" />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(c.items || []).map((item, i) => (
              <blockquote key={i} className="rounded-2xl border border-[var(--cms-border,#1E293B)] bg-[#111827] p-6">
                <p className="text-[#CBD5E1] italic mb-4">&ldquo;{item.quote}&rdquo;</p>
                <footer className="text-sm text-[#94A3B8]"><strong className="text-white">{item.author}</strong>{item.role && ` — ${item.role}`}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      );

    case "statistics":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={c.eyebrow} title={c.title} align="center" />
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {(c.stats || []).map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-4xl font-black text-[var(--cms-primary,#F97316)]">{stat.value}</p>
                <p className="text-sm text-[#94A3B8] mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "faq":
    case "accordion":
      return (
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={c.eyebrow} title={c.title} />
          <div className="mt-8 space-y-4">
            {(c.items || []).map((item, i) => (
              <details key={i} className="rounded-xl border border-[var(--cms-border,#1E293B)] bg-[#111827] group">
                <summary className="flex items-center justify-between p-4 cursor-pointer text-white font-bold">
                  {item.question || item.title}
                  <ChevronDown size={18} className="group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-[#94A3B8]">{item.answer || item.content}</div>
              </details>
            ))}
          </div>
        </div>
      );

    case "contactForm":
    case "quoteForm":
    case "newsletterForm": {
      const form = forms?.find((f) => f.id === c.formId);
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <SectionHeading eyebrow={c.eyebrow} title={c.title || c.description} description={block.type === "contactForm" ? c.description : ""} />
            {form ? <CmsForm form={form} branding={branding} compact={block.type === "newsletterForm"} buttonLabel={c.buttonLabel} /> : (
              <p className="text-[#64748B]">Form not configured. Select a form in the admin panel.</p>
            )}
          </div>
        </div>
      );
    }

    case "map":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          {c.embedUrl ? (
            <iframe src={c.embedUrl} title={c.address || "Map"} className="w-full rounded-2xl border-0" style={{ height: c.height || "400px" }} loading="lazy" />
          ) : c.address && (
            <p className="text-[#94A3B8]">{c.address}</p>
          )}
        </div>
      );

    case "embed":
    case "calendar":
      return c.url || c.embedUrl ? (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <iframe src={c.url || c.embedUrl} title="Embedded content" className="w-full rounded-2xl border-0" style={{ height: c.height || "400px" }} loading="lazy" />
        </div>
      ) : null;

    case "button":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <ButtonEl btn={c} branding={branding} />
        </div>
      );

    case "divider":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <hr style={{ borderStyle: c.style, borderColor: c.color, width: c.width }} />
        </div>
      );

    case "spacer":
      return <div style={{ height: c.height || "48px" }} aria-hidden="true" />;

    case "customHtml":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8" dangerouslySetInnerHTML={{ __html: sanitize(c.html) }} />
      );

    case "collectionGrid": {
      const col = collections?.find((col) => col.id === c.collectionId);
      const entries = col?.entries?.filter((e) => e.status === "published") || [];
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <SectionHeading eyebrow={c.eyebrow} title={c.title} description={c.description} />
          <div className={`mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-${c.columns || 3}`}>
            {entries.map((entry, i) => (
              <article key={entry.id || i} className="rounded-[32px] border border-[var(--cms-border,#1E293B)] bg-[#111827] p-8">
                <h3 className="text-xl font-bold text-white mb-2">{entry.name || entry.title}</h3>
                {entry.subtitle && <p className="text-sm text-[var(--cms-primary,#F97316)] mb-2">{entry.subtitle}</p>}
                <p className="text-[#94A3B8]">{entry.description}</p>
              </article>
            ))}
          </div>
        </div>
      );
    }

    case "reviews":
      return (
        <div className="max-w-[var(--cms-container-width,1280px)] mx-auto px-6 lg:px-8">
          <SectionHeading title={c.title} align="center" />
          <div className="mt-8 space-y-4">
            {(c.items || []).map((item, i) => (
              <div key={i} className="rounded-xl border border-[var(--cms-border,#1E293B)] bg-[#111827] p-4">
                <div className="flex gap-1 mb-2">{Array.from({ length: item.rating || 5 }).map((_, j) => <Star key={j} size={16} className="fill-[var(--cms-primary,#F97316)] text-[var(--cms-primary,#F97316)]" />)}</div>
                <p className="text-[#CBD5E1]">{item.text}</p>
                <p className="text-sm text-[#64748B] mt-2">{item.author}</p>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

export function SectionRenderer({ section, branding, forms, collections }) {
  if (section.hidden) return null;
  const style = sectionStyle(section.settings || {});
  const className = section.settings?.customClass || "";
  const id = section.settings?.customId || undefined;

  return (
    <div className={className} id={id} style={style}>
      {(section.blocks || []).map((block) => (
        <BlockRenderer key={block.id} block={block} branding={branding} forms={forms} collections={collections} />
      ))}
    </div>
  );
}

export function PageRenderer({ page, branding, forms, collections }) {
  if (!page) return null;
  return (
    <>
      {(page.sections || []).map((section) => (
        <SectionRenderer key={section.id} section={section} branding={branding} forms={forms} collections={collections} />
      ))}
    </>
  );
}

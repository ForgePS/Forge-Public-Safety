import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function CtaButton({ to, children, external = false, className = "" }) {
  const classes = `inline-flex items-center gap-2 rounded-full bg-[#F97316] px-6 py-3 text-sm font-bold text-white hover:bg-[#ea580c] transition-colors ${className}`;

  if (external) {
    return (
      <a href={to} className={classes} target="_blank" rel="noreferrer">
        {children}
        <ArrowUpRight size={16} />
      </a>
    );
  }

  return (
    <Link to={to} className={classes}>
      {children}
      <ArrowUpRight size={16} />
    </Link>
  );
}

export function SectionHeading({ eyebrow, title, description, align = "left" }) {
  const alignClass = align === "center" ? "text-center mx-auto" : "";

  return (
    <div className={`max-w-3xl ${alignClass}`}>
      {eyebrow && (
        <span className="block text-xs font-medium tracking-[0.08em] uppercase text-[#64748B] mb-3">
          {eyebrow}
        </span>
      )}
      <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight mb-4">
        {title}
      </h2>
      {description && <p className="text-lg text-[#94A3B8] leading-relaxed">{description}</p>}
    </div>
  );
}

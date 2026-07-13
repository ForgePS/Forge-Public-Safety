import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function CtaButton({ to, children, external = false, variant = "primary", className = "" }) {
  const base = variant === "ghost" ? "btn-ghost" : "btn-forge";
  const classes = `${base} ${className}`;

  const inner = (
    <>
      {children}
      <ChevronRight size={16} strokeWidth={2.5} />
    </>
  );

  if (external) {
    return (
      <a href={to} className={classes} target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  }

  return (
    <Link to={to} className={classes}>
      {inner}
    </Link>
  );
}

export function SectionHeading({ eyebrow, title, description, align = "left" }) {
  const isCenter = align === "center";
  const alignClass = isCenter ? "text-center mx-auto items-center" : "";

  return (
    <div className={`max-w-3xl flex flex-col ${alignClass}`}>
      {eyebrow && (
        <span
          className={`block text-xs font-semibold tracking-[0.18em] uppercase text-[#F97316] mb-4 ${isCenter ? "" : "eyebrow-tick"}`}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className="text-4xl md:text-5xl font-bold tracking-tight text-chrome leading-[1.05] mb-4"
      >
        {title}
      </h2>
      {description && (
        <p className="text-lg text-[#94A3B8] leading-relaxed normal-case">
          {description}
        </p>
      )}
    </div>
  );
}

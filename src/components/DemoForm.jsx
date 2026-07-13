import { useState } from "react";
import { useContent } from "../data/ContentContext.jsx";

function ToggleGroup({ label, options, value, onChange }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-bold text-white">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              value === option
                ? "border-[#F97316] bg-[#F97316]/10 text-white"
                : "border-[#1E293B] bg-[#111827] text-[#94A3B8] hover:border-[#334155]"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function DemoForm() {
  const content = useContent();
  const { site } = content;
  const form = content.contact.form;

  const initialState = {
    ...form.fields.reduce((acc, field) => ({ ...acc, [field.name]: "" }), {}),
    agencyType: "",
    agencySize: "",
    product: "",
    notes: ""
  };

  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState(initialState);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const subject = encodeURIComponent(`Forge demo request — ${values.agency || "Agency"}`);
    const body = encodeURIComponent(
      [
        ...form.fields.map((field) => `${field.label}: ${values[field.name] || ""}`),
        `${form.agencyTypeLabel}: ${values.agencyType}`,
        `${form.agencySizeLabel}: ${values.agencySize}`,
        `${form.productLabel}: ${values.product}`,
        "",
        values.notes
      ].join("\n")
    );
    window.location.href = `mailto:${site.demoEmail}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8">
        <h2 className="text-2xl font-bold text-white mb-3">{form.successTitle}</h2>
        <p className="text-[#94A3B8] leading-relaxed">
          {form.successBody} {site.demoEmail}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{form.infoHeading}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {form.fields.map((field) => (
            <label key={field.name} className="block space-y-2">
              <span className="text-sm font-medium text-[#CBD5E1]">{field.label}</span>
              <input
                type={field.name === "email" ? "email" : "text"}
                required={field.required}
                value={values[field.name]}
                onChange={(event) => update(field.name, event.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-xl border border-[#1E293B] bg-black px-4 py-3 text-white placeholder:text-[#475569] outline-none focus:border-[#F97316]"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">{form.agencyHeading}</h2>
        <ToggleGroup label={form.agencyTypeLabel} options={form.agencyTypes} value={values.agencyType} onChange={(value) => update("agencyType", value)} />
        <ToggleGroup label={form.agencySizeLabel} options={form.agencySizes} value={values.agencySize} onChange={(value) => update("agencySize", value)} />
        <ToggleGroup label={form.productLabel} options={form.productOptions} value={values.product} onChange={(value) => update("product", value)} />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#CBD5E1]">{form.notesLabel}</span>
          <textarea
            rows={4}
            value={values.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder={form.notesPlaceholder}
            className="w-full rounded-xl border border-[#1E293B] bg-black px-4 py-3 text-white placeholder:text-[#475569] outline-none focus:border-[#F97316]"
          />
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-full bg-[#F97316] px-6 py-3 text-sm font-bold text-white hover:bg-[#ea580c] transition-colors"
      >
        {form.submitLabel}
      </button>
    </form>
  );
}

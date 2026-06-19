import { useState } from "react";
import { content } from "../data/loadContent.js";

const agencyTypes = ["Fire & Rescue", "EMS / Ambulance", "Emergency Management", "Combined Fire/EMS", "Law Enforcement", "Other"];
const agencySizes = ["Under 25 personnel", "25–100 personnel", "100–500 personnel", "500+ personnel"];
const products = ["Forge RMS", "Forge Personnel", "Forge Training", "Forge Prevention", "Forge Fleet", "Forge Analytics", "Forge Command"];

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
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    title: "",
    agency: "",
    email: "",
    phone: "",
    agencyType: "",
    agencySize: "",
    product: "",
    notes: ""
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const subject = encodeURIComponent(`Forge demo request — ${form.agency || "Agency"}`);
    const body = encodeURIComponent(
      [
        `Name: ${form.firstName} ${form.lastName}`,
        `Title: ${form.title}`,
        `Agency: ${form.agency}`,
        `Email: ${form.email}`,
        `Phone: ${form.phone}`,
        `Agency type: ${form.agencyType}`,
        `Agency size: ${form.agencySize}`,
        `Product interest: ${form.product}`,
        "",
        form.notes
      ].join("\n")
    );
    window.location.href = `mailto:${content.site.demoEmail}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8">
        <h2 className="text-2xl font-bold text-white mb-3">Thanks — your email app should open now.</h2>
        <p className="text-[#94A3B8] leading-relaxed">
          Send the message to complete your demo request. If nothing opened, email us directly at {content.site.demoEmail}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Your information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["firstName", "First name", "Marcus", true],
            ["lastName", "Last name", "Webb", true],
            ["title", "Title / Role", "Fire Chief, EMS Director...", false],
            ["agency", "Agency name", "Riverside Fire Department", true],
            ["email", "Work email", "chief@riverside.gov", true],
            ["phone", "Phone (optional)", "(662) 555-0100", false]
          ].map(([field, label, placeholder, required]) => (
            <label key={field} className="block space-y-2">
              <span className="text-sm font-medium text-[#CBD5E1]">{label}</span>
              <input
                type={field === "email" ? "email" : "text"}
                required={required}
                value={form[field]}
                onChange={(event) => update(field, event.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-[#1E293B] bg-black px-4 py-3 text-white placeholder:text-[#475569] outline-none focus:border-[#F97316]"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">About your agency</h2>
        <ToggleGroup label="Agency type" options={agencyTypes} value={form.agencyType} onChange={(value) => update("agencyType", value)} />
        <ToggleGroup label="Agency size" options={agencySizes} value={form.agencySize} onChange={(value) => update("agencySize", value)} />
        <ToggleGroup label="Product interest" options={products} value={form.product} onChange={(value) => update("product", value)} />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#CBD5E1]">Anything else we should know? (optional)</span>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder="Current software pain points, timeline, specific workflows you want to see..."
            className="w-full rounded-xl border border-[#1E293B] bg-black px-4 py-3 text-white placeholder:text-[#475569] outline-none focus:border-[#F97316]"
          />
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-full bg-[#F97316] px-6 py-3 text-sm font-bold text-white hover:bg-[#ea580c] transition-colors"
      >
        Request My Demo
      </button>
    </form>
  );
}

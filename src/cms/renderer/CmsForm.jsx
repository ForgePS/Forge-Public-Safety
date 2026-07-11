import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import * as cmsStore from "../store/index.js";

export default function CmsForm({ form, branding, compact = false, buttonLabel }) {
  const [values, setValues] = useState({});
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    for (const field of form.fields) {
      if (field.required && !values[field.name]?.toString()?.trim()) {
        setError(`${field.label} is required`);
        return;
      }
    }
    setStatus("submitting");
    try {
      const submission = {
        id: `sub_${Date.now()}`,
        formId: form.id,
        data: values,
        status: "new",
        createdAt: new Date().toISOString(),
      };
      await cmsStore.save("formSubmissions", submission);
      setStatus("success");
    } catch (err) {
      setError(err.message || "Submission failed");
      setStatus("idle");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center">
        <CheckCircle className="mx-auto mb-4 text-green-400" size={32} />
        <p className="text-white font-bold">{form.settings?.confirmationMessage || "Thank you for your submission!"}</p>
      </div>
    );
  }

  const primary = branding?.colors?.primary || "#F97316";

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          placeholder="Email address"
          className="flex-1 rounded-full bg-[#111827] border border-[#1E293B] px-4 py-2 text-white"
          onChange={(e) => handleChange("email", e.target.value)}
        />
        <button type="submit" disabled={status === "submitting"} className="rounded-full px-6 py-2 text-sm font-bold text-white" style={{ backgroundColor: primary }}>
          {status === "submitting" ? <Loader2 className="animate-spin" size={16} /> : (buttonLabel || "Subscribe")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[32px] border border-[#1E293B] bg-[#111827] p-8 space-y-5">
      {form.fields.map((field) => (
        <div key={field.id}>
          <label htmlFor={field.name} className="block text-sm font-medium text-white mb-1">
            {field.label}{field.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {field.type === "textarea" ? (
            <textarea
              id={field.name}
              name={field.name}
              rows={4}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full rounded-xl bg-[#0B1220] border border-[#1E293B] px-4 py-3 text-white placeholder-[#475569] focus:outline-none focus:border-[var(--cms-primary,#F97316)]"
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          ) : field.type === "select" ? (
            <select
              id={field.name}
              name={field.name}
              required={field.required}
              className="w-full rounded-xl bg-[#0B1220] border border-[#1E293B] px-4 py-3 text-white focus:outline-none focus:border-[var(--cms-primary,#F97316)]"
              onChange={(e) => handleChange(field.name, e.target.value)}
            >
              <option value="">Select...</option>
              {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : field.type === "consent" ? (
            <label className="flex items-start gap-3 text-sm text-[#94A3B8]">
              <input type="checkbox" required={field.required} className="mt-1" onChange={(e) => handleChange(field.name, e.target.checked)} />
              {field.label}
            </label>
          ) : (
            <input
              id={field.name}
              name={field.name}
              type={field.type || "text"}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full rounded-xl bg-[#0B1220] border border-[#1E293B] px-4 py-3 text-white placeholder-[#475569] focus:outline-none focus:border-[var(--cms-primary,#F97316)]"
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          )}
        </div>
      ))}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: primary }}
      >
        {status === "submitting" ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}

import { useEffect, useState } from "react";
import {
  formatEmergencyContact,
  formatMailingAddress,
  studentSelfProfileFormFromRecord,
} from "../lib/studentProfile.js";
import { updateStudentSelfProfile, sanitizeStudentSelfProfilePatch } from "../lib/students.js";

const inputClassName =
  "w-full rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-semibold text-[var(--color-afta-muted)]">{label}</span>
      {children}
    </label>
  );
}

/**
 * @param {{
 *   student: import("../lib/students.js").StudentRecord,
 *   onSaved?: (student: import("../lib/students.js").StudentRecord) => void,
 *   onCancel?: () => void,
 * }} props
 */
export default function StudentSelfProfileForm({ student, onSaved, onCancel }) {
  const [form, setForm] = useState(() => studentSelfProfileFormFromRecord(student));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setForm(studentSelfProfileFormFromRecord(student));
  }, [student]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updateStudentSelfProfile(student.id, form);
      onSaved?.({ ...student, ...sanitizeStudentSelfProfilePatch(form) });
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const mailingPreview = formatMailingAddress({ ...student, ...form });
  const emergencyPreview = formatEmergencyContact({ ...student, ...form });

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error ? (
        <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {message}
        </p>
      ) : null}

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-subtle)]">
            Contact
          </h3>
          <p className="mt-1 text-xs text-[var(--color-afta-muted)]">How the academy can reach you directly.</p>
        </div>
        <Field label="Primary phone">
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            className={inputClassName}
            placeholder="8705551234"
            autoComplete="tel"
          />
        </Field>
      </section>

      <section className="space-y-4 border-t border-[var(--color-afta-border)] pt-8">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-subtle)]">
            Mailing address
          </h3>
          <p className="mt-1 text-xs text-[var(--color-afta-muted)]">Used for academy correspondence and certificates.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Street address" className="sm:col-span-2">
            <input
              name="mailingAddressLine1"
              value={form.mailingAddressLine1}
              onChange={handleChange}
              className={inputClassName}
              placeholder="Street address"
            />
          </Field>
          <Field label="Apt / suite / unit" className="sm:col-span-2">
            <input
              name="mailingAddressLine2"
              value={form.mailingAddressLine2}
              onChange={handleChange}
              className={inputClassName}
              placeholder="Optional"
            />
          </Field>
          <Field label="City">
            <input
              name="mailingCity"
              value={form.mailingCity}
              onChange={handleChange}
              className={inputClassName}
            />
          </Field>
          <Field label="State">
            <input
              name="mailingState"
              value={form.mailingState}
              onChange={handleChange}
              className={inputClassName}
              maxLength={2}
              placeholder="AR"
            />
          </Field>
          <Field label="ZIP code">
            <input
              name="mailingZip"
              value={form.mailingZip}
              onChange={handleChange}
              className={inputClassName}
              placeholder="71701"
            />
          </Field>
        </div>
        {mailingPreview ? (
          <p className="text-xs text-[var(--color-afta-muted)]">
            Preview: {mailingPreview.join(" · ")}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 border-t border-[var(--color-afta-border)] pt-8">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-subtle)]">
            Emergency contact
          </h3>
          <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
            Person to contact if you are injured or unavailable during training.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              name="emergencyContactName"
              value={form.emergencyContactName}
              onChange={handleChange}
              className={inputClassName}
            />
          </Field>
          <Field label="Relationship">
            <input
              name="emergencyContactRelationship"
              value={form.emergencyContactRelationship}
              onChange={handleChange}
              className={inputClassName}
              placeholder="Spouse, parent, etc."
            />
          </Field>
          <Field label="Phone">
            <input
              name="emergencyContactPhone"
              value={form.emergencyContactPhone}
              onChange={handleChange}
              className={inputClassName}
              placeholder="8705551234"
            />
          </Field>
          <Field label="Emergency contact address" className="sm:col-span-2">
            <input
              name="emergencyContactAddressLine1"
              value={form.emergencyContactAddressLine1}
              onChange={handleChange}
              className={inputClassName}
              placeholder="Street address"
            />
          </Field>
          <Field label="City">
            <input
              name="emergencyContactCity"
              value={form.emergencyContactCity}
              onChange={handleChange}
              className={inputClassName}
            />
          </Field>
          <Field label="State">
            <input
              name="emergencyContactState"
              value={form.emergencyContactState}
              onChange={handleChange}
              className={inputClassName}
              maxLength={2}
            />
          </Field>
          <Field label="ZIP code">
            <input
              name="emergencyContactZip"
              value={form.emergencyContactZip}
              onChange={handleChange}
              className={inputClassName}
            />
          </Field>
        </div>
        {emergencyPreview ? (
          <div className="rounded-[10px] border border-[var(--color-afta-border)] bg-white px-4 py-3 text-sm text-[var(--color-afta-text)]">
            <p className="font-medium text-[var(--color-afta-text)]">
              {emergencyPreview.name}
              {emergencyPreview.relationship ? ` · ${emergencyPreview.relationship}` : ""}
            </p>
            <p className="mt-1">{emergencyPreview.phone}</p>
            <p className="mt-1 text-[var(--color-afta-subtle)]">{emergencyPreview.address}</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 border-t border-[var(--color-afta-border)] pt-8">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-subtle)]">
            Employment
          </h3>
          <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
            Your fire department or organization and current rank/title.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Organization">
            <input
              name="departmentName"
              value={form.departmentName}
              onChange={handleChange}
              className={inputClassName}
              placeholder="Fire department or agency name"
            />
          </Field>
          <Field label="Rank / title">
            <input
              name="rank"
              value={form.rank}
              onChange={handleChange}
              className={inputClassName}
              placeholder="Firefighter, Captain, etc."
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 border-t border-[var(--color-afta-border)] pt-8">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-subtle)]">
            Special considerations
          </h3>
          <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
            Medical conditions, allergies, dietary needs, mobility accommodations, or other information
            the academy should know for your safety.
          </p>
        </div>
        <Field label="Notes for academy staff">
          <textarea
            name="specialConsiderations"
            value={form.specialConsiderations}
            onChange={handleChange}
            rows={4}
            className={inputClassName}
            placeholder="Example: Type 1 diabetes, nut allergy, requires ground-floor lodging, etc."
          />
        </Field>
      </section>

      <div className="flex flex-wrap gap-3 border-t border-[var(--color-afta-border)] pt-6">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#c8102e] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {onCancel ? (
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="rounded-full border border-[var(--color-afta-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)] disabled:opacity-60"
          >
            Cancel
          </button>
        ) : null}
        <p className="self-center text-xs text-[var(--color-afta-muted)]">
          Name, FEMA SID, and email changes still require academy staff.
        </p>
      </div>
    </form>
  );
}

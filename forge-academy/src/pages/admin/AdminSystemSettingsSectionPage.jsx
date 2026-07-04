import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { FormField, FormSelect } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSystemSettings } from "../../context/SystemSettingsContext.jsx";
import { SYSTEM_SETTINGS_SECTIONS } from "../../lib/systemSettings.js";

function SettingsField({ field, value, onChange }) {
  if (field.type === "boolean") {
    return (
      <label className="flex items-start gap-3 rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-bg)] px-4 py-3 text-sm text-[var(--color-afta-text)]">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(field.key, event.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">{field.label}</span>
          {field.hint ? <span className="mt-1 block text-xs text-[var(--color-afta-subtle)]">{field.hint}</span> : null}
        </span>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-[var(--color-afta-text)]">{field.label}</span>
        <textarea
          value={value ?? ""}
          onChange={(event) => onChange(field.key, event.target.value)}
          rows={4}
          className="app-input w-full text-sm"
        />
        {field.hint ? <span className="mt-1 block text-xs text-[var(--color-afta-subtle)]">{field.hint}</span> : null}
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <FormSelect
        label={field.label}
        name={field.key}
        value={value ?? ""}
        onChange={(event) => onChange(field.key, event.target.value)}
        options={(field.options ?? []).map((option) => ({ value: option.value, label: option.label }))}
      />
    );
  }

  return (
    <FormField
      label={field.label}
      name={field.key}
      type={field.type === "number" ? "number" : field.type === "time" ? "time" : "text"}
      value={value ?? ""}
      onChange={(event) =>
        onChange(field.key, field.type === "number" ? Number(event.target.value) : event.target.value)
      }
      hint={field.hint}
    />
  );
}

export default function AdminSystemSettingsSectionPage() {
  const { user } = useAuth();
  const { sectionId } = useParams();
  const { settings, loading, error: loadError, saveSection } = useSystemSettings();
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const activeSection = useMemo(
    () => SYSTEM_SETTINGS_SECTIONS.find((section) => section.id === sectionId) ?? null,
    [sectionId],
  );

  useEffect(() => {
    if (!activeSection) return;
    setDraft({ ...(settings[activeSection.id] ?? {}) });
    setSuccess(null);
    setError(null);
  }, [activeSection, settings]);

  if (!activeSection) {
    return <Navigate to={`/admin/settings/${SYSTEM_SETTINGS_SECTIONS[0].id}`} replace />;
  }

  function handleFieldChange(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveSection(activeSection.id, draft, user.uid);
      setSuccess(`${activeSection.title} saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {loadError ? <p className="app-error mb-4">{loadError}</p> : null}
      {error ? <p className="app-error mb-4">{error}</p> : null}
      {success ? (
        <p className="mb-4 rounded-[10px] border border-green-500/30 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </p>
      ) : null}

      <form onSubmit={handleSave} className="app-panel p-5">
        <div className="border-b border-[var(--color-afta-border)] pb-4">
          <h2 className="text-base font-semibold text-[var(--color-afta-text)]">{activeSection.title}</h2>
          <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">{activeSection.description}</p>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--color-afta-subtle)]">Loading settings…</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {activeSection.fields.map((field) => (
              <div
                key={field.key}
                className={field.type === "boolean" || field.type === "textarea" ? "md:col-span-2" : ""}
              >
                <SettingsField field={field} value={draft[field.key]} onChange={handleFieldChange} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--color-afta-border)] pt-4">
          <button type="submit" disabled={saving || loading} className="app-btn-primary px-4 py-2 text-xs">
            {saving ? "Saving…" : `Save ${activeSection.title}`}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setDraft({ ...(settings[activeSection.id] ?? {}) })}
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Reset changes
          </button>
          <Link to="/admin/users" className="app-btn-secondary px-4 py-2 text-xs">
            Portal users
          </Link>
        </div>
      </form>
    </>
  );
}

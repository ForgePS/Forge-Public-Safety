import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSelect } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSystemSettings } from "../../context/SystemSettingsContext.jsx";
import { SYSTEM_SETTINGS_SECTIONS } from "../../lib/systemSettings.js";
import { ROLE_LABELS, ROLES } from "../../lib/roles.js";

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

export default function AdminSystemSettingsPage() {
  const { user } = useAuth();
  const { settings, loading, error: loadError, saveSection } = useSystemSettings();
  const [activeSectionId, setActiveSectionId] = useState(SYSTEM_SETTINGS_SECTIONS[0].id);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const activeSection = useMemo(
    () => SYSTEM_SETTINGS_SECTIONS.find((section) => section.id === activeSectionId) ?? SYSTEM_SETTINGS_SECTIONS[0],
    [activeSectionId],
  );

  useEffect(() => {
    if (!activeSection) return;
    setDraft({ ...(settings[activeSection.id] ?? {}) });
    setSuccess(null);
    setError(null);
  }, [activeSection, settings]);

  function handleFieldChange(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!user?.uid || !activeSection) return;
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
      <PageHeader
        title="System Settings"
        subtitle="Global configuration for every module — Creator and Super Admin only"
        actions={
          <Link to="/admin/users" className="app-btn-secondary px-4 py-2 text-xs">
            Portal users
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:flex-row lg:p-7">
        <aside className="app-panel w-full shrink-0 p-3 lg:w-72">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
            Configuration areas
          </p>
          <nav className="flex max-h-[70vh] flex-col gap-0.5 overflow-y-auto">
            {SYSTEM_SETTINGS_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSectionId(section.id)}
                className={`rounded-[10px] px-3 py-2 text-left text-sm transition ${
                  section.id === activeSectionId
                    ? "bg-[#c8102e]/10 font-semibold text-[#c8102e]"
                    : "text-[var(--color-afta-text)] hover:bg-[var(--color-afta-bg)]"
                }`}
              >
                {section.title}
              </button>
            ))}
          </nav>
          <div className="mt-4 border-t border-[var(--color-afta-border)] px-2 pt-4 text-xs text-[var(--color-afta-subtle)]">
            <p>
              Signed in as <span className="font-medium text-[var(--color-afta-text)]">{ROLE_LABELS[user?.role ?? ROLES.ACADEMY_ADMIN]}</span>
            </p>
            <p className="mt-2">Changes apply academy-wide and are audit logged.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
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
            </div>
          </form>
        </section>
      </div>
    </>
  );
}

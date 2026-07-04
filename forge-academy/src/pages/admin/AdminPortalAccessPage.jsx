import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSystemSettings } from "../../context/SystemSettingsContext.jsx";
import {
  PORTAL_ACCESS_DEFINITIONS,
  readPortalAccessConfig,
  serializePortalAccessConfig,
} from "../../lib/portalAccess.js";
import { isSystemSettingsAdmin } from "../../lib/roles.js";

export default function AdminPortalAccessPage() {
  const { user } = useAuth();
  const { settings, loading, error: loadError, saveSection } = useSystemSettings();
  const [draft, setDraft] = useState(() => readPortalAccessConfig(settings));
  const [activePortal, setActivePortal] = useState("student");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const canManage = isSystemSettingsAdmin(user?.role);

  useEffect(() => {
    setDraft(readPortalAccessConfig(settings));
  }, [settings]);

  const activeDefinition = useMemo(
    () => PORTAL_ACCESS_DEFINITIONS.find((portal) => portal.key === activePortal) ?? PORTAL_ACCESS_DEFINITIONS[0],
    [activePortal],
  );

  const activeDraft = draft[activeDefinition.key];

  function updateActiveField(field, value) {
    setDraft((current) => ({
      ...current,
      [activeDefinition.key]: {
        ...current[activeDefinition.key],
        [field]: value,
      },
    }));
    setSuccess(null);
    setError(null);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!user?.uid || !canManage) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveSection("portals", serializePortalAccessConfig(draft), user.uid);
      setSuccess("Portal access settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save portal access settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <PageHeader
        title="Access denied"
        subtitle="Portal access settings require Academy Admin access or above."
        backTo="/admin"
        backLabel="Back to dashboard"
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Portal Access"
        subtitle="Turn portals on or off and edit how each portal appears to users"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/roles" className="app-btn-secondary px-4 py-2 text-xs">
              User roles
            </Link>
            <Link to="/admin/users" className="app-btn-secondary px-4 py-2 text-xs">
              Portal users
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:flex-row lg:p-7">
        <aside className="app-panel w-full shrink-0 p-4 lg:w-72">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
            Portals
          </p>
          <nav className="mt-2 flex flex-col gap-1">
            {PORTAL_ACCESS_DEFINITIONS.map((portal) => {
              const entry = draft[portal.key];
              return (
                <button
                  key={portal.key}
                  type="button"
                  onClick={() => setActivePortal(portal.key)}
                  className={`rounded-[10px] px-3 py-3 text-left transition ${
                    activePortal === portal.key
                      ? "bg-[#c8102e]/10 ring-1 ring-[#c8102e]/20"
                      : "hover:bg-[var(--color-afta-bg)]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--color-afta-text)]">{entry.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-afta-muted)]">{portal.path}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-afta-subtle)]">
                    {portal.alwaysOn || entry.enabled ? "Enabled" : "Disabled"}
                  </p>
                </button>
              );
            })}
          </nav>
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
              <h2 className="text-lg font-semibold text-[var(--color-afta-text)]">{activeDefinition.title}</h2>
              <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
                Route: <code>{activeDefinition.path}</code>
                {activeDefinition.alwaysOn ? " · always available to admin staff" : null}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {!activeDefinition.alwaysOn ? (
                <label className="flex items-start gap-3 rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-bg)] px-4 py-3 text-sm text-[var(--color-afta-text)]">
                  <input
                    type="checkbox"
                    checked={Boolean(activeDraft.enabled)}
                    onChange={(event) => updateActiveField("enabled", event.target.checked)}
                    disabled={loading || saving}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">Portal enabled</span>
                    <span className="mt-1 block text-xs text-[var(--color-afta-subtle)]">
                      When disabled, users with this portal access see an unavailable message instead of the portal.
                    </span>
                  </span>
                </label>
              ) : (
                <p className="rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-bg)] px-4 py-3 text-sm text-[var(--color-afta-subtle)]">
                  The academy admin portal stays enabled so staff can manage the platform.
                </p>
              )}

              <FormField
                label="Portal name"
                name="label"
                value={activeDraft.label}
                onChange={(event) => updateActiveField("label", event.target.value)}
                disabled={loading || saving}
              />
              <FormField
                label="Description"
                name="description"
                value={activeDraft.description}
                onChange={(event) => updateActiveField("description", event.target.value)}
                disabled={loading || saving}
              />
              <FormField
                label="Unavailable message"
                name="signInMessage"
                value={activeDraft.signInMessage}
                onChange={(event) => updateActiveField("signInMessage", event.target.value)}
                disabled={loading || saving}
                hint="Shown when this portal is disabled. Leave blank for the default message."
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button type="submit" disabled={loading || saving} className="app-btn-primary px-4 py-2 text-xs disabled:opacity-60">
                {saving ? "Saving…" : "Save portal access"}
              </button>
              <Link to="/admin/settings" className="app-btn-secondary px-4 py-2 text-xs">
                All system settings
              </Link>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}

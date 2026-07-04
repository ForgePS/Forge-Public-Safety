import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePortalDefinitions } from "../../context/PortalDefinitionsContext.jsx";
import { useSystemSettings } from "../../context/SystemSettingsContext.jsx";
import {
  archivePortalDefinition,
  portalPathFromSlug,
  deletePortalDefinition,
  normalizePortalSlug,
  savePortalDefinition,
  validatePortalSlug,
} from "../../lib/portalDefinitions.js";
import {
  mergePortalDefinitions,
  PORTAL_ACCESS_DEFINITIONS,
  readPortalAccessConfig,
  serializePortalAccessConfig,
} from "../../lib/portalAccess.js";
import { isSystemSettingsAdmin } from "../../lib/roles.js";

const emptyPortalForm = {
  slug: "",
  label: "",
  description: "",
  enabled: true,
  signInMessage: "",
};

export default function AdminPortalAccessPage({ embedded = false }) {
  const { user } = useAuth();
  const { settings, loading, error: loadError, saveSection } = useSystemSettings();
  const { portals: customPortals, reload: reloadCustomPortals } = usePortalDefinitions();
  const [draft, setDraft] = useState(() => readPortalAccessConfig(settings, customPortals));
  const [activePortal, setActivePortal] = useState("student");
  const [creatingPortal, setCreatingPortal] = useState(false);
  const [portalForm, setPortalForm] = useState(emptyPortalForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const canManage = isSystemSettingsAdmin(user?.role);

  const allDefinitions = useMemo(
    () => mergePortalDefinitions(customPortals),
    [customPortals],
  );

  useEffect(() => {
    setDraft(readPortalAccessConfig(settings, customPortals));
  }, [settings, customPortals]);

  const activeDefinition = useMemo(
    () => allDefinitions.find((portal) => portal.key === activePortal) ?? allDefinitions[0],
    [activePortal, allDefinitions],
  );

  const activeDraft = draft[activeDefinition?.key ?? "student"];
  const isDefinedPortal = Boolean(activeDefinition?.isDefined);

  function updateActiveField(field, value) {
    if (!activeDefinition) return;
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

  function startCreatePortal() {
    setCreatingPortal(true);
    setPortalForm(emptyPortalForm);
    setSuccess(null);
    setError(null);
  }

  function cancelCreatePortal() {
    setCreatingPortal(false);
    setPortalForm(emptyPortalForm);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!user?.uid || !canManage || !activeDefinition || !activeDraft) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (creatingPortal) {
        const slug = validatePortalSlug(portalForm.slug);
        await savePortalDefinition(
          slug,
          {
            label: portalForm.label || portalForm.slug,
            description: portalForm.description,
            enabled: portalForm.enabled,
            signInMessage: portalForm.signInMessage,
            status: "active",
          },
          user.uid,
        );
        await reloadCustomPortals();
        setCreatingPortal(false);
        setPortalForm(emptyPortalForm);
        setActivePortal(slug);
        setSuccess("Portal created.");
        return;
      }

      if (isDefinedPortal) {
        await savePortalDefinition(
          activeDefinition.key,
          {
            label: activeDraft.label,
            description: activeDraft.description,
            enabled: activeDraft.enabled,
            signInMessage: activeDraft.signInMessage,
            status: "active",
          },
          user.uid,
        );
        await reloadCustomPortals();
        setSuccess("Portal settings saved.");
        return;
      }

      await saveSection("portals", serializePortalAccessConfig(draft), user.uid);
      setSuccess("Portal access settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save portal access settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchivePortal() {
    if (!user?.uid || !canManage || !isDefinedPortal || !activeDefinition) return;
    if (!window.confirm(`Archive portal "${activeDefinition.title}"? Users will no longer reach this portal.`)) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await archivePortalDefinition(activeDefinition.key);
      await reloadCustomPortals();
      setActivePortal(PORTAL_ACCESS_DEFINITIONS[1]?.key ?? "student");
      setSuccess("Portal archived.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive portal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePortal() {
    if (!user?.uid || !canManage || !isDefinedPortal || !activeDefinition) return;
    if (!window.confirm(`Delete portal "${activeDefinition.title}" permanently?`)) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deletePortalDefinition(activeDefinition.key);
      await reloadCustomPortals();
      setActivePortal(PORTAL_ACCESS_DEFINITIONS[1]?.key ?? "student");
      setSuccess("Portal deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete portal.");
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    if (embedded) {
      return (
        <div className="app-panel p-5 text-sm text-[var(--color-afta-subtle)]">
          Portal access settings require Academy Admin access or above.
        </div>
      );
    }
    return (
      <PageHeader
        title="Access denied"
        subtitle="Portal access settings require Academy Admin access or above."
        backTo="/admin"
        backLabel="Back to dashboard"
      />
    );
  }

  const content = (
    <>
      {!embedded ? (
        <PageHeader
          title="Portal Access"
          subtitle="Turn portals on or off, add custom portals, and edit how each portal appears"
          actions={
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startCreatePortal} className="app-btn-primary px-4 py-2 text-xs">
                Add portal
              </button>
              <Link to="/admin/settings/user-roles" className="app-btn-secondary px-4 py-2 text-xs">
                User roles
              </Link>
              <Link to="/admin/users" className="app-btn-secondary px-4 py-2 text-xs">
                Portal users
              </Link>
            </div>
          }
        />
      ) : (
        <div className="app-panel mb-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-afta-border)] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-afta-text)]">Portal Access</h2>
              <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
                Turn portals on or off, add custom portals, and edit how each portal appears
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startCreatePortal} className="app-btn-primary px-4 py-2 text-xs">
                Add portal
              </button>
              <Link to="/admin/settings/user-roles" className="app-btn-secondary px-4 py-2 text-xs">
                User roles
              </Link>
              <Link to="/admin/users" className="app-btn-secondary px-4 py-2 text-xs">
                Portal users
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className={`flex flex-1 flex-col gap-5 ${embedded ? "lg:flex-row" : "p-6 lg:flex-row lg:p-7"}`}>
        <aside className="app-panel w-full shrink-0 p-4 lg:w-72">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
            Portals
          </p>
          <nav className="mt-2 flex flex-col gap-1">
            {allDefinitions.map((portal) => {
              const entry = draft[portal.key];
              if (!entry) return null;
              return (
                <button
                  key={portal.key}
                  type="button"
                  onClick={() => {
                    setActivePortal(portal.key);
                    setCreatingPortal(false);
                  }}
                  className={`rounded-[10px] px-3 py-3 text-left transition ${
                    !creatingPortal && activePortal === portal.key
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
            {creatingPortal ? (
              <div className="rounded-[10px] bg-[#c8102e]/10 px-3 py-3 ring-1 ring-[#c8102e]/20">
                <p className="text-sm font-semibold text-[var(--color-afta-text)]">New portal</p>
                <p className="mt-0.5 text-xs text-[var(--color-afta-muted)]">Draft</p>
              </div>
            ) : null}
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
              <h2 className="text-lg font-semibold text-[var(--color-afta-text)]">
                {creatingPortal ? "New portal" : activeDefinition?.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
                {creatingPortal ? (
                  "New portals use the same URL pattern as Student or Instructor — for example /partner. Assign user roles after creating the portal."
                ) : (
                  <>
                    Route: <code>{activeDefinition?.path}</code>
                    {activeDefinition?.alwaysOn ? " · always available to admin staff" : null}
                  </>
                )}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {creatingPortal ? (
                <>
                  <FormField
                    label="Portal slug"
                    name="slug"
                    value={portalForm.slug}
                    onChange={(event) => setPortalForm((current) => ({ ...current, slug: event.target.value }))}
                    disabled={loading || saving}
                    hint="Lowercase slug used in the URL, e.g. partner or regional_coordinator"
                  />
                  <p className="text-xs text-[var(--color-afta-muted)]">
                    Preview route:{" "}
                    <code>{portalForm.slug ? portalPathFromSlug(normalizePortalSlug(portalForm.slug)) : "/your-portal"}</code>
                  </p>
                  <FormField
                    label="Portal name"
                    name="label"
                    value={portalForm.label}
                    onChange={(event) => setPortalForm((current) => ({ ...current, label: event.target.value }))}
                    disabled={loading || saving}
                  />
                  <FormField
                    label="Description"
                    name="description"
                    value={portalForm.description}
                    onChange={(event) => setPortalForm((current) => ({ ...current, description: event.target.value }))}
                    disabled={loading || saving}
                  />
                  <label className="flex items-start gap-3 rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-bg)] px-4 py-3 text-sm text-[var(--color-afta-text)]">
                    <input
                      type="checkbox"
                      checked={Boolean(portalForm.enabled)}
                      onChange={(event) => setPortalForm((current) => ({ ...current, enabled: event.target.checked }))}
                      disabled={loading || saving}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Portal enabled</span>
                      <span className="mt-1 block text-xs text-[var(--color-afta-subtle)]">
                        Disabled portals show an unavailable message instead of the portal home page.
                      </span>
                    </span>
                  </label>
                  <FormField
                    label="Unavailable message"
                    name="signInMessage"
                    value={portalForm.signInMessage}
                    onChange={(event) => setPortalForm((current) => ({ ...current, signInMessage: event.target.value }))}
                    disabled={loading || saving}
                  />
                </>
              ) : (
                <>
                  {!activeDefinition?.alwaysOn ? (
                    <label className="flex items-start gap-3 rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-bg)] px-4 py-3 text-sm text-[var(--color-afta-text)]">
                      <input
                        type="checkbox"
                        checked={Boolean(activeDraft?.enabled)}
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
                    value={activeDraft?.label ?? ""}
                    onChange={(event) => updateActiveField("label", event.target.value)}
                    disabled={loading || saving}
                  />
                  <FormField
                    label="Description"
                    name="description"
                    value={activeDraft?.description ?? ""}
                    onChange={(event) => updateActiveField("description", event.target.value)}
                    disabled={loading || saving}
                  />
                  <FormField
                    label="Unavailable message"
                    name="signInMessage"
                    value={activeDraft?.signInMessage ?? ""}
                    onChange={(event) => updateActiveField("signInMessage", event.target.value)}
                    disabled={loading || saving}
                    hint="Shown when this portal is disabled. Leave blank for the default message."
                  />
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button type="submit" disabled={loading || saving} className="app-btn-primary px-4 py-2 text-xs disabled:opacity-60">
                {saving ? "Saving…" : creatingPortal ? "Create portal" : "Save portal access"}
              </button>
              {creatingPortal ? (
                <button type="button" onClick={cancelCreatePortal} className="app-btn-secondary px-4 py-2 text-xs">
                  Cancel
                </button>
              ) : null}
              {!creatingPortal && isDefinedPortal ? (
                <>
                  <button
                    type="button"
                    disabled={loading || saving}
                    onClick={handleArchivePortal}
                    className="app-btn-secondary px-4 py-2 text-xs disabled:opacity-60"
                  >
                    Archive portal
                  </button>
                  <button
                    type="button"
                    disabled={loading || saving}
                    onClick={handleDeletePortal}
                    className="px-4 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                  >
                    Delete portal
                  </button>
                </>
              ) : null}
              <Link to="/admin/settings" className="app-btn-secondary px-4 py-2 text-xs">
                All system settings
              </Link>
            </div>
          </form>
        </section>
      </div>
    </>
  );

  return content;
}

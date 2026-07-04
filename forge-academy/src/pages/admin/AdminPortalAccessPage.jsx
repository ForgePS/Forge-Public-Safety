import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePortalDefinitions } from "../../context/PortalDefinitionsContext.jsx";
import { useSystemSettings } from "../../context/SystemSettingsContext.jsx";
import {
  archivePortalDefinition,
  customPortalPath,
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

const emptyCustomForm = {
  slug: "",
  label: "",
  description: "",
  enabled: true,
  signInMessage: "",
};

export default function AdminPortalAccessPage() {
  const { user } = useAuth();
  const { settings, loading, error: loadError, saveSection } = useSystemSettings();
  const { portals: customPortals, reload: reloadCustomPortals } = usePortalDefinitions();
  const [draft, setDraft] = useState(() => readPortalAccessConfig(settings, customPortals));
  const [activePortal, setActivePortal] = useState("student");
  const [creatingPortal, setCreatingPortal] = useState(false);
  const [customForm, setCustomForm] = useState(emptyCustomForm);
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
  const isCustomPortal = Boolean(activeDefinition?.isCustom);

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
    setCustomForm(emptyCustomForm);
    setSuccess(null);
    setError(null);
  }

  function cancelCreatePortal() {
    setCreatingPortal(false);
    setCustomForm(emptyCustomForm);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!user?.uid || !canManage || !activeDefinition || !activeDraft) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (creatingPortal) {
        const slug = validatePortalSlug(customForm.slug);
        await savePortalDefinition(
          slug,
          {
            label: customForm.label || customForm.slug,
            description: customForm.description,
            enabled: customForm.enabled,
            signInMessage: customForm.signInMessage,
            status: "active",
          },
          user.uid,
        );
        await reloadCustomPortals();
        setCreatingPortal(false);
        setCustomForm(emptyCustomForm);
        setActivePortal(slug);
        setSuccess("Custom portal created.");
        return;
      }

      if (isCustomPortal) {
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
        setSuccess("Custom portal settings saved.");
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

  async function handleArchiveCustomPortal() {
    if (!user?.uid || !canManage || !isCustomPortal || !activeDefinition) return;
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
      setSuccess("Custom portal archived.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive custom portal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCustomPortal() {
    if (!user?.uid || !canManage || !isCustomPortal || !activeDefinition) return;
    if (!window.confirm(`Delete portal "${activeDefinition.title}" permanently?`)) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deletePortalDefinition(activeDefinition.key);
      await reloadCustomPortals();
      setActivePortal(PORTAL_ACCESS_DEFINITIONS[1]?.key ?? "student");
      setSuccess("Custom portal deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete custom portal.");
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
        subtitle="Turn portals on or off, add custom portals, and edit how each portal appears"
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={startCreatePortal} className="app-btn-primary px-4 py-2 text-xs">
              Add portal
            </button>
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--color-afta-text)]">{entry.label}</p>
                    {portal.isCustom ? (
                      <span className="rounded-full bg-[var(--color-afta-bg)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--color-afta-muted)]">
                        Custom
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-afta-muted)]">{portal.path}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-afta-subtle)]">
                    {portal.alwaysOn || entry.enabled ? "Enabled" : "Disabled"}
                  </p>
                </button>
              );
            })}
            {creatingPortal ? (
              <div className="rounded-[10px] bg-[#c8102e]/10 px-3 py-3 ring-1 ring-[#c8102e]/20">
                <p className="text-sm font-semibold text-[var(--color-afta-text)]">New custom portal</p>
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
                {creatingPortal ? "New custom portal" : activeDefinition?.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
                {creatingPortal ? (
                  "Custom portals live at /p/your-slug. Assign access with User Roles after creating the portal."
                ) : (
                  <>
                    Route: <code>{activeDefinition?.path}</code>
                    {activeDefinition?.alwaysOn ? " · always available to admin staff" : null}
                    {isCustomPortal ? " · custom portal" : null}
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
                    value={customForm.slug}
                    onChange={(event) => setCustomForm((current) => ({ ...current, slug: event.target.value }))}
                    disabled={loading || saving}
                    hint="Lowercase slug used in the URL, e.g. partner or regional_coordinator"
                  />
                  <p className="text-xs text-[var(--color-afta-muted)]">
                    Preview route:{" "}
                    <code>{customForm.slug ? customPortalPath(normalizePortalSlug(customForm.slug)) : "/p/your-slug"}</code>
                  </p>
                  <FormField
                    label="Portal name"
                    name="label"
                    value={customForm.label}
                    onChange={(event) => setCustomForm((current) => ({ ...current, label: event.target.value }))}
                    disabled={loading || saving}
                  />
                  <FormField
                    label="Description"
                    name="description"
                    value={customForm.description}
                    onChange={(event) => setCustomForm((current) => ({ ...current, description: event.target.value }))}
                    disabled={loading || saving}
                  />
                  <label className="flex items-start gap-3 rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-bg)] px-4 py-3 text-sm text-[var(--color-afta-text)]">
                    <input
                      type="checkbox"
                      checked={Boolean(customForm.enabled)}
                      onChange={(event) => setCustomForm((current) => ({ ...current, enabled: event.target.checked }))}
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
                    value={customForm.signInMessage}
                    onChange={(event) => setCustomForm((current) => ({ ...current, signInMessage: event.target.value }))}
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
              {!creatingPortal && isCustomPortal ? (
                <>
                  <button
                    type="button"
                    disabled={loading || saving}
                    onClick={handleArchiveCustomPortal}
                    className="app-btn-secondary px-4 py-2 text-xs disabled:opacity-60"
                  >
                    Archive portal
                  </button>
                  <button
                    type="button"
                    disabled={loading || saving}
                    onClick={handleDeleteCustomPortal}
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
}

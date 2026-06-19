import { useEffect, useMemo, useState } from "react";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import PageHeader from "./PageHeader.jsx";
import {
  defaultPortalAnnouncementForm,
  deletePortalAnnouncement,
  formatAnnouncementDate,
  portalAudienceLabel,
  savePortalAnnouncement,
} from "../lib/portalAnnouncements.js";

/**
 * @param {{
 *   title: string,
 *   subtitle: string,
 *   audienceOptions: { value: string, label: string }[],
 *   defaultAudiences: string[],
 *   loadAnnouncements: () => Promise<import('../lib/portalAnnouncements.js').PortalAnnouncementRecord[]>,
 *   canManageItem?: (item: import('../lib/portalAnnouncements.js').PortalAnnouncementRecord) => boolean,
 *   showAudienceSummary?: boolean,
 *   showAudiencePicker?: boolean,
 *   listTitle?: string,
 *   author?: { uid: string, displayName: string },
 * }} props
 */
export default function PortalAnnouncementsManager({
  title,
  subtitle,
  audienceOptions,
  defaultAudiences,
  loadAnnouncements,
  canManageItem = () => true,
  showAudienceSummary = true,
  showAudiencePicker = true,
  listTitle = "All announcements",
  author = null,
}) {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState(() => defaultPortalAnnouncementForm(defaultAudiences));
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const rows = await loadAnnouncements();
      setAnnouncements(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load announcements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const audienceSummary = useMemo(
    () =>
      audienceOptions.map((option) => ({
        ...option,
        count: announcements.filter(
          (item) => item.active && item.audiences.includes(option.value),
        ).length,
      })),
    [announcements, audienceOptions],
  );

  function resetForm() {
    setForm(defaultPortalAnnouncementForm(defaultAudiences));
    setEditingId(null);
    setError(null);
  }

  /** @param {import('../lib/portalAnnouncements.js').PortalAnnouncementRecord} item */
  function startEdit(item) {
    if (!canManageItem(item)) return;
    setEditingId(item.id);
    setForm({
      title: item.title,
      detail: item.detail,
      active: item.active,
      audiences: [...item.audiences],
      publishedAt: item.publishedAt?.toDate
        ? item.publishedAt.toDate().toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setError(null);
  }

  /** @param {string} audience */
  function toggleAudience(audience) {
    setForm((current) => {
      const selected = current.audiences.includes(audience);
      return {
        ...current,
        audiences: selected
          ? current.audiences.filter((item) => item !== audience)
          : [...current.audiences, audience],
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const audiences = showAudiencePicker ? form.audiences : defaultAudiences;
      await savePortalAnnouncement(
        { ...form, audiences },
        editingId,
        {
          allowedAudiences: audienceOptions.map((item) => item.value),
          author,
        },
      );
      resetForm();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save announcement.");
    } finally {
      setSaving(false);
    }
  }

  /** @param {string} id */
  async function handleDelete(id) {
    const item = announcements.find((row) => row.id === id);
    if (item && !canManageItem(item)) return;
    if (!window.confirm("Delete this announcement?")) return;
    setError(null);
    try {
      await deletePortalAnnouncement(id);
      if (editingId === id) resetForm();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete announcement.");
    }
  }

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {showAudienceSummary ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {audienceSummary.map((item) => (
              <div
                key={item.value}
                className="rounded-[12px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-4 py-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-[var(--color-afta-text)]">{item.count}</p>
                <p className="text-[11px] text-[var(--color-afta-muted)]">Active announcements</p>
              </div>
            ))}
          </div>
        ) : null}

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-afta-text)]">
              {editingId ? (
                <Pencil className="h-4 w-4 text-[var(--color-afta-red)]" />
              ) : (
                <Plus className="h-4 w-4 text-[var(--color-afta-red)]" />
              )}
              {editingId ? "Edit announcement" : "New announcement"}
            </h2>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-[var(--color-afta-muted)]"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-[var(--color-afta-muted)]">Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  required
                  className="w-full rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-afta-red)]/50"
                  placeholder="Registration reminder"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-[var(--color-afta-muted)]">Publish date</span>
                <input
                  type="date"
                  value={form.publishedAt}
                  onChange={(event) => setForm((current) => ({ ...current, publishedAt: event.target.value }))}
                  className="w-full rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-afta-red)]/50"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold text-[var(--color-afta-muted)]">Details</span>
              <textarea
                value={form.detail}
                onChange={(event) => setForm((current) => ({ ...current, detail: event.target.value }))}
                rows={3}
                className="w-full rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-afta-red)]/50"
                placeholder="Short message shown on the selected dashboards."
              />
            </label>

            {showAudiencePicker ? (
              <fieldset>
                <legend className="mb-2 text-xs font-semibold text-[var(--color-afta-muted)]">
                  Show on dashboards
                </legend>
                <div className="flex flex-wrap gap-2">
                  {audienceOptions.map((option) => {
                    const selected = form.audiences.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleAudience(option.value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          selected
                            ? "border-[var(--color-afta-red)] bg-[var(--color-afta-red)] text-white"
                            : "border-[var(--color-afta-border)] bg-slate-50 text-[var(--color-afta-text)] hover:border-[var(--color-afta-red)]/30"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <p className="text-xs text-[var(--color-afta-muted)]">
                This announcement will appear in the instructor portal sidebar for all instructors.
              </p>
            )}

            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-afta-text)]">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                className="rounded border-[var(--color-afta-border)]"
              />
              Published (visible on selected dashboards)
            </label>

            {error ? (
              <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              <Megaphone className="h-4 w-4" />
              {saving ? "Saving…" : editingId ? "Save changes" : "Publish announcement"}
            </button>
          </form>
        </section>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">{listTitle}</h2>
          </div>

          {loading ? (
            <p className="px-5 py-4 text-sm text-[var(--color-afta-muted)]">Loading…</p>
          ) : announcements.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--color-afta-muted)]">No announcements yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-3 py-3 font-semibold">Title</th>
                    {showAudiencePicker ? <th className="px-3 py-3 font-semibold">Audiences</th> : null}
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((item) => {
                    const manageable = canManageItem(item);
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]"
                      >
                        <td className="px-5 py-3 text-xs text-[var(--color-afta-muted)]">
                          {formatAnnouncementDate(item.publishedAt)}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold">{item.title}</p>
                          {item.detail ? (
                            <p className="mt-1 max-w-xl text-xs text-[var(--color-afta-muted)]">{item.detail}</p>
                          ) : null}
                        </td>
                        {showAudiencePicker ? (
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {item.audiences.map((audience) => (
                                <span
                                  key={audience}
                                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-afta-muted)]"
                                >
                                  {portalAudienceLabel(audience)}
                                </span>
                              ))}
                            </div>
                          </td>
                        ) : null}
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              item.active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-[var(--color-afta-muted)]"
                            }`}
                          >
                            {item.active ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {manageable ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--color-afta-border)] px-2.5 py-1.5 text-xs font-semibold hover:border-[var(--color-afta-red)]/30"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="inline-flex items-center gap-1 rounded-[8px] border border-[#c8102e]/20 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-[#c8102e]/5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-afta-muted)]">Admin managed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

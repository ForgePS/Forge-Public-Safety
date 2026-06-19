import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CirclePlus,
  Copy,
  Cpu,
  LayoutTemplate,
  MonitorSmartphone,
  Pencil,
  RefreshCw,
  RotateCcw,
  Trash2,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import {
  ALERT_MODES,
  createLayoutFromTemplate,
  createWidgetMedia,
  defaultAlertForm,
  defaultDiningMenuForm,
  defaultGroupForm,
  defaultLayoutForm,
  DINING_DAY_LABELS,
  DISPLAY_GROUPS,
  duplicateLayout,
  layoutZoneRowSpan,
  FORGE_DISPLAYS_PLATFORM_MODULES,
  getNextMealPeriod,
  getTodayMeals,
  HEARTBEAT_INTERVAL_SECONDS,
  isDiningMenuDay,
  MEAL_PERIODS,
  mealItemsToText,
  parseMenuText,
  PLAYER_SOFTWARE_VERSION,
  resolveDiningMenu,
  SCREEN_TEMPLATES,
  summarizeAnalytics,
  summarizeDeviceHealth,
  WEEKDAY_KEYS,
  WIDGET_TYPES,
  widgetTypeLabel,
} from "../../lib/digitalDashboard.js";
import LayoutDesignerCanvas from "./LayoutDesignerCanvas.jsx";
import { SignageStickProvisioningGuide } from "./DigitalDashboardShared.jsx";

function ModalShell({ title, wide, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`app-panel max-h-[90vh] w-full overflow-y-auto ${wide ? "max-w-3xl" : "max-w-lg"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-[var(--color-afta-border)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">{title}</h3>
        </header>
        <div className="space-y-4 px-5 py-4">{children}</div>
        <footer className="flex justify-end gap-2 border-t border-[var(--color-afta-border)] px-5 py-4">{footer}</footer>
      </div>
    </div>
  );
}

function SectionToolbar({ title, detail, addLabel, onAdd, canEdit }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-afta-border)] px-4 py-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">{title}</h3>
        <p className="text-xs text-[var(--color-afta-muted)]">{detail}</p>
      </div>
      {canEdit && onAdd ? (
        <button type="button" className="app-btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs" onClick={onAdd}>
          <CirclePlus className="h-4 w-4" />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

export function DigitalDashboardGroupsSection({
  groups = [],
  displays = [],
  canEdit,
  onSaveGroup,
  onDeleteGroup,
}) {
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  function patchForm(next) {
    setModal((current) => ({ ...current, form: { ...current.form, ...next } }));
  }

  function toggleDisplay(displayId) {
    const ids = new Set(modal.form.displayIds || []);
    if (ids.has(displayId)) ids.delete(displayId);
    else ids.add(displayId);
    patchForm({ displayIds: [...ids] });
  }

  async function submit() {
    if (!canEdit || !onSaveGroup) return;
    setSaving(true);
    try {
      await onSaveGroup(modal.form);
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="app-panel overflow-hidden">
      <SectionToolbar
        title="Display groups"
        detail="Organize screens by lobby, classrooms, testing center, housing, dining hall, and executive offices"
        addLabel="Add group"
        onAdd={() => setModal({ form: defaultGroupForm() })}
        canEdit={canEdit}
      />
      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.length ? (
          groups.map((group) => (
            <article key={group.id} className="rounded-[12px] border border-[var(--color-afta-border)] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-afta-text)]">{group.name}</h4>
                  <p className="text-xs text-[var(--color-afta-muted)]">
                    {DISPLAY_GROUPS.find((item) => item.value === group.groupKey)?.label || group.groupKey}
                  </p>
                </div>
                <Users className="h-4 w-4 text-[var(--color-afta-red)]" />
              </div>
              <p className="mt-2 text-xs text-[var(--color-afta-subtle)]">{group.description || "No description"}</p>
              <p className="mt-3 text-xs font-semibold text-[var(--color-afta-text)]">
                {(group.displayIds || []).length} display{(group.displayIds || []).length === 1 ? "" : "s"}
              </p>
              {canEdit ? (
                <div className="mt-3 flex gap-2">
                  <button type="button" className="app-btn-secondary p-2" onClick={() => setModal({ form: { ...group, displayIds: [...(group.displayIds || [])] } })}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" className="app-btn-secondary p-2 text-red-600" onClick={() => onDeleteGroup?.(group.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <p className="col-span-full py-8 text-center text-sm text-[var(--color-afta-muted)]">
            Create display groups to schedule content across lobby, classroom, and dining hall screens.
          </p>
        )}
      </div>

      {modal ? (
        <ModalShell
          title={modal.form.id ? "Edit group" : "Add group"}
          wide
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" disabled={saving} className="app-btn-primary px-4 py-2 text-xs" onClick={submit}>Save group</button>
            </>
          }
        >
          <label className="block"><span className="app-label">Group name</span><input className="app-input" value={modal.form.name} onChange={(event) => patchForm({ name: event.target.value })} /></label>
          <label className="block"><span className="app-label">Group type</span><select className="app-input" value={modal.form.groupKey} onChange={(event) => patchForm({ groupKey: event.target.value })}>{DISPLAY_GROUPS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="block"><span className="app-label">Description</span><textarea className="app-input min-h-[60px]" rows={2} value={modal.form.description} onChange={(event) => patchForm({ description: event.target.value })} /></label>
          <fieldset className="rounded-[10px] border border-[var(--color-afta-border)] p-3">
            <legend className="px-1 text-xs font-semibold text-[var(--color-afta-muted)]">Member displays</legend>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
              {displays.map((display) => (
                <label key={display.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={(modal.form.displayIds || []).includes(display.id)} onChange={() => toggleDisplay(display.id)} />
                  {display.name}
                </label>
              ))}
            </div>
          </fieldset>
        </ModalShell>
      ) : null}
    </section>
  );
}

export function DigitalDashboardLayoutsSection({ layouts = [], canEdit, onSaveLayout, onDeleteLayout }) {
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  function openTemplate(templateId) {
    const draft = createLayoutFromTemplate(templateId);
    setModal({ form: { ...draft, name: SCREEN_TEMPLATES.find((item) => item.id === templateId)?.label || "New layout" } });
  }

  function patchForm(next) {
    setModal((current) => ({ ...current, form: { ...current.form, ...next } }));
  }

  async function submit() {
    if (!canEdit || !onSaveLayout) return;
    setSaving(true);
    try {
      await onSaveLayout(modal.form);
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="app-panel overflow-hidden">
      <SectionToolbar
        title="Layout builder"
        detail="Visual drag-and-resize canvas with screen templates for lobby, classroom, testing, executive, housing, and dining hall boards"
        addLabel="New layout"
        onAdd={() => setModal({ form: defaultLayoutForm() })}
        canEdit={canEdit}
      />
      <div className="grid gap-4 p-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Templates</p>
          {SCREEN_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              disabled={!canEdit}
              className="block w-full rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-60"
              onClick={() => openTemplate(template.id)}
            >
              <span className="block text-sm font-semibold text-[var(--color-afta-text)]">{template.label}</span>
              <span className="block text-xs text-[var(--color-afta-muted)]">{template.description}</span>
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {layouts.length ? layouts.map((layout) => (
            <article key={layout.id} className="rounded-[12px] border border-[var(--color-afta-border)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-afta-text)]">{layout.name}</h4>
                  <p className="text-xs text-[var(--color-afta-muted)]">{(layout.zones || []).length} zones · {layout.templateId || "custom"}</p>
                </div>
                <LayoutTemplate className="h-4 w-4 text-[var(--color-afta-red)]" />
              </div>
              <div className="mt-3 grid grid-cols-12 gap-1 rounded-[10px] bg-slate-100 p-2" style={{ gridTemplateRows: "repeat(6, minmax(0, 1fr))" }}>
                {(layout.zones || []).map((zone) => (
                  <div
                    key={zone.id}
                    className="rounded bg-[var(--color-afta-navy)] px-1 py-2 text-center text-[10px] font-semibold text-white"
                    style={{
                      gridColumn: `${(zone.x || 0) + 1} / span ${zone.w}`,
                      gridRow: `${(zone.y || 0) + 1} / span ${layoutZoneRowSpan(zone.h)}`,
                    }}
                  >
                    {widgetTypeLabel(zone.widgetType)}
                  </div>
                ))}
              </div>
              {canEdit ? (
                <div className="mt-3 flex gap-2">
                  <button type="button" className="app-btn-secondary p-2" onClick={() => setModal({ form: { ...layout, zones: [...(layout.zones || [])] } })}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" className="app-btn-secondary p-2" onClick={() => setModal({ form: duplicateLayout(layout) })}>
                    <Copy className="h-4 w-4" />
                  </button>
                  <button type="button" className="app-btn-secondary p-2 text-red-600" onClick={() => onDeleteLayout?.(layout.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </article>
          )) : (
            <p className="py-8 text-center text-sm text-[var(--color-afta-muted)]">Start from a screen template to build multi-zone layouts.</p>
          )}
        </div>
      </div>

      {modal ? (
        <ModalShell
          wide
          title={modal.form.id ? "Edit layout" : "Create layout"}
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" disabled={saving} className="app-btn-primary px-4 py-2 text-xs" onClick={submit}>Save layout</button>
            </>
          }
        >
          <label className="block"><span className="app-label">Layout name</span><input className="app-input" value={modal.form.name} onChange={(event) => patchForm({ name: event.target.value })} /></label>
          <label className="block"><span className="app-label">Template</span><select className="app-input" value={modal.form.templateId} onChange={(event) => patchForm(createLayoutFromTemplate(event.target.value))}>{SCREEN_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <LayoutDesignerCanvas
            zones={modal.form.zones || []}
            canEdit={canEdit}
            onChange={(zones) => patchForm({ zones, templateId: "custom" })}
          />
        </ModalShell>
      ) : null}
    </section>
  );
}

export function DigitalDashboardWidgetsSection({ media = [], canEdit, onSaveMedia }) {
  return (
    <section className="app-panel overflow-hidden">
      <SectionToolbar
        title="Widget library"
        detail="Live data widgets for weather, testing, certifications, housing, LMS progress, dining, and emergency alerts"
        canEdit={false}
      />
      <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {WIDGET_TYPES.map((widget) => {
          const existing = media.filter((item) => item.widgetType === widget.value || item.type === widget.value).length;
          return (
            <article key={widget.value} className="rounded-[12px] border border-[var(--color-afta-border)] p-4">
              <h4 className="text-sm font-semibold text-[var(--color-afta-text)]">{widget.label}</h4>
              <p className="mt-1 text-xs text-[var(--color-afta-muted)]">{widget.description}</p>
              <p className="mt-3 text-xs text-[var(--color-afta-subtle)]">{existing} in media library</p>
              {canEdit ? (
                <button
                  type="button"
                  className="app-btn-secondary mt-3 px-3 py-1.5 text-xs"
                  onClick={() => onSaveMedia?.(createWidgetMedia(widget.value))}
                >
                  Add to library
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function DigitalDashboardDiningSection({
  diningMenus = [],
  playlists = [],
  canEdit,
  onSaveDiningMenu,
  onDeleteDiningMenu,
  onAddDiningMenuToPlaylist,
}) {
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [assignMenuId, setAssignMenuId] = useState("");
  const [assignPlaylistId, setAssignPlaylistId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const activeMenu = useMemo(
    () => resolveDiningMenu(diningMenus) || diningMenus[0] || null,
    [diningMenus],
  );
  const todayMeals = useMemo(() => getTodayMeals(activeMenu), [activeMenu]);
  const nextMeal = useMemo(() => getNextMealPeriod(activeMenu), [activeMenu]);
  const campusDiningOpen = isDiningMenuDay();

  function patchForm(next) {
    setModal((current) => ({ ...current, form: { ...current.form, ...next } }));
  }

  function patchMeal(day, period, value) {
    patchForm({
      [day]: {
        ...(modal.form[day] || {}),
        [period]: parseMenuText(value),
      },
    });
  }

  function patchMenuLines(field, value) {
    patchForm({ [field]: parseMenuText(value) });
  }

  async function submit() {
    if (!canEdit || !onSaveDiningMenu) return;
    setSaving(true);
    try {
      await onSaveDiningMenu(modal.form);
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignToPlaylist(menu) {
    if (!canEdit || !onAddDiningMenuToPlaylist || !assignPlaylistId) return;
    setAssigning(true);
    try {
      await onAddDiningMenuToPlaylist(menu, assignPlaylistId);
      setAssignMenuId("");
      setAssignPlaylistId("");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="app-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Today's meals</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-afta-text)]">
            {campusDiningOpen ? Object.values(todayMeals).flat().length : "—"}
          </p>
          {!campusDiningOpen ? <p className="mt-1 text-xs text-[var(--color-afta-subtle)]">Campus dining Mon–Fri only</p> : null}
        </article>
        <article className="app-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Next meal</p>
          <p className="mt-2 text-sm font-semibold capitalize text-[var(--color-afta-text)]">
            {campusDiningOpen ? nextMeal?.period || "None scheduled" : "Weekend"}
          </p>
        </article>
        <article className="app-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Published menus</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-afta-text)]">{diningMenus.filter((menu) => menu.active !== false).length}</p>
        </article>
        <article className="app-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Special events</p>
          <p className="mt-2 text-sm text-[var(--color-afta-text)]">{(activeMenu?.specialEvents || [])[0] || "None"}</p>
        </article>
      </div>

      <section className="app-panel overflow-hidden">
        <SectionToolbar
          title="Weekly menu management"
          detail="Monday–Friday menus only. Paste one item per line into each meal box."
          addLabel="Add menu"
          onAdd={() => setModal({ form: defaultDiningMenuForm() })}
          canEdit={canEdit}
        />
        <div className="space-y-3 p-4">
          {diningMenus.length ? diningMenus.map((menu) => (
            <article key={menu.id} className="rounded-[12px] border border-[var(--color-afta-border)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-afta-text)]">{menu.name}</h4>
                  <p className="text-xs text-[var(--color-afta-muted)]">Week of {menu.weekStartDate || "—"} · {menu.menuType || "weekly"}</p>
                </div>
                <UtensilsCrossed className="h-4 w-4 text-[var(--color-afta-red)]" />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-5">
                {WEEKDAY_KEYS.map((day) => (
                  <div key={day} className="rounded-[8px] border border-[var(--color-afta-border)] p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
                      {DINING_DAY_LABELS[day]}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-afta-subtle)]">
                      {MEAL_PERIODS.reduce((count, { key }) => count + (menu[day]?.[key]?.length || 0), 0)} items
                    </p>
                  </div>
                ))}
              </div>
              {canEdit ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" className="app-btn-secondary p-2" onClick={() => setModal({ form: { ...menu } })}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" className="app-btn-secondary p-2 text-red-600" onClick={() => onDeleteDiningMenu?.(menu.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {playlists.length && onAddDiningMenuToPlaylist ? (
                    <>
                      <select
                        className="app-input max-w-[180px] py-1.5 text-xs"
                        value={assignMenuId === menu.id ? assignPlaylistId : ""}
                        onChange={(event) => {
                          setAssignMenuId(menu.id);
                          setAssignPlaylistId(event.target.value);
                        }}
                      >
                        <option value="">Add to playlist…</option>
                        {playlists.map((playlist) => (
                          <option key={playlist.id} value={playlist.id}>
                            {playlist.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={assigning || assignMenuId !== menu.id || !assignPlaylistId}
                        className="app-btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
                        onClick={() => handleAssignToPlaylist(menu)}
                      >
                        {assigning && assignMenuId === menu.id ? "Adding…" : "Add to playlist"}
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </article>
          )) : (
            <p className="py-8 text-center text-sm text-[var(--color-afta-muted)]">Publish weekly, monthly, holiday, or special event menus for dining hall displays.</p>
          )}
        </div>
      </section>

      {modal ? (
        <ModalShell
          wide
          title={modal.form.id ? "Edit menu" : "Add menu"}
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" disabled={saving} className="app-btn-primary px-4 py-2 text-xs" onClick={submit}>Save menu</button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="app-label">Menu name</span><input className="app-input" value={modal.form.name} onChange={(event) => patchForm({ name: event.target.value })} /></label>
            <label className="block"><span className="app-label">Week start date</span><input type="date" className="app-input" value={modal.form.weekStartDate} onChange={(event) => patchForm({ weekStartDate: event.target.value })} /></label>
          </div>
          <label className="block"><span className="app-label">Menu type</span><select className="app-input" value={modal.form.menuType || "weekly"} onChange={(event) => patchForm({ menuType: event.target.value })}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="holiday">Holiday</option><option value="special">Special Event</option></select></label>

          <div className="rounded-[10px] border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
            <p className="font-semibold">Copy and paste tips</p>
            <p className="mt-1 leading-relaxed">
              Paste directly into any meal box — one menu item per line. Excel columns, Word lists, and semicolon-separated text are supported.
              Use tags like <span className="font-mono">[Vegetarian]</span> at the end of a line.
            </p>
          </div>

          {WEEKDAY_KEYS.map((day) => (
            <fieldset key={day} className="rounded-[10px] border border-[var(--color-afta-border)] p-4">
              <legend className="px-1 text-sm font-semibold text-[var(--color-afta-text)]">{DINING_DAY_LABELS[day]}</legend>
              <div className="mt-3 grid gap-4 lg:grid-cols-3">
                {MEAL_PERIODS.map(({ key, label }) => (
                  <label key={key} className="block">
                    <span className="app-label">{label}</span>
                    <textarea
                      className="app-input min-h-[160px] resize-y font-mono text-sm leading-relaxed"
                      rows={8}
                      spellCheck={false}
                      value={mealItemsToText(modal.form[day]?.[key])}
                      onChange={(event) => patchMeal(day, key, event.target.value)}
                      placeholder={"Scrambled eggs\nOatmeal [Vegetarian]\nFresh fruit"}
                    />
                    <span className="mt-1 block text-[10px] text-[var(--color-afta-subtle)]">
                      {(modal.form[day]?.[key] || []).length} item{(modal.form[day]?.[key] || []).length === 1 ? "" : "s"}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <label className="block">
            <span className="app-label">Dietary notices</span>
            <textarea
              className="app-input min-h-[100px] resize-y font-mono text-sm leading-relaxed"
              rows={4}
              value={mealItemsToText(modal.form.dietaryNotices)}
              onChange={(event) => patchMenuLines("dietaryNotices", event.target.value)}
              placeholder={"Nut Warning: Peanut butter available at breakfast bar on Wednesdays."}
            />
          </label>
          <label className="block">
            <span className="app-label">Special events</span>
            <textarea
              className="app-input min-h-[100px] resize-y font-mono text-sm leading-relaxed"
              rows={4}
              value={mealItemsToText(modal.form.specialEvents)}
              onChange={(event) => patchMenuLines("specialEvents", event.target.value)}
              placeholder={"Firefighter appreciation cookout — Friday lunch"}
            />
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={modal.form.active !== false} onChange={(event) => patchForm({ active: event.target.checked })} />Menu is active</label>
        </ModalShell>
      ) : null}
    </div>
  );
}

export function DigitalDashboardAlertsSection({
  alerts = [],
  displays = [],
  groups = [],
  canEdit,
  onSaveAlert,
  onDeleteAlert,
}) {
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  function patchForm(next) {
    setModal((current) => ({ ...current, form: { ...current.form, ...next } }));
  }

  function toggleField(field, value) {
    const set = new Set(modal.form[field] || []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    patchForm({ [field]: [...set] });
  }

  async function submit() {
    if (!canEdit || !onSaveAlert) return;
    setSaving(true);
    try {
      await onSaveAlert(modal.form);
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="app-panel overflow-hidden">
      <SectionToolbar
        title="Emergency override"
        detail="Full-screen or scrolling alerts with high-priority override across display groups"
        addLabel="Create alert"
        onAdd={() => setModal({ form: defaultAlertForm() })}
        canEdit={canEdit}
      />
      <div className="space-y-3 p-4">
        {alerts.length ? alerts.map((alert) => (
          <article key={alert.id} className={`rounded-[12px] border p-4 ${alert.active ? "border-red-300 bg-red-50" : "border-[var(--color-afta-border)]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-afta-text)]">{alert.title}</h4>
                <p className="mt-1 text-xs text-[var(--color-afta-muted)]">{alert.message}</p>
              </div>
              <AlertTriangle className={`h-4 w-4 ${alert.active ? "text-red-600" : "text-[var(--color-afta-muted)]"}`} />
            </div>
            <p className="mt-3 text-xs text-[var(--color-afta-subtle)]">
              {ALERT_MODES.find((item) => item.value === alert.mode)?.label || alert.mode} · Priority {alert.priority} · {alert.active ? "Active" : "Inactive"}
            </p>
            {canEdit ? (
              <div className="mt-3 flex gap-2">
                <button type="button" className="app-btn-secondary p-2" onClick={() => setModal({ form: { ...alert, displayIds: [...(alert.displayIds || [])], groupIds: [...(alert.groupIds || [])] } })}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" className="app-btn-secondary px-3 py-1.5 text-xs" onClick={() => onSaveAlert?.({ ...alert, active: !alert.active })}>
                  {alert.active ? "Deactivate" : "Activate"}
                </button>
                <button type="button" className="app-btn-secondary p-2 text-red-600" onClick={() => onDeleteAlert?.(alert.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </article>
        )) : (
          <p className="py-8 text-center text-sm text-[var(--color-afta-muted)]">Create emergency alerts to override normal signage with full-screen or scrolling messages.</p>
        )}
      </div>

      {modal ? (
        <ModalShell
          wide
          title={modal.form.id ? "Edit alert" : "Create alert"}
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" disabled={saving} className="app-btn-primary px-4 py-2 text-xs" onClick={submit}>Save alert</button>
            </>
          }
        >
          <label className="block"><span className="app-label">Alert title</span><input className="app-input" value={modal.form.title} onChange={(event) => patchForm({ title: event.target.value })} /></label>
          <label className="block"><span className="app-label">Message</span><textarea className="app-input min-h-[80px]" rows={3} value={modal.form.message} onChange={(event) => patchForm({ message: event.target.value })} /></label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block"><span className="app-label">Mode</span><select className="app-input" value={modal.form.mode} onChange={(event) => patchForm({ mode: event.target.value })}>{ALERT_MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="block"><span className="app-label">Priority</span><input type="number" min="1" className="app-input" value={modal.form.priority} onChange={(event) => patchForm({ priority: event.target.value })} /></label>
            <label className="block"><span className="app-label">Expires</span><input type="datetime-local" className="app-input" value={modal.form.expiresAt} onChange={(event) => patchForm({ expiresAt: event.target.value })} /></label>
          </div>
          <fieldset className="rounded-[10px] border border-[var(--color-afta-border)] p-3">
            <legend className="px-1 text-xs font-semibold text-[var(--color-afta-muted)]">Target groups</legend>
            <div className="mt-2 space-y-2">
              {groups.map((group) => (
                <label key={group.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={(modal.form.groupIds || []).includes(group.id)} onChange={() => toggleField("groupIds", group.id)} />
                  {group.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="rounded-[10px] border border-[var(--color-afta-border)] p-3">
            <legend className="px-1 text-xs font-semibold text-[var(--color-afta-muted)]">Target displays</legend>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
              {displays.map((display) => (
                <label key={display.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={(modal.form.displayIds || []).includes(display.id)} onChange={() => toggleField("displayIds", display.id)} />
                  {display.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={modal.form.active === true} onChange={(event) => patchForm({ active: event.target.checked })} />Alert is active</label>
        </ModalShell>
      ) : null}
    </section>
  );
}

export function DigitalDashboardAnalyticsSection({ displays = [], playlists = [], media = [], schedules = [] }) {
  const analytics = useMemo(() => summarizeAnalytics(displays, playlists, media, schedules), [displays, playlists, media, schedules]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="app-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Network uptime</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-afta-text)]">{analytics.uptimePercent}%</p>
          <p className="mt-1 text-xs text-[var(--color-afta-subtle)]">{analytics.onlineCount} online · {analytics.offlineCount} offline</p>
        </article>
        <article className="app-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Content views</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-afta-text)]">{analytics.contentViews}</p>
        </article>
        <article className="app-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Playlist usage</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-afta-text)]">{analytics.playlistUsage.length}</p>
        </article>
        <article className="app-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Widget usage</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-afta-text)]">{analytics.widgetUsage.length}</p>
        </article>
      </div>

      <section className="app-panel overflow-hidden">
        <SectionToolbar title="Playlist usage" detail="Displays and schedules assigned to each playlist loop" canEdit={false} />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
              <tr><th className="px-4 py-2">Playlist</th><th className="px-4 py-2">Displays</th><th className="px-4 py-2">Schedules</th></tr>
            </thead>
            <tbody>
              {analytics.playlistUsage.map((row) => (
                <tr key={row.id} className="border-t border-[var(--color-afta-border)]">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.displayCount}</td>
                  <td className="px-4 py-3">{row.scheduleCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="app-panel overflow-hidden">
        <SectionToolbar title="Widget usage" detail="Widgets published in the media library" canEdit={false} />
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {analytics.widgetUsage.length ? analytics.widgetUsage.map((widget) => (
            <article key={widget.value} className="rounded-[12px] border border-[var(--color-afta-border)] p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-[var(--color-afta-text)]">{widget.label}</h4>
                <BarChart3 className="h-4 w-4 text-[var(--color-afta-red)]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--color-afta-text)]">{widget.count}</p>
            </article>
          )) : (
            <p className="col-span-full py-6 text-center text-sm text-[var(--color-afta-muted)]">Add widgets from the Widgets tab to track usage here.</p>
          )}
        </div>
      </section>
    </div>
  );
}

const MODULE_STATUS_CLASS = {
  done: "bg-green-50 text-green-800 border-green-200",
  partial: "bg-amber-50 text-amber-800 border-amber-200",
  future: "bg-slate-50 text-slate-600 border-slate-200",
};

export function DigitalDashboardDevicesSection({
  displays = [],
  playlists = [],
  alerts = [],
  canEdit,
  onRemoteRefresh,
  onRemoteRestart,
  onRemoteAssignPlaylist,
  onRemoteUpdateSoftware,
  onQuickEmergencyAlert,
}) {
  const devices = useMemo(() => summarizeDeviceHealth(displays), [displays]);
  const [assignModal, setAssignModal] = useState(null);

  async function runRemote(action, displayId, extra) {
    if (!canEdit) return;
    if (action === "refresh") await onRemoteRefresh?.(displayId);
    if (action === "restart") await onRemoteRestart?.(displayId);
    if (action === "update") await onRemoteUpdateSoftware?.(displayId, PLAYER_SOFTWARE_VERSION);
    if (action === "emergency") await onQuickEmergencyAlert?.(displayId);
    if (action === "assign" && extra?.playlistId) {
      await onRemoteAssignPlaylist?.(displayId, extra.playlistId);
      setAssignModal(null);
    }
  }

  return (
    <div className="space-y-5">
      <SignageStickProvisioningGuide displays={displays} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="app-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Heartbeat interval</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-afta-text)]">{HEARTBEAT_INTERVAL_SECONDS}s</p>
        </article>
        <article className="app-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Registered devices</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-afta-text)]">{devices.length}</p>
        </article>
        <article className="app-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Online now</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-afta-text)]">{devices.filter((item) => item.heartbeatStatus === "online").length}</p>
        </article>
        <article className="app-panel p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Active alerts</p>
          <p className="mt-2 text-2xl font-bold text-[var(--color-afta-text)]">{alerts.filter((item) => item.active).length}</p>
        </article>
      </div>

      <section className="app-panel overflow-hidden">
        <SectionToolbar
          title="Device health & remote management"
          detail="Monitor last seen, connectivity, storage, and software version. Push refresh, restart, playlist, and update commands."
          canEdit={false}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
              <tr>
                <th className="px-4 py-2">Display</th>
                <th className="px-4 py-2">Asset / Device</th>
                <th className="px-4 py-2">Last seen</th>
                <th className="px-4 py-2">Connectivity</th>
                <th className="px-4 py-2">Storage</th>
                <th className="px-4 py-2">Software</th>
                <th className="px-4 py-2">Remote</th>
              </tr>
            </thead>
            <tbody>
              {devices.length ? devices.map((device) => (
                <tr key={device.id} className="border-t border-[var(--color-afta-border)]">
                  <td className="px-4 py-3">
                    <strong className="block text-sm">{device.name}</strong>
                    <span className="text-xs text-[var(--color-afta-muted)]">{device.location}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>{device.assetId || "—"}</div>
                    <div className="text-[var(--color-afta-muted)]">{device.deviceId || "—"}</div>
                    <div className="font-mono text-[10px] text-[var(--color-afta-subtle)]">{device.macAddress || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{device.lastSeenLabel}</td>
                  <td className="px-4 py-3 text-xs capitalize">{device.connectivityLabel}</td>
                  <td className="px-4 py-3 text-xs">{device.storageLabel}</td>
                  <td className="px-4 py-3 text-xs">{device.softwareVersion || PLAYER_SOFTWARE_VERSION}</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <div className="flex flex-wrap gap-1">
                        <button type="button" className="app-btn-secondary p-2" title="Refresh content" onClick={() => runRemote("refresh", device.id)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="app-btn-secondary p-2" title="Restart display" onClick={() => runRemote("restart", device.id)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="app-btn-secondary p-2" title="Assign playlist" onClick={() => setAssignModal({ displayId: device.id, playlistId: device.playlistId || "" })}>
                          <MonitorSmartphone className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="app-btn-secondary p-2" title="Update software" onClick={() => runRemote("update", device.id)}>
                          <Cpu className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="app-btn-secondary p-2 text-red-600" title="Emergency override" onClick={() => runRemote("emergency", device.id)}>
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-afta-muted)]">—</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--color-afta-muted)]">
                    Register displays with asset ID, device ID, and MAC address to monitor academy wall players.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {assignModal ? (
        <ModalShell
          title="Assign playlist"
          onClose={() => setAssignModal(null)}
          footer={
            <>
              <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={() => setAssignModal(null)}>Cancel</button>
              <button type="button" className="app-btn-primary px-4 py-2 text-xs" onClick={() => runRemote("assign", assignModal.displayId, { playlistId: assignModal.playlistId })}>Assign & refresh</button>
            </>
          }
        >
          <label className="block">
            <span className="app-label">Playlist</span>
            <select className="app-input" value={assignModal.playlistId} onChange={(event) => setAssignModal((current) => ({ ...current, playlistId: event.target.value }))}>
              <option value="">Select playlist</option>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
              ))}
            </select>
          </label>
        </ModalShell>
      ) : null}
    </div>
  );
}

export function DigitalDashboardPlatformSection() {
  const grouped = useMemo(() => {
    const done = FORGE_DISPLAYS_PLATFORM_MODULES.filter((item) => item.status === "done");
    const partial = FORGE_DISPLAYS_PLATFORM_MODULES.filter((item) => item.status === "partial");
    const future = FORGE_DISPLAYS_PLATFORM_MODULES.filter((item) => item.status === "future");
    return { done, partial, future };
  }, []);

  return (
    <div className="space-y-5">
      <section className="app-panel p-5">
        <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">Forge Displays Enterprise Platform</h3>
        <p className="mt-2 text-sm text-[var(--color-afta-muted)]">
          Master MVIX replacement specification for academy signage, operational dashboards, dining services, testing center boards, emergency alerting, and analytics.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[10px] border border-green-200 bg-green-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-green-800">Implemented</dt>
            <dd className="mt-1 text-2xl font-bold text-green-900">{grouped.done.length}</dd>
          </div>
          <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-amber-800">Partial</dt>
            <dd className="mt-1 text-2xl font-bold text-amber-900">{grouped.partial.length}</dd>
          </div>
          <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-700">Future</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-900">{grouped.future.length}</dd>
          </div>
        </dl>
      </section>

      <section className="app-panel overflow-hidden">
        <SectionToolbar title="Platform module roadmap" detail="Tracked against Forge Displays Enterprise MVIX Replacement Specification v1.0" canEdit={false} />
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {FORGE_DISPLAYS_PLATFORM_MODULES.map((module) => (
            <article key={module.id} className={`rounded-[12px] border px-4 py-3 ${MODULE_STATUS_CLASS[module.status] || MODULE_STATUS_CLASS.future}`}>
              <h4 className="text-sm font-semibold">{module.title}</h4>
              <p className="mt-1 text-xs capitalize opacity-80">{module.status}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

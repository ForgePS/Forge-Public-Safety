import { useEffect, useMemo, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import BulkEditBar, {
  BulkInputField,
  BulkSelectField,
  bulkResultMessage,
} from "../../components/BulkEditBar.jsx";
import {
  CLASS_STATUS_LABELS,
  CLASS_STATUSES,
  DELIVERY_TYPES,
  DELIVERY_TYPE_LABELS,
  LOCATION_TYPES,
  LOCATION_TYPE_LABELS,
  bulkUpdateClassSessions,
  filterClassSessions,
  formatClassDates,
  getOpenSeats,
  groupClassSessionsByCourse,
  isOffCampusClass,
  listClassSessions,
} from "../../lib/classes.js";

const NO_CHANGE = "";

export default function ClassesListPage() {
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campusFilter, setCampusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkStatus, setBulkStatus] = useState(NO_CHANGE);
  const [bulkDeliveryType, setBulkDeliveryType] = useState(NO_CHANGE);
  const [bulkLocationType, setBulkLocationType] = useState(NO_CHANGE);
  const [bulkRegistrationDeadline, setBulkRegistrationDeadline] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState(null);
  const [bulkMessage, setBulkMessage] = useState(null);

  async function loadRows() {
    const data = await listClassSessions();
    setSessions(data);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listClassSessions();
        if (active) setSessions(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load scheduled classes.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let rows = filterClassSessions(sessions, search);
    if (statusFilter !== "all") {
      rows = rows.filter((session) => session.status === statusFilter);
    }
    if (campusFilter === "on_campus") {
      rows = rows.filter((session) => !isOffCampusClass(session));
    } else if (campusFilter === "off_campus") {
      rows = rows.filter((session) => isOffCampusClass(session));
    }
    return rows;
  }, [sessions, search, statusFilter, campusFilter]);

  const grouped = useMemo(() => groupClassSessionsByCourse(filtered), [filtered]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((session) => selectedIds.has(session.id));

  function toggleRow(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        filtered.forEach((session) => next.delete(session.id));
      } else {
        filtered.forEach((session) => next.add(session.id));
      }
      return next;
    });
  }

  function toggleGroup(group) {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = group.sessions.every((session) => next.has(session.id));
      if (allSelected) {
        group.sessions.forEach((session) => next.delete(session.id));
      } else {
        group.sessions.forEach((session) => next.add(session.id));
      }
      return next;
    });
  }

  function renderSessionRow(session, groupedView = false) {
    return (
      <tr key={session.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={selectedIds.has(session.id)}
            onChange={() => toggleRow(session.id)}
            aria-label={`Select ${session.courseName}`}
            className="h-4 w-4 accent-[#c8102e]"
          />
        </td>
        <td className="px-4 py-3">
          {groupedView ? (
            <span className="pl-3 text-xs text-[var(--color-afta-muted)]">Session</span>
          ) : (
            <>
              <p className="font-medium text-[var(--color-afta-text)]">{session.courseName}</p>
              <p className="font-mono text-xs text-[#c8102e]">{session.courseNumber}</p>
              {session.deliveryType ? (
                <p className="mt-1 text-[10px] text-[var(--color-afta-muted)]">
                  {DELIVERY_TYPE_LABELS[session.deliveryType] ?? session.deliveryType}
                </p>
              ) : null}
            </>
          )}
        </td>
        <td className="px-4 py-3">{formatClassDates(session)}</td>
        <td className="px-4 py-3">
          <p>{session.location}</p>
          <p className="text-xs text-[var(--color-afta-muted)]">
            {LOCATION_TYPE_LABELS[session.locationType] ?? session.locationType}
          </p>
        </td>
        <td className="px-4 py-3 text-xs">
          {session.instructorNames.length ? session.instructorNames.join(", ") : "—"}
        </td>
        <td className="px-4 py-3">
          {session.enrolledCount} / {session.enrollmentCap}
          <span className="block text-xs text-[var(--color-afta-muted)]">{getOpenSeats(session)} open</span>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              session.status === CLASS_STATUSES.OPEN
                ? "bg-green-500/15 text-green-400"
                : session.status === CLASS_STATUSES.CANCELLED
                  ? "bg-red-500/15 text-red-400"
                  : "bg-slate-500/20 text-slate-400"
            }`}
          >
            {session.status}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/admin/scheduling/${session.id}/skills`}
              className="text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
            >
              Skills
            </Link>
            <Link
              to={`/admin/scheduling/${session.id}/tests`}
              className="text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
            >
              Tests
            </Link>
            <Link
              to={`/admin/scheduling/${session.id}/roster`}
              className="text-xs font-semibold text-[#c8102e] hover:text-[var(--color-afta-text)]"
            >
              Roster
            </Link>
            {session.deliveryType === DELIVERY_TYPES.ON_CAMPUS_HOUSING_REQUIRED ||
            session.housingRequired ? (
              <Link
                to={`/admin/housing/${session.id}`}
                className="text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
              >
                Housing
              </Link>
            ) : null}
            <Link
              to={`/admin/scheduling/${session.id}`}
              className="text-xs font-semibold text-[#c8102e] hover:text-[var(--color-afta-text)]"
            >
              Edit
            </Link>
          </div>
        </td>
      </tr>
    );
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBulkMessage(null);
  }

  async function handleBulkApply() {
    const patch = {};
    if (bulkStatus) patch.status = bulkStatus;
    if (bulkDeliveryType) patch.deliveryType = bulkDeliveryType;
    if (bulkLocationType) patch.locationType = bulkLocationType;
    if (bulkRegistrationDeadline) patch.registrationDeadline = bulkRegistrationDeadline;
    if (bulkNotes.trim()) patch.notes = bulkNotes.trim();

    if (Object.keys(patch).length === 0) {
      setError("Choose at least one field to update.");
      return;
    }

    setBulkSaving(true);
    setError(null);
    setBulkMessage(null);
    try {
      const results = await bulkUpdateClassSessions([...selectedIds], patch);
      setBulkMessage(bulkResultMessage(results));
      await loadRows();
      clearSelection();
      setBulkStatus(NO_CHANGE);
      setBulkDeliveryType(NO_CHANGE);
      setBulkLocationType(NO_CHANGE);
      setBulkRegistrationDeadline("");
      setBulkNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk update failed.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleBulkCancel() {
    if (!window.confirm(`Cancel ${selectedIds.size} selected class session(s)?`)) return;

    setBulkSaving(true);
    setError(null);
    setBulkMessage(null);
    try {
      const results = await bulkUpdateClassSessions([...selectedIds], {
        status: CLASS_STATUSES.CANCELLED,
      });
      setBulkMessage(bulkResultMessage(results));
      await loadRows();
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk cancel failed.");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Classes & Schedule"
        subtitle="Schedule offerings, manage rosters, skills, tests, and certificates"
        actions={
          <Link
            to="/admin/scheduling/new"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Schedule Class
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search course, location, instructor…"
              className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
            />
          </label>
          <select
            value={campusFilter}
            onChange={(event) => setCampusFilter(event.target.value)}
            className="rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none"
          >
            <option value="all">All locations</option>
            <option value="on_campus">On-campus only</option>
            <option value="off_campus">Off-campus only</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none"
          >
            <option value="all">All statuses</option>
            {Object.entries(CLASS_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {bulkMessage ? (
          <p className="rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {bulkMessage}
          </p>
        ) : null}

        <BulkEditBar selectedCount={selectedIds.size} onClear={clearSelection}>
          <div className="grid gap-3 lg:grid-cols-4 xl:grid-cols-5">
            <BulkSelectField
              label="Status"
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value)}
              disabled={bulkSaving || selectedIds.size === 0}
              options={[
                { value: NO_CHANGE, label: "No change" },
                ...Object.entries(CLASS_STATUS_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <BulkSelectField
              label="Delivery type"
              value={bulkDeliveryType}
              onChange={(event) => setBulkDeliveryType(event.target.value)}
              disabled={bulkSaving || selectedIds.size === 0}
              options={[
                { value: NO_CHANGE, label: "No change" },
                ...Object.entries(DELIVERY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <BulkSelectField
              label="Location type"
              value={bulkLocationType}
              onChange={(event) => setBulkLocationType(event.target.value)}
              disabled={bulkSaving || selectedIds.size === 0}
              options={[
                { value: NO_CHANGE, label: "No change" },
                ...Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <BulkInputField
              label="Registration deadline"
              type="date"
              value={bulkRegistrationDeadline}
              onChange={(event) => setBulkRegistrationDeadline(event.target.value)}
              disabled={bulkSaving || selectedIds.size === 0}
            />
            <BulkInputField
              label="Replace notes"
              value={bulkNotes}
              onChange={(event) => setBulkNotes(event.target.value)}
              disabled={bulkSaving || selectedIds.size === 0}
              multiline
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={bulkSaving || selectedIds.size === 0}
              onClick={handleBulkApply}
              className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {bulkSaving ? "Applying…" : "Apply changes"}
            </button>
            <button
              type="button"
              disabled={bulkSaving || selectedIds.size === 0}
              onClick={handleBulkCancel}
              className="app-btn-secondary px-4 py-2 text-xs disabled:opacity-60"
            >
              Cancel selected
            </button>
          </div>
        </BulkEditBar>

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3 font-semibold">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected && filtered.length > 0}
                      onChange={toggleAllFiltered}
                      aria-label="Select all filtered classes"
                      className="h-4 w-4 accent-[#c8102e]"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Instructors</th>
                  <th className="px-4 py-3 font-semibold">Seats</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading scheduled classes…
                    </td>
                  </tr>
                ) : null}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No scheduled classes found.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? grouped.map((group) => {
                      const groupSelected =
                        group.sessions.length > 0 &&
                        group.sessions.every((session) => selectedIds.has(session.id));
                      const firstSession = group.sessions[0];

                      return (
                        <Fragment key={group.key}>
                          <tr className="border-b border-[var(--color-afta-border)] bg-white text-[var(--color-afta-text)]">
                            <td className="px-4 py-3 align-top">
                              <input
                                type="checkbox"
                                checked={groupSelected}
                                onChange={() => toggleGroup(group)}
                                aria-label={`Select all ${group.courseName} sessions`}
                                className="h-4 w-4 accent-[#c8102e]"
                              />
                            </td>
                            <td className="px-4 py-3" colSpan={7}>
                              <p className="font-medium text-[var(--color-afta-text)]">{group.courseName}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-afta-muted)]">
                                <span className="font-mono text-[#c8102e]">{group.courseNumber}</span>
                                <span>
                                  {group.sessions.length} session{group.sessions.length === 1 ? "" : "s"}
                                </span>
                                {firstSession?.deliveryType ? (
                                  <span>
                                    {DELIVERY_TYPE_LABELS[firstSession.deliveryType] ??
                                      firstSession.deliveryType}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                          {group.sessions.map((session) => renderSessionRow(session, true))}
                        </Fragment>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

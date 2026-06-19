import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import BulkEditBar, { BulkInputField, bulkResultMessage } from "../../components/BulkEditBar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUSES,
  approveAcademyRegistration,
  bulkApproveAcademyRegistrations,
  bulkCancelRegistrations,
  bulkDenyAcademyRegistrations,
  bulkUpdateRegistrationNotes,
  denyAcademyRegistration,
  filterRegistrations,
  formatCampusMealLodgingPreference,
  listRegistrations,
} from "../../lib/registrations.js";

export default function AdminRegistrationsPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(REGISTRATION_STATUSES.PENDING_ACADEMY);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkNotes, setBulkNotes] = useState("");
  const [notesMode, setNotesMode] = useState("replace");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState(null);
  const [bulkMessage, setBulkMessage] = useState(null);

  async function loadRows() {
    const rows = await listRegistrations();
    setRegistrations(rows);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        await loadRows();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load registration queue.");
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
    let rows = filterRegistrations(registrations, search);
    if (statusFilter !== "all") {
      rows = rows.filter((registration) => registration.status === statusFilter);
    }
    return rows;
  }, [registrations, search, statusFilter]);

  const selectedRows = useMemo(
    () => registrations.filter((registration) => selectedIds.has(registration.id)),
    [registrations, selectedIds],
  );

  const pendingAcademySelected = selectedRows.filter(
    (registration) => registration.status === REGISTRATION_STATUSES.PENDING_ACADEMY,
  ).length;

  const cancellableSelected = selectedRows.filter((registration) =>
    [
      REGISTRATION_STATUSES.PENDING_DEPARTMENT,
      REGISTRATION_STATUSES.PENDING_ACADEMY,
      REGISTRATION_STATUSES.ENROLLED,
      REGISTRATION_STATUSES.WAITLISTED,
    ].includes(registration.status),
  ).length;

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((registration) => selectedIds.has(registration.id));

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
        filtered.forEach((registration) => next.delete(registration.id));
      } else {
        filtered.forEach((registration) => next.add(registration.id));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBulkMessage(null);
  }

  async function handleApprove(registrationId) {
    setActingId(registrationId);
    setError(null);
    try {
      await approveAcademyRegistration(registrationId, user.uid);
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve registration.");
    } finally {
      setActingId("");
    }
  }

  async function handleDeny(registrationId) {
    const reason = window.prompt("Reason for denial (optional):") ?? "";
    if (reason === null) return;

    setActingId(registrationId);
    setError(null);
    try {
      await denyAcademyRegistration(registrationId, user.uid, reason);
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deny registration.");
    } finally {
      setActingId("");
    }
  }

  async function handleBulkApprove() {
    const ids = selectedRows
      .filter((registration) => registration.status === REGISTRATION_STATUSES.PENDING_ACADEMY)
      .map((registration) => registration.id);

    if (ids.length === 0) {
      setError("No selected registrations are awaiting academy approval.");
      return;
    }

    setBulkSaving(true);
    setError(null);
    setBulkMessage(null);
    try {
      const results = await bulkApproveAcademyRegistrations(ids, user.uid);
      setBulkMessage(bulkResultMessage(results));
      await loadRows();
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk approve failed.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleBulkDeny() {
    const ids = selectedRows
      .filter((registration) => registration.status === REGISTRATION_STATUSES.PENDING_ACADEMY)
      .map((registration) => registration.id);

    if (ids.length === 0) {
      setError("No selected registrations are awaiting academy approval.");
      return;
    }

    const reason = window.prompt("Reason for denial (optional):") ?? "";
    if (reason === null) return;

    setBulkSaving(true);
    setError(null);
    setBulkMessage(null);
    try {
      const results = await bulkDenyAcademyRegistrations(ids, user.uid, reason);
      setBulkMessage(bulkResultMessage(results));
      await loadRows();
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk deny failed.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleBulkCancel() {
    const ids = selectedRows
      .filter((registration) =>
        [
          REGISTRATION_STATUSES.PENDING_DEPARTMENT,
          REGISTRATION_STATUSES.PENDING_ACADEMY,
          REGISTRATION_STATUSES.ENROLLED,
          REGISTRATION_STATUSES.WAITLISTED,
        ].includes(registration.status),
      )
      .map((registration) => registration.id);

    if (ids.length === 0) {
      setError("No selected registrations can be cancelled.");
      return;
    }

    if (!window.confirm(`Cancel ${ids.length} selected registration(s)?`)) return;

    setBulkSaving(true);
    setError(null);
    setBulkMessage(null);
    try {
      const results = await bulkCancelRegistrations(ids);
      setBulkMessage(bulkResultMessage(results));
      await loadRows();
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk cancel failed.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleBulkNotes() {
    if (!bulkNotes.trim()) {
      setError("Enter notes to apply.");
      return;
    }

    setBulkSaving(true);
    setError(null);
    setBulkMessage(null);
    try {
      const results = await bulkUpdateRegistrationNotes(
        [...selectedIds],
        bulkNotes,
        notesMode,
      );
      setBulkMessage(bulkResultMessage(results));
      await loadRows();
      setBulkNotes("");
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk notes update failed.");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Registration Queue" subtitle="Academy approval workflow" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Registration email notifications</h2>
          <p className="mt-2 text-sm text-[var(--color-afta-subtle)]">
            When a student registers, confirmation emails go to the student, department training officer,
            and fire chief (using contact emails on the department record). When you approve a registration,
            the student receives a second email with full class details, prerequisites, and on-campus
            lodging/meal selections.
          </p>
        </section>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, department, course…"
              className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none"
          >
            <option value="all">All statuses</option>
            {Object.entries(REGISTRATION_STATUS_LABELS).map(([value, label]) => (
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

        <BulkEditBar
          selectedCount={selectedIds.size}
          onClear={clearSelection}
          message={
            pendingAcademySelected
              ? `${pendingAcademySelected} awaiting academy approval`
              : undefined
          }
        >
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] xl:grid-cols-[1fr_160px_auto]">
            <BulkInputField
              label="Notes"
              value={bulkNotes}
              onChange={(event) => setBulkNotes(event.target.value)}
              disabled={bulkSaving || selectedIds.size === 0}
              multiline
            />
            <label className="flex flex-col gap-1 text-xs text-[var(--color-afta-muted)]">
              Notes mode
              <select
                value={notesMode}
                onChange={(event) => setNotesMode(event.target.value)}
                disabled={bulkSaving || selectedIds.size === 0}
                className="rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)]"
              >
                <option value="replace">Replace notes</option>
                <option value="append">Append notes</option>
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                disabled={bulkSaving || selectedIds.size === 0}
                onClick={handleBulkNotes}
                className="app-btn-secondary px-4 py-2 text-xs disabled:opacity-60"
              >
                Apply notes
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={bulkSaving || selectedIds.size === 0 || pendingAcademySelected === 0}
              onClick={handleBulkApprove}
              className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              Approve selected ({pendingAcademySelected})
            </button>
            <button
              type="button"
              disabled={bulkSaving || selectedIds.size === 0 || pendingAcademySelected === 0}
              onClick={handleBulkDeny}
              className="app-btn-secondary px-4 py-2 text-xs disabled:opacity-60"
            >
              Deny selected
            </button>
            <button
              type="button"
              disabled={bulkSaving || selectedIds.size === 0 || cancellableSelected === 0}
              onClick={handleBulkCancel}
              className="app-btn-secondary px-4 py-2 text-xs disabled:opacity-60"
            >
              Cancel selected ({cancellableSelected})
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
                      aria-label="Select all filtered registrations"
                      className="h-4 w-4 accent-[#c8102e]"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading registrations…
                    </td>
                  </tr>
                ) : null}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No registrations match this filter.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filtered.map((registration) => (
                      <tr key={registration.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(registration.id)}
                            onChange={() => toggleRow(registration.id)}
                            aria-label={`Select ${registration.studentName}`}
                            className="h-4 w-4 accent-[#c8102e]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--color-afta-text)]">{registration.studentName}</p>
                          <p className="text-xs text-[var(--color-afta-muted)]">{registration.studentEmail}</p>
                        </td>
                        <td className="px-4 py-3">{registration.departmentName || "Independent"}</td>
                        <td className="px-4 py-3">
                          <p>{registration.courseName}</p>
                          <p className="font-mono text-xs text-[#c8102e]">{registration.courseNumber}</p>
                        </td>
                        <td className="px-4 py-3">
                          {registration.classStartDate === registration.classEndDate
                            ? registration.classStartDate
                            : `${registration.classStartDate} – ${registration.classEndDate}`}
                          <p className="text-xs text-[var(--color-afta-muted)]">{registration.classLocation}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-afta-subtle)]">
                            {REGISTRATION_STATUS_LABELS[registration.status] ?? registration.status}
                          </span>
                          {registration.notes ? (
                            <p className="mt-1 text-xs text-[var(--color-afta-muted)]">{registration.notes}</p>
                          ) : null}
                          {formatCampusMealLodgingPreference(registration) ? (
                            <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
                              Campus: {formatCampusMealLodgingPreference(registration)}
                            </p>
                          ) : null}
                          {registration.denialReason ? (
                            <p className="mt-1 text-xs text-[var(--color-afta-muted)]">{registration.denialReason}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {registration.status === REGISTRATION_STATUSES.PENDING_ACADEMY ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={actingId === registration.id || bulkSaving}
                                onClick={() => handleApprove(registration.id)}
                                className="rounded-[8px] bg-[#c8102e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={actingId === registration.id || bulkSaving}
                                onClick={() => handleDeny(registration.id)}
                                className="rounded-[8px] border border-[var(--color-afta-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)] disabled:opacity-60"
                              >
                                Deny
                              </button>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

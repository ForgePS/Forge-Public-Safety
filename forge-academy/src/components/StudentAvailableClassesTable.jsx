import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import {
  CLASS_STATUS_LABELS,
  CLASS_STATUSES,
  LOCATION_TYPE_LABELS,
  formatClassDates,
  formatClassHours,
  getOpenSeats,
  groupClassSessionsByCourse,
  sortClassSessionsByCourseAndDate,
} from "../lib/classes.js";

/** @param {import('../lib/classes.js').ClassSessionRecord} session */
function statusBadgeClass(session) {
  if (session.status === CLASS_STATUSES.OPEN) return "bg-green-500/15 text-green-400";
  if (session.status === CLASS_STATUSES.WAITLIST) return "bg-amber-500/15 text-amber-300";
  if (session.status === CLASS_STATUSES.FULL) return "bg-slate-500/20 text-slate-400";
  return "bg-slate-500/20 text-slate-400";
}

/** @param {import('../lib/classes.js').ClassSessionRecord} session */
function canRegister(session) {
  return [CLASS_STATUSES.OPEN, CLASS_STATUSES.WAITLIST].includes(session.status);
}

/** @param {import('../lib/classes.js').ClassSessionRecord} session */
function courseDescriptionText(session) {
  return session.catalogDescription?.trim() || "No description is available for this course.";
}

/**
 * @param {{
 *   session: import('../lib/classes.js').ClassSessionRecord,
 *   onClose: () => void,
 * }} props
 */
function CourseDescriptionDialog({ session, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const description = courseDescriptionText(session);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[max(1rem,8vh)] sm:p-6">
      <button
        type="button"
        aria-label="Close course description"
        className="absolute inset-0 bg-[var(--color-afta-bg)]/80 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-description-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[18px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-afta-border)] px-5 py-4">
          <div>
            <h3 id="course-description-title" className="text-base font-semibold text-[var(--color-afta-text)]">
              {session.courseName || "Untitled course"}
            </h3>
            <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
              {session.courseNumber || "—"}
              {session.catalogHours ? ` · ${session.catalogHours} hours` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1.5 text-[var(--color-afta-muted)] hover:bg-white/80 hover:text-[var(--color-afta-text)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-afta-text)]">
            {description}
          </p>
          {session.catalogPrerequisites?.trim() ? (
            <div className="mt-4 border-t border-[var(--color-afta-border)] pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                Prerequisites
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-afta-text)]">
                {session.catalogPrerequisites.trim()}
              </p>
            </div>
          ) : null}
        </div>

        <div className="border-t border-[var(--color-afta-border)] px-5 py-4">
          <button type="button" onClick={onClose} className="app-btn-secondary px-4 py-2 text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   session: import('../lib/classes.js').ClassSessionRecord,
 *   onShowDescription: (session: import('../lib/classes.js').ClassSessionRecord) => void,
 * }} props
 */
function CourseTitleButton({ session, onShowDescription }) {
  return (
    <button
      type="button"
      onClick={() => onShowDescription(session)}
      className="text-left font-medium text-[var(--color-afta-text)] underline decoration-transparent underline-offset-2 transition hover:text-[#c8102e] hover:decoration-[#c8102e]/40"
    >
      {session.courseName || "Untitled course"}
    </button>
  );
}

/**
 * @param {{
 *   sessions: import('../lib/classes.js').ClassSessionRecord[],
 *   loading?: boolean,
 *   compact?: boolean,
 *   title?: string,
 *   subtitle?: string,
 *   emptyMessage?: string,
 *   hideSearch?: boolean,
 *   selectedClassId?: string,
 *   onSelectSession?: (sessionId: string) => void,
 *   groupByCourse?: boolean,
 * }} props
 */
export default function StudentAvailableClassesTable({
  sessions,
  loading = false,
  compact = false,
  title = "Available classes",
  subtitle,
  emptyMessage = "No available classes match your search.",
  hideSearch = false,
  selectedClassId = "",
  onSelectSession,
  groupByCourse = false,
}) {
  const [search, setSearch] = useState("");
  const [descriptionSession, setDescriptionSession] = useState(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = term
      ? sessions.filter((session) =>
          [
            session.courseName,
            session.courseNumber,
            session.location,
            session.catalogCourseName,
            LOCATION_TYPE_LABELS[session.locationType],
          ]
            .join(" ")
            .toLowerCase()
            .includes(term),
        )
      : sessions;
    return sortClassSessionsByCourseAndDate(rows);
  }, [sessions, search]);

  const grouped = useMemo(
    () => (groupByCourse ? groupClassSessionsByCourse(filtered) : []),
    [filtered, groupByCourse],
  );

  const colSpan = compact ? 6 : 8;

  function renderSessionRow(session) {
    const isSelected = selectedClassId === session.id;

    return (
      <tr
        key={session.id}
        className={`border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)] transition ${
          isSelected ? "bg-[#c8102e]/10" : "hover:bg-white/80"
        }`}
      >
        <td className="px-4 py-3">
          <CourseTitleButton session={session} onShowDescription={setDescriptionSession} />
          <p className="text-xs text-[var(--color-afta-muted)]">
            {session.courseNumber || "—"} · {LOCATION_TYPE_LABELS[session.locationType] ?? session.locationType}
          </p>
        </td>
        <td className="px-4 py-3">{session.location || "—"}</td>
        <td className="px-4 py-3 whitespace-nowrap">{formatClassDates(session)}</td>
        {!compact ? (
          <td className="px-4 py-3 whitespace-nowrap">{formatClassHours(session)}</td>
        ) : null}
        {!compact ? (
          <td className="px-4 py-3 whitespace-nowrap">{session.registrationDeadline || "—"}</td>
        ) : null}
        <td className="px-4 py-3">
          {getOpenSeats(session)}
          {session.enrollmentCap ? ` / ${session.enrollmentCap}` : ""}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(session)}`}
          >
            {session.status === CLASS_STATUSES.OPEN ? (
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            ) : null}
            {CLASS_STATUS_LABELS[session.status] ?? session.status}
          </span>
        </td>
        <td className="px-4 py-3">
          {canRegister(session) ? (
            onSelectSession ? (
              <button
                type="button"
                onClick={() => onSelectSession(session.id)}
                className={`inline-flex rounded-[8px] border px-3 py-1.5 text-xs font-semibold ${
                  isSelected
                    ? "border-[#c8102e]/60 bg-[#c8102e] text-white"
                    : "border-[var(--color-afta-border)] text-[#c8102e] hover:border-[#c8102e]/40 hover:text-[var(--color-afta-text)]"
                }`}
              >
                {isSelected ? "Selected" : "Select"}
              </button>
            ) : (
              <Link
                to={`/student/register?classId=${session.id}`}
                className="inline-flex rounded-[8px] border border-[var(--color-afta-border)] px-3 py-1.5 text-xs font-semibold text-[#c8102e] hover:border-[#c8102e]/40 hover:text-[var(--color-afta-text)]"
              >
                Register
              </Link>
            )
          ) : (
            <span className="text-xs text-[var(--color-afta-muted)]">Full</span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[var(--color-afta-border)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">{title}</h2>
            <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
              {subtitle ??
                (loading ? "Loading…" : `${filtered.length} open session${filtered.length === 1 ? "" : "s"}`)}
            </p>
          </div>
          {!hideSearch ? (
            <label className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search classes…"
                className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-white py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
              />
            </label>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-afta-border)] bg-white text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                <th className="px-4 py-3 font-semibold">Course</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Dates</th>
                {!compact ? <th className="px-4 py-3 font-semibold">Hours</th> : null}
                {!compact ? <th className="px-4 py-3 font-semibold">Register by</th> : null}
                <th className="px-4 py-3 font-semibold">Seats</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                    Loading available classes…
                  </td>
                </tr>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                    {emptyMessage}
                  </td>
                </tr>
              ) : null}

              {!loading && groupByCourse
                ? grouped.flatMap((group) => [
                    <tr key={`${group.key}-header`} className="border-b border-[var(--color-afta-border)] bg-white">
                      <td colSpan={colSpan} className="px-4 py-3">
                        <CourseTitleButton
                          session={group.sessions[0]}
                          onShowDescription={setDescriptionSession}
                        />
                        <p className="text-xs text-[var(--color-afta-muted)]">
                          {group.courseNumber} · {group.sessions.length} open session
                          {group.sessions.length === 1 ? "" : "s"}
                        </p>
                      </td>
                    </tr>,
                    ...group.sessions.map((session) => renderSessionRow(session)),
                  ])
                : null}

              {!loading && !groupByCourse ? filtered.map((session) => renderSessionRow(session)) : null}
            </tbody>
          </table>
        </div>
      </section>

      {descriptionSession ? (
        <CourseDescriptionDialog
          session={descriptionSession}
          onClose={() => setDescriptionSession(null)}
        />
      ) : null}
    </>
  );
}

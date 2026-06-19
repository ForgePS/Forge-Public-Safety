import { useEffect, useMemo, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import {
  DELIVERY_TYPE_LABELS,
  formatClassDates,
  groupClassSessionsByCourse,
  isHousingRequired,
  listClassSessions,
  sortClassSessionsByCourseAndDate,
} from "../../lib/classes.js";
import { getHousingRosterSummary } from "../../lib/housingRosters.js";

export default function AdminHousingClassesPage() {
  const [sessions, setSessions] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const data = await listClassSessions();
        const housingClasses = data.filter((session) => isHousingRequired(session));
        if (!active) return;
        setSessions(housingClasses);

        const next = {};
        await Promise.all(
          housingClasses.map(async (session) => {
            next[session.id] = await getHousingRosterSummary(session.id);
          }),
        );
        if (active) setSummaries(next);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load housing classes.");
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
    const term = search.trim().toLowerCase();
    const rows = term
      ? sessions.filter((session) =>
          [session.courseName, session.courseNumber, session.location, DELIVERY_TYPE_LABELS[session.deliveryType]]
            .join(" ")
            .toLowerCase()
            .includes(term),
        )
      : sessions;
    return sortClassSessionsByCourseAndDate(rows);
  }, [sessions, search]);

  const grouped = useMemo(() => groupClassSessionsByCourse(filtered), [filtered]);

  return (
    <>
      <PageHeader
        title="Campus Housing"
        subtitle="On-campus classes requiring room assignments"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/housing/rooms"
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Manage rooms
            </Link>
            <Link
              to="/admin/housing/reports"
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Reports
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <label className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search housing classes…"
            className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
          />
        </label>

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading housing classes…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">
            No on-campus housing classes yet. Edit a class session and set delivery type to on-campus housing
            required.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Enrolled</th>
                  <th className="px-4 py-3 font-semibold">Assigned</th>
                  <th className="px-4 py-3 font-semibold">Needing rooms</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {grouped.map((group) => (
                  <Fragment key={group.key}>
                    <tr className="border-b border-[var(--color-afta-border)] bg-white text-[var(--color-afta-text)]">
                      <td className="px-4 py-3" colSpan={6}>
                        <p className="font-medium text-[var(--color-afta-text)]">{group.courseName}</p>
                        <p className="text-xs text-[var(--color-afta-muted)]">
                          {group.courseNumber} · {group.sessions.length} session
                          {group.sessions.length === 1 ? "" : "s"}
                        </p>
                      </td>
                    </tr>
                    {group.sessions.map((session) => {
                      const summary = summaries[session.id];
                      const needing = summary?.needingAssignment ?? "—";
                      return (
                        <tr key={session.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                          <td className="px-4 py-3">
                            <span className="pl-3 text-xs text-[var(--color-afta-muted)]">Session</span>
                          </td>
                          <td className="px-4 py-3">{formatClassDates(session)}</td>
                          <td className="px-4 py-3">{summary?.enrolledCount ?? "—"}</td>
                          <td className="px-4 py-3">{summary?.assignedCount ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={Number(needing) > 0 ? "text-[#fca5a5]" : ""}>{needing}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              to={`/admin/housing/${session.id}`}
                              className="text-xs font-semibold text-[#c8102e] hover:underline"
                            >
                              Assign rooms →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

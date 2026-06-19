import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  CLASS_STATUS_LABELS,
  LOCATION_TYPE_LABELS,
  filterClassSessions,
  formatClassDates,
  getOpenSeats,
  groupClassSessionsByCourse,
  listClassSessionsByInstructor,
} from "../../lib/classes.js";

export default function InstructorClassesPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listClassSessionsByInstructor(user.uid);
        if (active) setSessions(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load assigned classes.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const filtered = useMemo(() => filterClassSessions(sessions, search), [sessions, search]);
  const grouped = useMemo(() => groupClassSessionsByCourse(filtered), [filtered]);

  return (
    <>
      <PageHeader title="My Classes" subtitle="Assigned class sessions" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search assigned classes…"
            className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
          />
        </label>

        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading assigned classes…</p>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <div key={group.key} className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--color-afta-text)]">{group.courseName}</h2>
                  <p className="text-xs text-[var(--color-afta-muted)]">
                    {group.courseNumber} · {group.sessions.length} session
                    {group.sessions.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.sessions.map((session) => (
                    <article
                      key={session.id}
                      className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
                    >
                      <p className="font-mono text-[11px] font-bold text-[#c8102e]">{session.courseNumber}</p>
                      <h3 className="mt-2 text-sm font-semibold text-[var(--color-afta-text)]">{formatClassDates(session)}</h3>
                      <p className="mt-3 text-sm text-[var(--color-afta-text)]">
                        {session.location} · {LOCATION_TYPE_LABELS[session.locationType]}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase">
                        <span className="rounded-full bg-white px-2 py-0.5 text-[var(--color-afta-subtle)]">
                          {CLASS_STATUS_LABELS[session.status] ?? session.status}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[var(--color-afta-subtle)]">
                          {session.enrolledCount}/{session.enrollmentCap} enrolled
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[var(--color-afta-subtle)]">
                          {getOpenSeats(session)} open
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          to={`/instructor/attendance/${session.id}`}
                          className="rounded-[10px] bg-[#c8102e] px-3 py-2 text-xs font-bold text-white"
                        >
                          Take attendance
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">No assigned classes found.</p>
        ) : null}
      </div>
    </>
  );
}

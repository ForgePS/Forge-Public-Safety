import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  getIncompleteAttendanceDates,
  listAttendanceDaysForClass,
} from "../../lib/attendance.js";
import {
  CLASS_STATUS_LABELS,
  formatClassDates,
  listClassSessionsByInstructor,
} from "../../lib/classes.js";

export default function InstructorAttendancePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
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
        const sessions = await listClassSessionsByInstructor(user.uid);
        const enriched = await Promise.all(
          sessions.map(async (session) => {
            const attendanceDays = await listAttendanceDaysForClass(session.id);
            const incompleteDates = getIncompleteAttendanceDates(session, attendanceDays);
            return { session, incompleteDates };
          }),
        );
        if (active) setRows(enriched);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load attendance classes.");
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(({ session }) =>
      [session.courseName, session.courseNumber, session.location]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [rows, search]);

  return (
    <>
      <PageHeader title="Attendance" subtitle="Take daily attendance for assigned classes" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search classes…"
            className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
          />
        </label>

        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading classes…</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(({ session, incompleteDates }) => (
              <article
                key={session.id}
                className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
              >
                <p className="font-mono text-[11px] font-bold text-[#c8102e]">{session.courseNumber}</p>
                <h2 className="mt-2 text-base font-semibold text-[var(--color-afta-text)]">{session.courseName}</h2>
                <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">{formatClassDates(session)}</p>
                <p className="mt-3 text-xs text-[var(--color-afta-muted)]">
                  {CLASS_STATUS_LABELS[session.status] ?? session.status} · {session.enrolledCount} enrolled
                </p>
                <p className="mt-3 text-sm text-[var(--color-afta-text)]">
                  {incompleteDates.length
                    ? `${incompleteDates.length} day(s) need finalized attendance`
                    : "Attendance up to date"}
                </p>
                <Link
                  to={`/instructor/attendance/${session.id}`}
                  className="mt-4 inline-flex rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
                >
                  Take attendance
                </Link>
              </article>
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

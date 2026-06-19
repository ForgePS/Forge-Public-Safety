import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  filterClassSessions,
  formatClassDates,
  listClassSessionsByInstructor,
} from "../../lib/classes.js";
import { getCourse } from "../../lib/courses.js";

export default function InstructorSkillsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [skillsRequiredMap, setSkillsRequiredMap] = useState({});
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
        const rows = await listClassSessionsByInstructor(user.uid);
        const courseFlags = {};
        for (const session of rows) {
          if (!courseFlags[session.courseId]) {
            const course = await getCourse(session.courseId);
            courseFlags[session.courseId] = Boolean(course?.skillsRequired);
          }
        }
        if (active) {
          setSessions(rows);
          setSkillsRequiredMap(courseFlags);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load classes.");
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

  const filtered = useMemo(
    () =>
      filterClassSessions(sessions, search).filter((session) => skillsRequiredMap[session.courseId]),
    [sessions, search, skillsRequiredMap],
  );

  return (
    <>
      <PageHeader title="Skills Sheets" subtitle="Digital practical skills evaluations" />

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
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">No skills-required classes assigned.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((session) => (
              <article
                key={session.id}
                className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
              >
                <p className="font-mono text-[11px] font-bold text-[#c8102e]">{session.courseNumber}</p>
                <h2 className="mt-2 text-base font-semibold text-[var(--color-afta-text)]">{session.courseName}</h2>
                <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">{formatClassDates(session)}</p>
                <Link
                  to={`/instructor/skills/${session.id}`}
                  className="mt-4 inline-flex rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
                >
                  Open skill sheets
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

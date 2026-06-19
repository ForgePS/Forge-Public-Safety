import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  formatClassDates,
  isHousingRequired,
  listClassSessionsByInstructor,
} from "../../lib/classes.js";
import { getHousingRosterSummary } from "../../lib/housingRosters.js";

export default function InstructorHousingPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    listClassSessionsByInstructor(user.uid)
      .then(async (rows) => {
        const housingClasses = rows.filter((session) => isHousingRequired(session));
        setSessions(housingClasses);
        const next = {};
        await Promise.all(
          housingClasses.map(async (session) => {
            next[session.id] = await getHousingRosterSummary(session.id);
          }),
        );
        setSummaries(next);
      })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  return (
    <>
      <PageHeader title="Class Housing Rosters" subtitle="Read-only housing view for assigned classes" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading housing classes…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">No on-campus housing classes assigned to you.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {sessions.map((session) => {
              const summary = summaries[session.id];
              return (
                <section
                  key={session.id}
                  className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
                >
                  <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">{session.courseName}</h2>
                  <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
                    {formatClassDates(session)} · {summary?.assignedCount ?? 0} assigned ·{" "}
                    {summary?.checkedInCount ?? 0} checked in
                  </p>
                  <Link
                    to={`/instructor/housing/${session.id}`}
                    className="mt-4 inline-block text-xs font-semibold text-[#c8102e] hover:underline"
                  >
                    View housing roster →
                  </Link>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { formatClassDates, getClassSession } from "../../lib/classes.js";
import { summarizeClassSkillDashboard } from "../../lib/skillEvaluations.js";

export default function InstructorClassSkillsPage() {
  const { classId } = useParams();
  const [classSession, setClassSession] = useState(null);
  const [dashboard, setDashboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!classId) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [session, rows] = await Promise.all([
          getClassSession(classId),
          summarizeClassSkillDashboard(classId),
        ]);
        if (active) {
          setClassSession(session);
          setDashboard(rows);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load skill dashboard.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [classId]);

  return (
    <>
      <PageHeader
        title="Class Skill Sheets"
        subtitle={
          classSession
            ? `${classSession.courseNumber} · ${formatClassDates(classSession)}`
            : "Evaluate student skills"
        }
        actions={
          <Link
            to="/instructor/skills"
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Back to skills
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading…</p>
        ) : dashboard.length === 0 ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">
            Skill sheets have not been initialized for this class. Ask academy admin to initialize from the
            class skills dashboard.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {dashboard.map((row) => (
              <article
                key={row.studentId}
                className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
              >
                <h2 className="text-base font-semibold text-[var(--color-afta-text)]">{row.studentName}</h2>
                <p className="mt-2 text-sm text-[var(--color-afta-subtle)]">
                  {row.summary.pass}/{row.summary.total} skills complete · {row.summary.pending} pending
                </p>
                <Link
                  to={`/instructor/skills/${classId}/evaluate/${row.studentId}`}
                  className="mt-4 inline-flex rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
                >
                  Evaluate skills
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

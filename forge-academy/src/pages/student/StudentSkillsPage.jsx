import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getStudentForUser } from "../../lib/students.js";
import {
  listSkillEvaluationsByStudent,
  SKILL_EVALUATION_STATUS_LABELS,
} from "../../lib/skillEvaluations.js";

export default function StudentSkillsPage() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const student = await getStudentForUser(user);
        if (!student) {
          if (active) setEvaluations([]);
          return;
        }
        const rows = await listSkillEvaluationsByStudent(student.id);
        if (active) setEvaluations(rows);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load skill progress.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const evaluation of evaluations) {
      const key = `${evaluation.classId}-${evaluation.skillName}`;
      if (!map.has(key)) {
        map.set(key, evaluation);
      }
    }
    return [...map.values()].sort((a, b) => a.skillName.localeCompare(b.skillName));
  }, [evaluations]);

  return (
    <>
      <PageHeader title="My Skills Progress" subtitle="Practical skills evaluations" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading skills…</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">
            No skill evaluations on file yet. Skills appear here after your instructor completes practical
            evaluations.
          </p>
        ) : (
          <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                    <th className="px-4 py-3">Skill</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Evaluator</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((evaluation) => (
                    <tr key={evaluation.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3 font-medium text-[var(--color-afta-text)]">{evaluation.skillName}</td>
                      <td className="px-4 py-3">
                        {evaluation.score}/{evaluation.maxScore}
                      </td>
                      <td className="px-4 py-3">
                        {SKILL_EVALUATION_STATUS_LABELS[evaluation.status] ?? evaluation.status}
                      </td>
                      <td className="px-4 py-3">{evaluation.evaluatorName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

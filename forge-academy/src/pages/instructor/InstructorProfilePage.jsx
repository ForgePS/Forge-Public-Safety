import { useEffect, useState } from "react";
import PageHeader, { StatCard } from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  getInstructorAnalytics,
  getTeachingHistory,
  listAssignmentsByInstructorUserId,
} from "../../lib/instructorAssignments.js";
import { countExpiringCertifications, listInstructorCertifications } from "../../lib/instructorCertifications.js";
import { listInstructorAvailability } from "../../lib/instructorAvailability.js";
import { averageEvaluationRating, listInstructorEvaluations } from "../../lib/instructorEvaluations.js";
import { getInstructorByUserId, instructorDisplayName } from "../../lib/instructors.js";

export default function InstructorProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [certifications, setCertifications] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState({ upcoming: 0, completed: 0, total: 0 });
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    let active = true;

    async function load() {
      setLoading(true);
      try {
        const instructor = await getInstructorByUserId(user.uid);
        if (!instructor) {
          if (active) setProfile(null);
          return;
        }

        const [certs, avail, assignments, evaluations] = await Promise.all([
          listInstructorCertifications(instructor.id),
          listInstructorAvailability(instructor.id),
          listAssignmentsByInstructorUserId(user.uid),
          listInstructorEvaluations(instructor.id),
        ]);

        if (!active) return;
        setProfile(instructor);
        setCertifications(certs);
        setAvailability(avail);
        setHistory(getTeachingHistory(assignments));
        setAnalytics(getInstructorAnalytics(assignments));
        setAvgRating(averageEvaluationRating(evaluations));
      } catch {
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  return (
    <>
      <PageHeader
        title="My Profile"
        subtitle={profile ? instructorDisplayName(profile) : "Instructor credentials and history"}
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading profile…</p>
        ) : !profile ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">
            No instructor profile is linked to your login. Ask an administrator to link your account in
            Admin → Instructors.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Upcoming Classes" value={analytics.upcoming} sub="Scheduled assignments" />
              <StatCard label="Classes Taught" value={analytics.completed} sub="Teaching history" />
              <StatCard
                label="Expiring Credentials"
                value={countExpiringCertifications(certifications)}
                sub="Next 45 days"
                warn={countExpiringCertifications(certifications) > 0}
              />
              <StatCard label="Avg. Evaluation" value={avgRating || "—"} sub="Student feedback" />
            </div>

            <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-afta-text)]">Profile</h2>
              <p className="text-sm text-[var(--color-afta-text)]">{profile.email}</p>
              <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
                {profile.specialties.length ? profile.specialties.join(" · ") : "No specialties listed"}
              </p>
              {profile.bio ? <p className="mt-3 text-sm text-[var(--color-afta-subtle)]">{profile.bio}</p> : null}
            </section>

            <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-afta-text)]">Credentials</h2>
              {certifications.length === 0 ? (
                <p className="text-sm text-[var(--color-afta-subtle)]">No credentials on file.</p>
              ) : (
                <ul className="space-y-2 text-sm text-[var(--color-afta-text)]">
                  {certifications.map((cert) => (
                    <li key={cert.id} className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2">
                      {cert.name} · expires {cert.expirationDate || "—"}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-afta-text)]">Teaching history</h2>
              {history.length === 0 ? (
                <p className="text-sm text-[var(--color-afta-subtle)]">No completed classes yet.</p>
              ) : (
                <ul className="space-y-2 text-sm text-[var(--color-afta-text)]">
                  {history.slice(0, 8).map((assignment) => (
                    <li key={assignment.id} className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2">
                      {assignment.courseName} · {assignment.startDate}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-afta-text)]">Availability notes</h2>
              {availability.length === 0 ? (
                <p className="text-sm text-[var(--color-afta-subtle)]">No availability blocks recorded.</p>
              ) : (
                <ul className="space-y-2 text-sm text-[var(--color-afta-text)]">
                  {availability.map((row) => (
                    <li key={row.id}>
                      {row.startDate} – {row.endDate} · {row.availabilityType}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

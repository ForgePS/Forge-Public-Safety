import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { CERTIFICATE_STATUSES, listCertificatesByStudent } from "../../lib/certificates.js";
import { getStudentForUser } from "../../lib/students.js";

export default function StudentCertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
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
          if (active) setCertificates([]);
          return;
        }
        const rows = await listCertificatesByStudent(student.id);
        if (active) setCertificates(rows);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load certificates.");
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

  return (
    <>
      <PageHeader title="My Certificates" subtitle="Course completion certificates" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading certificates…</p>
        ) : certificates.length === 0 ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">
            No certificates on file yet. Certificates appear here after you complete a class and the
            academy issues your certificate.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {certificates.map((certificate) => {
              const pendingRelease = certificate.status === CERTIFICATE_STATUSES.PENDING_RELEASE;
              return (
                <article
                  key={certificate.id}
                  className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
                >
                  <p className="font-mono text-[11px] font-bold text-[#c8102e]">
                    {certificate.certificateNumber}
                  </p>
                  <h2 className="mt-2 text-base font-semibold text-[var(--color-afta-text)]">{certificate.courseName}</h2>
                  <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
                    {pendingRelease
                      ? "Pending academy review before release"
                      : `Issued ${certificate.completionDate} · ${certificate.hours} hours`}
                  </p>
                  {pendingRelease ? (
                    <span className="mt-4 inline-flex rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
                      Pending review
                    </span>
                  ) : (
                    <Link
                      to={`/student/certificates/${certificate.id}`}
                      className="mt-4 inline-flex rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
                    >
                      View certificate
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

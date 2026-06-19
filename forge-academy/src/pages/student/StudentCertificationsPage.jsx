import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getStudentForUser } from "../../lib/students.js";
import {
  listStudentCertificationsByStudent,
  STUDENT_CERTIFICATION_STATUS_LABELS,
} from "../../lib/studentCertifications.js";

export default function StudentCertificationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const student = await getStudentForUser(user);
        if (!student) {
          if (active) setRows([]);
          return;
        }
        const data = await listStudentCertificationsByStudent(student.id);
        if (active) setRows(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load certifications.");
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
      <PageHeader title="Certification Status" subtitle="Professional credentials and renewals" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Certification</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No certifications on file yet.</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3 font-medium text-[var(--color-afta-text)]">{row.certificationName}</td>
                      <td className="px-4 py-3">{row.expiryDate || "—"}</td>
                      <td className="px-4 py-3">{STUDENT_CERTIFICATION_STATUS_LABELS[row.status] ?? row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

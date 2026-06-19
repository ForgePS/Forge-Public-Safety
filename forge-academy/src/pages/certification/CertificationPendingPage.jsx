import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  approveStudentCertification,
  denyStudentCertification,
  listPendingStudentCertifications,
  STUDENT_CERTIFICATION_STATUS_LABELS,
} from "../../lib/studentCertifications.js";

export default function CertificationPendingPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function reload() {
    setRows(await listPendingStudentCertifications());
  }

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load queue."))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(certificationId) {
    if (!user?.uid) return;
    setActingId(certificationId);
    setError(null);
    try {
      await approveStudentCertification({
        certificationId,
        officerUid: user.uid,
        officerName: user.displayName ?? user.email ?? "",
      });
      await reload();
      setMessage("Certification approved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve certification.");
    } finally {
      setActingId("");
    }
  }

  async function handleDeny(certificationId) {
    if (!user?.uid) return;
    const notes = window.prompt("Reason for denial (optional):") ?? "";
    setActingId(certificationId);
    setError(null);
    try {
      await denyStudentCertification({
        certificationId,
        officerUid: user.uid,
        officerName: user.displayName ?? user.email ?? "",
        notes,
      });
      await reload();
      setMessage("Certification denied.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deny certification.");
    } finally {
      setActingId("");
    }
  }

  return (
    <>
      <PageHeader title="Pending Review" subtitle="Certifications awaiting officer approval" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">{message}</p> : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Certification</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No pending certifications.</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3">{row.studentName}</td>
                      <td className="px-4 py-3">{row.certificationName}</td>
                      <td className="px-4 py-3">{row.courseName}</td>
                      <td className="px-4 py-3">{STUDENT_CERTIFICATION_STATUS_LABELS[row.status] ?? row.status}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button type="button" disabled={actingId === row.id} onClick={() => handleApprove(row.id)} className="text-xs text-green-400">Approve</button>
                          <button type="button" disabled={actingId === row.id} onClick={() => handleDeny(row.id)} className="text-xs text-[#c8102e]">Deny</button>
                        </div>
                      </td>
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

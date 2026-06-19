import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  COMPLETION_STATUS_LABELS,
  listEligibleCompletions,
} from "../../lib/completions.js";
import {
  CERTIFICATE_STATUSES,
  issueCertificate,
  listCertificates,
  revokeCertificate,
} from "../../lib/certificates.js";

export default function AdminCertificatesPage() {
  const { user } = useAuth();
  const [eligible, setEligible] = useState([]);
  const [issued, setIssued] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingKey, setActingKey] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function reload() {
    const [eligibleRows, certificateRows] = await Promise.all([
      listEligibleCompletions(),
      listCertificates(),
    ]);
    setEligible(eligibleRows);
    setIssued(certificateRows);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        await reload();
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
  }, []);

  async function handleIssue(classId, studentId) {
    if (!user?.uid) return;
    const key = `${classId}_${studentId}`;
    setActingKey(key);
    setError(null);
    setMessage(null);
    try {
      await issueCertificate({ classId, studentId, issuedByUid: user.uid });
      await reload();
      setMessage("Certificate issued.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to issue certificate.");
    } finally {
      setActingKey("");
    }
  }

  async function handleRevoke(certificateId) {
    if (!window.confirm("Revoke this certificate?")) return;
    setActingKey(certificateId);
    setError(null);
    try {
      await revokeCertificate(certificateId);
      await reload();
      setMessage("Certificate revoked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke certificate.");
    } finally {
      setActingKey("");
    }
  }

  return (
    <>
      <PageHeader
        title="Completion Certificates"
        subtitle="Issue and print course completion certificates — roster workflow or direct issuance"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/certificates/new"
              className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
            >
              Issue certificate
            </Link>
            <Link
              to="/admin/scheduling"
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Class rosters
            </Link>
            <Link
              to="/admin/testing/certificate-release"
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Exam release queue
            </Link>
            <Link
              to="/admin/certificates/templates"
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Templates
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {message}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Eligible for issuance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading…
                    </td>
                  </tr>
                ) : eligible.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No students are eligible yet. Finalize attendance and evaluate completions from the class roster.
                    </td>
                  </tr>
                ) : (
                  eligible.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3">{row.studentName}</td>
                      <td className="px-4 py-3">{row.courseName}</td>
                      <td className="px-4 py-3">
                        {COMPLETION_STATUS_LABELS[row.status] ?? row.status}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={actingKey === row.id}
                          onClick={() => handleIssue(row.classId, row.studentId)}
                          className="rounded-[8px] bg-[#c8102e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                        >
                          Issue certificate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Issued certificates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Cert #</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && issued.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No certificates issued yet.
                    </td>
                  </tr>
                ) : (
                  issued.map((certificate) => (
                    <tr key={certificate.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3 font-mono text-xs text-[#c8102e]">
                        {certificate.certificateNumber}
                      </td>
                      <td className="px-4 py-3">{certificate.studentName}</td>
                      <td className="px-4 py-3">{certificate.courseName}</td>
                      <td className="px-4 py-3">{certificate.completionDate}</td>
                      <td className="px-4 py-3">{certificate.status}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {certificate.status === CERTIFICATE_STATUSES.ISSUED ? (
                            <>
                              <Link
                                to={`/admin/certificates/${certificate.id}/print`}
                                className="text-xs font-semibold text-[#c8102e]"
                              >
                                Print
                              </Link>
                              <button
                                type="button"
                                disabled={actingKey === certificate.id}
                                onClick={() => handleRevoke(certificate.id)}
                                className="text-xs text-[var(--color-afta-subtle)] hover:text-[#c8102e]"
                              >
                                Revoke
                              </button>
                            </>
                          ) : (
                            "—"
                          )}
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

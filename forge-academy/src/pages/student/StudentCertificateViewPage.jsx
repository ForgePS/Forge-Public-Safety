import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CertificateDisplay from "../../components/CertificateDisplay.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSystemSettingsOptional } from "../../context/SystemSettingsContext.jsx";
import { getCertificate, CERTIFICATE_STATUSES } from "../../lib/certificates.js";
import { resolveCertificateTemplate } from "../../lib/certificateTemplates.js";
import { getStudentForUser } from "../../lib/students.js";

export default function StudentCertificateViewPage() {
  const { certificateId } = useParams();
  const { user } = useAuth();
  const settingsContext = useSystemSettingsOptional();
  const [certificate, setCertificate] = useState(null);
  const [template, setTemplate] = useState(null);
  const [fieldOverrides, setFieldOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const templateContext = useMemo(
    () => ({
      issuerName: settingsContext?.settings?.certificates?.issuerName,
      issuerTitle: settingsContext?.settings?.certificates?.issuerTitle,
      descriptionText: template?.descriptionText,
    }),
    [settingsContext?.settings, template?.descriptionText],
  );

  useEffect(() => {
    if (!certificateId) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [record, student] = await Promise.all([
          getCertificate(certificateId),
          getStudentForUser(user),
        ]);
        if (!record) throw new Error("Certificate not found.");
        if (record.status === CERTIFICATE_STATUSES.PENDING_RELEASE) {
          throw new Error("This certificate is pending academy review and is not yet available.");
        }
        if (student && record.studentId !== student.id) {
          throw new Error("You do not have access to this certificate.");
        }
        const resolvedTemplate = await resolveCertificateTemplate({ certificate: record });
        if (active) {
          setCertificate(record);
          setTemplate(resolvedTemplate);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load certificate.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [certificateId, user]);

  return (
    <>
      <PageHeader
        title="Certificate of Completion"
        subtitle={certificate?.certificateNumber ?? "AFTA certificate"}
        actions={
          <Link
            to="/student/certificates"
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Back to certificates
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
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading certificate…</p>
        ) : certificate ? (
          <CertificateDisplay
            certificate={certificate}
            template={template}
            templateContext={templateContext}
            validationCode={certificate.validationCode}
            showQr
            editable
            fieldOverrides={fieldOverrides}
            onFieldChange={(fieldId, value) =>
              setFieldOverrides((current) => ({ ...current, [fieldId]: value }))
            }
          />
        ) : null}
      </div>
    </>
  );
}

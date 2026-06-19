import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import CertificateDisplay from "../../components/CertificateDisplay.jsx";
import { useSystemSettingsOptional } from "../../context/SystemSettingsContext.jsx";
import { getCertificate, CERTIFICATE_STATUSES } from "../../lib/certificates.js";
import { resolveCertificateTemplate } from "../../lib/certificateTemplates.js";

export default function AdminCertificateViewPage() {
  const { certificateId } = useParams();
  const settingsContext = useSystemSettingsOptional();
  const [certificate, setCertificate] = useState(null);
  const [template, setTemplate] = useState(null);
  const [fieldOverrides, setFieldOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const templateContext = useMemo(
    () => ({
      issuerName:
        template?.issuerNameOverride || settingsContext?.settings?.certificates?.issuerName,
      issuerTitle:
        template?.issuerTitleOverride || settingsContext?.settings?.certificates?.issuerTitle,
      descriptionText: template?.descriptionText,
    }),
    [template, settingsContext?.settings],
  );

  useEffect(() => {
    if (!certificateId) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const record = await getCertificate(certificateId);
        if (!record) throw new Error("Certificate not found.");
        if (record.status === CERTIFICATE_STATUSES.PENDING_RELEASE) {
          throw new Error("This certificate is pending release and cannot be printed yet.");
        }
        if (record.status === CERTIFICATE_STATUSES.REVOKED) {
          throw new Error("This certificate has been revoked.");
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
  }, [certificateId]);

  return (
    <>
      <PageHeader
        title="Print certificate"
        subtitle={certificate?.certificateNumber ?? "AFTA certificate"}
        actions={
          <div className="flex flex-wrap gap-2 no-print">
            {certificate ? (
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
              >
                Print / PDF
              </button>
            ) : null}
            <Link to="/admin/certificates" className="app-btn-secondary px-4 py-2 text-xs">
              Back to certificates
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7 print:bg-white print:p-0">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700 no-print">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading certificate…</p>
        ) : certificate ? (
          <>
            <p className="text-xs text-[var(--color-afta-muted)] no-print">
              Click any text on the certificate to edit before printing. Changes apply to this print only.
              {template?.name ? (
                <>
                  {" "}
                  · Layout: {template.name}
                  {template.layoutType === "custom-image" || template.backgroundUrl ? " (uploaded image)" : ""}
                </>
              ) : null}
            </p>
            <div className="print:w-full">
              <CertificateDisplay
                certificate={certificate}
                template={template}
                templateContext={templateContext}
                validationCode={certificate.validationCode}
                showQr={template?.showQr !== false}
                editable
                fieldOverrides={fieldOverrides}
                onFieldChange={(fieldId, value) =>
                  setFieldOverrides((current) => ({ ...current, [fieldId]: value }))
                }
              />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

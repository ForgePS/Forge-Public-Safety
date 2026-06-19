import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import CertificateDisplay from "../components/CertificateDisplay.jsx";
import { validateCertificateCode } from "../lib/certificates.js";
import { resolveCertificateTemplate } from "../lib/certificateTemplates.js";

export default function CertificateVerifyPage() {
  const { validationCode } = useParams();
  const [result, setResult] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  const templateContext = useMemo(
    () => ({
      descriptionText: template?.descriptionText,
      issuerName: template?.issuerNameOverride,
      issuerTitle: template?.issuerTitleOverride,
    }),
    [template],
  );

  useEffect(() => {
    if (!validationCode) return;

    let active = true;

    async function load() {
      setLoading(true);
      try {
        const validation = await validateCertificateCode(validationCode);
        if (!active) return;
        setResult(validation);

        if (validation.valid && validation.certificate) {
          const resolvedTemplate = await resolveCertificateTemplate({
            certificate: validation.certificate,
            templateId: validation.certificate.templateId,
            courseId: validation.certificate.courseId,
          });
          if (active) setTemplate(resolvedTemplate);
        }
      } catch {
        if (active) {
          setResult({ valid: false, message: "Unable to validate certificate.", certificate: null });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [validationCode]);

  return (
    <div className="min-h-screen bg-[var(--color-afta-bg)] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold text-[var(--color-afta-text)]">Forge Academy Certificate Verification</p>
          <p className="mt-1 text-xs text-[var(--color-afta-muted)]">Arkansas Fire Training Academy</p>
        </div>

        {loading ? (
          <p className="text-center text-sm text-[var(--color-afta-subtle)]">Validating certificate…</p>
        ) : null}

        {!loading && result ? (
          <>
            <p
              className={`mb-6 rounded-[10px] px-4 py-3 text-center text-sm ${
                result.valid
                  ? "border border-green-500/30 bg-green-50 text-green-800"
                  : "border border-[#c8102e]/30 bg-[#c8102e]/10 text-red-700"
              }`}
            >
              {result.message}
            </p>

            {result.valid && result.certificate ? (
              <CertificateDisplay
                certificate={result.certificate}
                template={template}
                templateContext={templateContext}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

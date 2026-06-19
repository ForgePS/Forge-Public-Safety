import AftaIfsacCertificateLayout from "./certificates/AftaIfsacCertificateLayout.jsx";
import CustomImageCertificateLayout from "./certificates/CustomImageCertificateLayout.jsx";
import CertificateEditableText from "./certificates/CertificateEditableText.jsx";
import {
  BUILT_IN_CERTIFICATE_LAYOUTS,
  CERTIFICATE_LAYOUT_TYPES,
  prepareCertificateTemplateForDisplay,
} from "../lib/certificateTemplates.js";

/**
 * @param {{
 *   certificate: Record<string, unknown>,
 *   template?: import('../../lib/certificateTemplates.js').CertificateTemplateRecord | null,
 *   templateContext?: { issuerName?: string, issuerTitle?: string, descriptionText?: string },
 *   validationCode?: string,
 *   showQr?: boolean,
 *   editable?: boolean,
 *   onFieldChange?: (fieldId: string, value: string) => void,
 *   fieldOverrides?: Record<string, string>,
 * }} props
 */
export default function CertificateDisplay({
  certificate,
  template,
  templateContext,
  validationCode,
  showQr = false,
  editable = false,
  onFieldChange,
  fieldOverrides,
}) {
  const preparedTemplate = prepareCertificateTemplateForDisplay(template);
  const layoutType = preparedTemplate?.layoutType ?? CERTIFICATE_LAYOUT_TYPES.BUILT_IN;
  const builtInKey = preparedTemplate?.builtInKey ?? BUILT_IN_CERTIFICATE_LAYOUTS.AFTA_IFSAC;
  const shouldShowQr = showQr && (preparedTemplate?.showQr !== false);

  if (layoutType === CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE) {
    return (
      <CustomImageCertificateLayout
        certificate={certificate}
        template={preparedTemplate ?? { fields: [] }}
        templateContext={templateContext}
        validationCode={validationCode}
        showQr={shouldShowQr}
        editable={editable}
        onFieldChange={onFieldChange}
        fieldOverrides={fieldOverrides}
      />
    );
  }

  if (builtInKey === BUILT_IN_CERTIFICATE_LAYOUTS.LEGACY) {
    return (
      <LegacyCertificateLayout
        certificate={certificate}
        validationCode={validationCode}
        showQr={shouldShowQr}
        editable={editable}
        onFieldChange={onFieldChange}
        fieldOverrides={fieldOverrides}
      />
    );
  }

  return (
    <AftaIfsacCertificateLayout
      certificate={certificate}
      template={preparedTemplate}
      templateContext={templateContext}
      validationCode={validationCode}
      showQr={shouldShowQr}
      editable={editable}
      onFieldChange={onFieldChange}
      fieldOverrides={fieldOverrides}
    />
  );
}

function LegacyCertificateLayout({
  certificate,
  validationCode,
  showQr,
  editable = false,
  onFieldChange,
  fieldOverrides = {},
}) {
  const qrUrl =
    validationCode && showQr
      ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/verify/${validationCode}`)}`
      : null;

  function text(key, fallback, className) {
    const value = fieldOverrides[key] ?? fallback;
    return (
      <CertificateEditableText
        value={value}
        editable={editable}
        onChange={(next) => onFieldChange?.(key, next)}
        ariaLabel={key}
        className={className}
      />
    );
  }

  const bodyText = fieldOverrides.bodyText ??
    `has successfully completed ${certificate.courseName ?? ""} (${certificate.courseNumber ?? ""}) consisting of ${certificate.hours ?? 0} training hours, meeting all practical skills and written requirements as prescribed by the Arkansas Fire Training Academy.`;

  const footerText = fieldOverrides.footerText ??
    `Issued ${certificate.completionDate ?? ""} · Cert #${certificate.certificateNumber ?? ""}${certificate.location ? `\nLocation: ${certificate.location}` : ""}${certificate.instructorNames ? `\nInstructor: ${certificate.instructorNames}` : ""}`;

  return (
    <article className="mx-auto max-w-3xl rounded-[18px] border border-[#cbd5e1] bg-white p-8 text-center text-[#0f172a] shadow-lg md:p-12">
      <img src="/afta-logo.png" alt="" className="mx-auto h-20 w-20 object-contain" />
      {text("headerOrg", "Arkansas Fire Training Academy", "mt-4 text-[11px] uppercase tracking-[0.14em] text-[var(--color-afta-muted)]")}
      {text("headerTitle", "Certificate of Completion", "mt-4 text-2xl font-semibold text-[#0f172a] md:text-3xl")}
      {text("introLine", "This certifies that", "mt-6 text-sm text-[#475569]")}
      <div className="my-5 border-b-2 border-[#c8102e] pb-2">
        {text("studentName", String(certificate.studentName ?? ""), "text-3xl font-bold md:text-4xl")}
      </div>
      <div className="mx-auto max-w-xl">
        {text("bodyText", bodyText, "text-sm leading-relaxed text-[#475569] md:text-base")}
      </div>
      <div className="mt-8">
        {text("footerText", footerText, "text-xs text-[var(--color-afta-muted)] md:text-sm")}
      </div>
      {qrUrl ? (
        <div className="mt-8 flex flex-col items-center gap-2">
          <img src={qrUrl} alt="Certificate verification QR code" className="h-[180px] w-[180px]" />
          {text("qrLabel", `Scan to verify · ${validationCode}`, "text-[11px] uppercase tracking-[0.12em] text-[var(--color-afta-muted)]")}
        </div>
      ) : null}
    </article>
  );
}

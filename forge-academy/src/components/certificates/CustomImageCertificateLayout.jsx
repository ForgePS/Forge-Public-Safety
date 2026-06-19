import {
  resolveCertificateFieldValue,
  buildCertificateFieldStyle,
  CERTIFICATE_LAYOUT_HEIGHT,
  CERTIFICATE_LAYOUT_WIDTH,
} from "../../lib/certificateTemplateFields.js";
import CertificateEditableText from "./CertificateEditableText.jsx";
import CertificateScaledCanvas from "./CertificateScaledCanvas.jsx";

/**
 * @param {{
 *   certificate: Record<string, unknown>,
 *   template: { backgroundUrl?: string, fields?: import('../../lib/certificateTemplateFields.js').CertificateTemplateField[], signatureUrl?: string, descriptionText?: string, issuerNameOverride?: string, issuerTitleOverride?: string },
 *   templateContext?: { issuerName?: string, issuerTitle?: string, descriptionText?: string },
 *   validationCode?: string,
 *   showQr?: boolean,
 *   editable?: boolean,
 *   onFieldChange?: (fieldId: string, value: string) => void,
 *   fieldOverrides?: Record<string, string>,
 * }} props
 */
export default function CustomImageCertificateLayout({
  certificate,
  template,
  templateContext = {},
  validationCode,
  showQr = false,
  editable = false,
  onFieldChange,
  fieldOverrides = {},
}) {
  const fields = template?.fields ?? [];
  const context = {
    descriptionText: template?.descriptionText ?? templateContext.descriptionText,
    issuerName: template?.issuerNameOverride || templateContext.issuerName,
    issuerTitle: template?.issuerTitleOverride || templateContext.issuerTitle,
  };

  const qrUrl =
    validationCode && showQr
      ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/verify/${validationCode}`)}`
      : null;

  return (
    <CertificateScaledCanvas className="certificate-custom-image mx-auto print:max-w-none">
      <article
        className="relative overflow-hidden bg-white shadow-lg print:shadow-none"
        style={{
          width: `${CERTIFICATE_LAYOUT_WIDTH}px`,
          height: `${CERTIFICATE_LAYOUT_HEIGHT}px`,
        }}
      >
        {template?.backgroundUrl ? (
          <img
            src={template.backgroundUrl}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ objectFit: "fill" }}
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f1f5f9] text-sm text-[#64748b]">
            Upload a certificate background image
          </div>
        )}

        {fields.map((field) => {
          const resolvedValue = fieldOverrides[field.id] ?? resolveCertificateFieldValue(field, certificate, context);
          const style = buildCertificateFieldStyle(field);

          return (
            <div key={field.id} className="absolute z-10" style={style}>
              <CertificateEditableText
                value={resolvedValue}
                editable={editable}
                onChange={(value) => onFieldChange?.(field.id, value)}
                ariaLabel={field.label}
                style={{
                  width: "100%",
                  fontSize: style.fontSize,
                  fontFamily: style.fontFamily,
                  fontWeight: style.fontWeight,
                  fontStyle: style.fontStyle,
                  color: style.color,
                  textAlign: style.textAlign,
                  textDecoration: style.textDecoration,
                  lineHeight: style.lineHeight,
                }}
              />
            </div>
          );
        })}

        {template?.signatureUrl ? (
          <img
            src={template.signatureUrl}
            alt=""
            className="pointer-events-none absolute z-10 object-contain"
            style={{
              bottom: "12%",
              right: "12%",
              height: "52px",
              maxWidth: "140px",
            }}
            draggable={false}
          />
        ) : null}

        {qrUrl ? (
          <img
            src={qrUrl}
            alt=""
            className="absolute bottom-4 right-4 z-10 opacity-90"
            style={{ width: "64px", height: "64px" }}
          />
        ) : null}
      </article>
    </CertificateScaledCanvas>
  );
}

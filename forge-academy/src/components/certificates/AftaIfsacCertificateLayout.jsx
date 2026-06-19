import {
  CERTIFICATE_LAYOUT_HEIGHT,
  CERTIFICATE_LAYOUT_WIDTH,
  formatCertificateDate,
} from "../../lib/certificateTemplateFields.js";
import CertificateEditableText from "./CertificateEditableText.jsx";
import CertificateScaledCanvas from "./CertificateScaledCanvas.jsx";

const SERIF = '"Times New Roman", Times, Georgia, serif';

/** @param {string} key @param {string} fallback @param {Record<string, string>} [overrides] */
function textValue(key, fallback, overrides = {}) {
  return overrides[key] ?? fallback;
}

/**
 * @param {{
 *   certificate: Record<string, unknown>,
 *   template?: { descriptionText?: string, signatureUrl?: string, issuerNameOverride?: string, issuerTitleOverride?: string } | null,
 *   templateContext?: { issuerName?: string, issuerTitle?: string, descriptionText?: string },
 *   validationCode?: string,
 *   showQr?: boolean,
 *   editable?: boolean,
 *   onFieldChange?: (fieldId: string, value: string) => void,
 *   fieldOverrides?: Record<string, string>,
 * }} props
 */
export default function AftaIfsacCertificateLayout({
  certificate,
  template,
  templateContext = {},
  validationCode,
  showQr = false,
  editable = false,
  onFieldChange,
  fieldOverrides = {},
}) {
  const defaultDescription =
    "This certification is awarded for successful completion of requirements as established by the NFPA 1031 Standard for Professional Qualifications for Fire Inspector and Plan Examiner";

  const descriptionText = textValue(
    "description",
    template?.descriptionText ?? templateContext.descriptionText ?? defaultDescription,
    fieldOverrides,
  );

  const issuerName = textValue(
    "issuerName",
    template?.issuerNameOverride ||
      templateContext.issuerName ||
      String(certificate.issuerName ?? "GRANT WARNER"),
    fieldOverrides,
  );
  const issuerTitle = textValue(
    "issuerTitle",
    template?.issuerTitleOverride ||
      templateContext.issuerTitle ||
      String(certificate.issuerTitle ?? "DIRECTOR"),
    fieldOverrides,
  );

  const completionDate = textValue(
    "completionDate",
    formatCertificateDate(String(certificate.completionDate ?? "")),
    fieldOverrides,
  );

  const qrUrl =
    validationCode && showQr
      ? `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(`${window.location.origin}/verify/${validationCode}`)}`
      : null;

  function field(key, fallback, className, style = {}) {
    return (
      <CertificateEditableText
        value={textValue(key, fallback, fieldOverrides)}
        editable={editable}
        onChange={(value) => onFieldChange?.(key, value)}
        ariaLabel={key}
        className={className}
        style={{ fontFamily: SERIF, boxSizing: "border-box", ...style }}
      />
    );
  }

  return (
    <CertificateScaledCanvas className="certificate-afta-ifsac mx-auto print:max-w-none">
      <article
        className="relative overflow-hidden bg-white shadow-lg print:shadow-none"
        style={{
          width: `${CERTIFICATE_LAYOUT_WIDTH}px`,
          height: `${CERTIFICATE_LAYOUT_HEIGHT}px`,
          fontFamily: SERIF,
        }}
      >
        <img
          src="/certificates/afta-ifsac/watermark.png"
          alt=""
          className="pointer-events-none absolute left-1/2 top-[22%] w-[52%] -translate-x-1/2 opacity-[0.12]"
          draggable={false}
        />
        <div className="pointer-events-none absolute left-[2%] top-[2%] h-[10%] w-[10%] border-l-[3px] border-t-[3px] border-[#1a1a1a]" aria-hidden />
        <div className="pointer-events-none absolute left-[3.2%] top-[3.2%] h-[7%] w-[7%] border-l border-t border-[#1a1a1a]/50" aria-hidden />
        <div className="pointer-events-none absolute bottom-[2%] right-[2%] h-[10%] w-[10%] border-b-[3px] border-r-[3px] border-[#1a1a1a]" aria-hidden />
        <div className="pointer-events-none absolute bottom-[3.2%] right-[3.2%] h-[7%] w-[7%] border-b border-r border-[#1a1a1a]/50" aria-hidden />
        <img src="/certificates/afta-ifsac/wave-tr.png" alt="" className="pointer-events-none absolute right-0 top-0 w-[26%]" draggable={false} />
        <img src="/certificates/afta-ifsac/wave-bl.png" alt="" className="pointer-events-none absolute bottom-0 left-0 w-[24%]" draggable={false} />

        <header className="relative z-10 px-8 pt-[7%] text-center">
          {field(
            "headerAcademy",
            "Arkansas Fire\nTraining Academy",
            "m-0 w-full text-center font-bold uppercase leading-tight tracking-wide text-[#c8102e]",
            { fontSize: "34px" },
          )}
          {field(
            "headerThrough",
            "through accreditation by the",
            "m-0 mt-[2%] w-full text-center text-[#1a1a1a]",
            { fontSize: "12px" },
          )}
          {field(
            "headerIfsac",
            "International Fire Service Accreditation Congress",
            "m-0 mt-[0.5%] w-full text-center font-semibold uppercase tracking-wide text-[#c8102e]",
            { fontSize: "13px" },
          )}
          {field(
            "headerConfirms",
            "hereby confirms that",
            "m-0 mt-[1.2%] w-full text-center italic text-[#1a1a1a]",
            { fontSize: "12px" },
          )}
        </header>

        <section className="relative z-10 px-8 text-center">
          <div className="mx-auto mt-[2.5%] w-[58%] border-t border-[#c8102e] pt-[1.8%]">
            {field(
              "studentName",
              String(certificate.studentName ?? ""),
              "m-0 w-full text-center font-bold uppercase leading-tight tracking-wide text-[#1a1a1a]",
              { fontSize: "30px" },
            )}
          </div>
          <div className="mx-auto w-[58%] border-b border-[#c8102e] pb-[1.8%]" />

          {field(
            "certifiedIn",
            "is internationally certified in",
            "m-0 mt-[2.2%] w-full text-center text-[#1a1a1a]",
            { fontSize: "14px" },
          )}

          {field(
            "courseName",
            String(certificate.courseName ?? ""),
            "m-0 mt-[1.5%] w-full text-center font-bold uppercase leading-tight tracking-wide text-[#1a1a1a]",
            { fontSize: "25px" },
          )}

          <div className="mx-auto mt-[2.5%] max-w-[78%]">
            {field(
              "description",
              descriptionText,
              "m-0 w-full text-center italic leading-snug text-[#1a1a1a]",
              { fontSize: "12px" },
            )}
          </div>
        </section>

        <footer className="absolute bottom-[5%] left-0 right-0 z-10 px-[5%]">
          <div className="grid grid-cols-[1fr_1fr_1.2fr] items-end gap-2">
            <div className="text-left">
              <img src="/certificates/afta-ifsac/seal-ifsac.png" alt="" className="mb-1 w-20" draggable={false} />
              {field(
                "certificateNumber",
                String(certificate.certificateNumber ?? ""),
                "m-0 w-full text-left pl-1 tracking-wide text-[#1a1a1a]",
                { fontSize: "10px" },
              )}
            </div>

            <div className="pb-1 text-center">
              <div className="border-b border-[#94a3b8] pb-1">
                {field(
                  "completionDate",
                  completionDate,
                  "m-0 w-full text-center text-[#1a1a1a]",
                  { fontSize: "12px" },
                )}
              </div>
              {field(
                "dateLabel",
                "Date",
                "m-0 mt-1 w-full text-center font-bold uppercase tracking-[0.2em] text-[#1a1a1a]",
                { fontSize: "9px" },
              )}
            </div>

            <div className="text-right">
              <div className="flex items-end justify-end gap-2">
                <div className="min-w-0 flex-1 text-right">
                  {template?.signatureUrl ? (
                    <img
                      src={template.signatureUrl}
                      alt=""
                      className="ml-auto mb-0.5 h-9 max-w-[70%] object-contain"
                    />
                  ) : (
                    field(
                      "signaturePlaceholder",
                      "Grant Warner",
                      "m-0 mb-0.5 w-full text-right italic leading-none text-[#1a1a1a]",
                      { fontSize: "26px" },
                    )
                  )}
                  <div className="border-t border-[#94a3b8] pt-1">
                    {field(
                      "issuerLine",
                      `${issuerName}, ${issuerTitle}`,
                      "m-0 w-full text-right font-bold uppercase tracking-wide text-[#1a1a1a]",
                      { fontSize: "9px" },
                    )}
                  </div>
                </div>
                <img src="/certificates/afta-ifsac/seal-arkansas.png" alt="" className="w-20 shrink-0" draggable={false} />
              </div>
            </div>
          </div>
        </footer>

        {qrUrl ? (
          <img
            src={qrUrl}
            alt="Certificate verification QR code"
            className="absolute bottom-[2%] right-[2%] z-20 opacity-90"
            style={{ width: "58px" }}
          />
        ) : null}
      </article>
    </CertificateScaledCanvas>
  );
}

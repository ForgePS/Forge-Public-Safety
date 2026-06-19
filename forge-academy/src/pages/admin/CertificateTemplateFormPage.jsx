import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Upload } from "lucide-react";
import CertificateDisplay from "../../components/CertificateDisplay.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../../components/StudentFormFields.jsx";
import {
  CERTIFICATE_MERGE_KEYS,
  CERTIFICATE_FONT_FAMILIES,
  createCertificateTemplateField,
  DEFAULT_CUSTOM_IMAGE_FIELDS,
  normalizeCertificateTemplateField,
} from "../../lib/certificateTemplateFields.js";
import {
  deleteCertificateTemplateAsset,
  uploadCertificateTemplateAsset,
} from "../../lib/certificateTemplateStorage.js";
import {
  BUILT_IN_CERTIFICATE_LAYOUTS,
  CERTIFICATE_LAYOUT_TYPES,
  CERTIFICATE_TEMPLATE_STATUSES,
  createCertificateTemplate,
  deleteCertificateTemplate,
  getCertificateTemplate,
  getDefaultAftaIfsacTemplateSeed,
  updateCertificateTemplate,
} from "../../lib/certificateTemplates.js";
import { listCourses } from "../../lib/courses.js";
import { useSystemSettingsOptional } from "../../context/SystemSettingsContext.jsx";

const SAMPLE_CERTIFICATE = {
  studentName: "JEREMY E POWELL",
  courseName: "INSPECTOR II",
  courseNumber: "NFPA-1031",
  certificateNumber: "0002AR-0012338",
  completionDate: "2026-05-22",
  hours: 40,
  location: "Camden, AR",
  instructorNames: "John Smith",
};

const layoutOptions = [
  { value: `${CERTIFICATE_LAYOUT_TYPES.BUILT_IN}:${BUILT_IN_CERTIFICATE_LAYOUTS.AFTA_IFSAC}`, label: "AFTA IFSAC (built-in)" },
  { value: `${CERTIFICATE_LAYOUT_TYPES.BUILT_IN}:${BUILT_IN_CERTIFICATE_LAYOUTS.LEGACY}`, label: "Legacy completion" },
  { value: `${CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE}:`, label: "Uploaded image background" },
];

/** @returns {ReturnType<typeof getDefaultAftaIfsacTemplateSeed>} */
function emptyForm() {
  return {
    ...getDefaultAftaIfsacTemplateSeed(),
    name: "",
    isDefault: false,
  };
}

export default function CertificateTemplateFormPage() {
  const { templateId } = useParams();
  const isNew = !templateId;
  const navigate = useNavigate();
  const settingsContext = useSystemSettingsOptional();
  const backgroundInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [courses, setCourses] = useState([]);
  const [previewOverrides, setPreviewOverrides] = useState({});
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const templateContext = useMemo(
    () => ({
      issuerName: form.issuerNameOverride || settingsContext?.settings?.certificates?.issuerName || "GRANT WARNER",
      issuerTitle: form.issuerTitleOverride || settingsContext?.settings?.certificates?.issuerTitle || "DIRECTOR",
      descriptionText: form.descriptionText,
    }),
    [form.descriptionText, form.issuerNameOverride, form.issuerTitleOverride, settingsContext?.settings],
  );

  const layoutValue =
    form.layoutType === CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE
      ? `${CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE}:`
      : `${CERTIFICATE_LAYOUT_TYPES.BUILT_IN}:${form.builtInKey}`;

  useEffect(() => {
    listCourses().then(setCourses).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;

    let active = true;

    async function load() {
      setLoading(true);
      try {
        const template = await getCertificateTemplate(templateId);
        if (!template) throw new Error("Template not found.");
        if (active) {
          setForm({
            ...template,
            fields: (template.fields || []).map((field) => normalizeCertificateTemplateField(field)),
          });
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load template.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isNew, templateId]);

  function updateForm(patch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleLayoutChange(event) {
    const value = event.target.value;
    if (value.startsWith(CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE)) {
      updateForm({
        layoutType: CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE,
        builtInKey: "",
        fields: form.fields?.length ? form.fields : DEFAULT_CUSTOM_IMAGE_FIELDS,
      });
      return;
    }
    const [, builtInKey] = value.split(":");
    updateForm({
      layoutType: CERTIFICATE_LAYOUT_TYPES.BUILT_IN,
      builtInKey: builtInKey || BUILT_IN_CERTIFICATE_LAYOUTS.AFTA_IFSAC,
    });
  }

  function updateField(fieldId, patch) {
    updateForm({
      fields: form.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
    });
  }

  function addField() {
    updateForm({
      fields: [...form.fields, createCertificateTemplateField({ label: "New field", y: 60 })],
    });
  }

  function removeField(fieldId) {
    updateForm({ fields: form.fields.filter((field) => field.id !== fieldId) });
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const course = courses.find((item) => item.id === form.courseId);
    const payload = {
      ...form,
      courseName: course?.name ?? "",
      courseNumber: course?.courseNumber ?? "",
    };

    try {
      if (isNew) {
        const id = await createCertificateTemplate(payload);
        navigate(`/admin/certificates/templates/${id}`);
        setMessage("Template created.");
      } else {
        await updateCertificateTemplate(templateId, payload);
        setMessage("Template saved.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save template.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew || !templateId) return;
    const message = form.isDefault
      ? `Delete "${form.name}"? It is the default template — another template will become the default.`
      : `Delete "${form.name}"? Courses using this template will fall back to the default.`;
    if (!window.confirm(message)) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteCertificateTemplate(templateId);
      navigate("/admin/certificates/templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete template.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAssetUpload(file, assetType) {
    if (!file) return;
    setUploading(assetType);
    setError(null);

    try {
      let activeTemplateId = templateId;
      if (isNew) {
        activeTemplateId = await createCertificateTemplate({
          ...form,
          name: form.name.trim() || "Untitled certificate template",
        });
        navigate(`/admin/certificates/templates/${activeTemplateId}`, { replace: true });
      }

      const previousPath =
        assetType === "background" ? form.backgroundStoragePath : form.signatureStoragePath;
      const uploaded = await uploadCertificateTemplateAsset(activeTemplateId, file, assetType);

      const patch =
        assetType === "background"
          ? {
              backgroundUrl: uploaded.url,
              backgroundStoragePath: uploaded.storagePath,
              layoutType: CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE,
            }
          : { signatureUrl: uploaded.url, signatureStoragePath: uploaded.storagePath };

      await updateCertificateTemplate(activeTemplateId, patch);
      if (previousPath && previousPath !== uploaded.storagePath) {
        await deleteCertificateTemplateAsset(previousPath);
      }
      updateForm(patch);
      setMessage(`${assetType === "background" ? "Background" : "Signature"} uploaded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading("");
    }
  }

  const previewCertificate = useMemo(() => {
    const merged = { ...SAMPLE_CERTIFICATE };
    form.fields.forEach((field) => {
      if (previewOverrides[field.id] != null && field.mergeKey) {
        merged[field.mergeKey] = previewOverrides[field.id];
      }
    });
    if (form.serialPrefix) {
      merged.certificateNumber = `${form.serialPrefix}-0012338`;
    }
    return merged;
  }, [form.fields, form.serialPrefix, previewOverrides]);

  if (loading) {
    return (
      <div className="p-7 text-sm text-[var(--color-afta-subtle)]">Loading certificate template…</div>
    );
  }

  return (
    <>
      <PageHeader
        title={isNew ? "New certificate template" : "Edit certificate template"}
        subtitle="Configure layout, editable fields, and uploads"
        backTo="/admin/certificates/templates"
        backLabel="Back to templates"
        actions={
          <Link to="/admin/certificates/templates" className="app-btn-secondary px-4 py-2 text-xs">
            All templates
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row lg:p-7">
        <form onSubmit={handleSave} className="flex min-w-0 flex-1 flex-col gap-5">
          {error ? (
            <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-[10px] border border-green-500/30 bg-green-50 px-4 py-3 text-sm text-green-800">
              {message}
            </p>
          ) : null}

          <FormSection title="Template details">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Template name"
                name="name"
                value={form.name}
                onChange={(event) => updateForm({ name: event.target.value })}
                required
              />
              <FormSelect
                label="Status"
                name="status"
                value={form.status}
                onChange={(event) => updateForm({ status: event.target.value })}
                options={[
                  { value: CERTIFICATE_TEMPLATE_STATUSES.ACTIVE, label: "Active" },
                  { value: CERTIFICATE_TEMPLATE_STATUSES.INACTIVE, label: "Inactive" },
                ]}
              />
              <FormSelect
                label="Layout type"
                name="layout"
                value={layoutValue}
                onChange={handleLayoutChange}
                options={layoutOptions}
              />
              <FormSelect
                label="Course (optional)"
                name="courseId"
                value={form.courseId}
                onChange={(event) => updateForm({ courseId: event.target.value })}
                options={[
                  { value: "", label: "All courses" },
                  ...courses.map((course) => ({
                    value: course.id,
                    label: `${course.courseNumber} · ${course.name}`,
                  })),
                ]}
              />
              <FormField
                label="Serial number prefix"
                name="serialPrefix"
                value={form.serialPrefix}
                onChange={(event) => updateForm({ serialPrefix: event.target.value })}
                hint="Used for succession-ordered certificate numbers (e.g. 0002AR-0012338)"
              />
              <label className="flex items-center gap-2 pt-6 text-sm text-[var(--color-afta-text)]">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(event) => updateForm({ isDefault: event.target.checked })}
                />
                Default template for new certificates
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-afta-text)]">
                <input
                  type="checkbox"
                  checked={form.showQr}
                  onChange={(event) => updateForm({ showQr: event.target.checked })}
                />
                Show verification QR code
              </label>
            </div>
            <FormTextarea
              label="Description / certification text"
              name="descriptionText"
              value={form.descriptionText}
              onChange={(event) => updateForm({ descriptionText: event.target.value })}
              rows={3}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Issuer name override"
                name="issuerNameOverride"
                value={form.issuerNameOverride}
                onChange={(event) => updateForm({ issuerNameOverride: event.target.value })}
                placeholder="Leave blank to use system settings"
              />
              <FormField
                label="Issuer title override"
                name="issuerTitleOverride"
                value={form.issuerTitleOverride}
                onChange={(event) => updateForm({ issuerTitleOverride: event.target.value })}
                placeholder="Leave blank to use system settings"
              />
            </div>
          </FormSection>

          <FormSection title="Background & signature uploads">
            <p className="text-sm text-[var(--color-afta-subtle)]">
              Upload a certificate background image (JPEG, PNG, or WebP). Position editable fields below to
              match your design.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-xs font-semibold"
                onClick={() => backgroundInputRef.current?.click()}
                disabled={Boolean(uploading)}
              >
                <Upload className="h-4 w-4" />
                {uploading === "background" ? "Uploading…" : "Upload background"}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-xs font-semibold"
                onClick={() => signatureInputRef.current?.click()}
                disabled={Boolean(uploading)}
              >
                <Upload className="h-4 w-4" />
                {uploading === "signature" ? "Uploading…" : "Upload signature"}
              </button>
              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleAssetUpload(file, "background");
                  event.target.value = "";
                }}
              />
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleAssetUpload(file, "signature");
                  event.target.value = "";
                }}
              />
            </div>
          </FormSection>

          {form.layoutType === CERTIFICATE_LAYOUT_TYPES.CUSTOM_IMAGE ? (
            <FormSection title="Editable fields">
              <p className="text-sm text-[var(--color-afta-subtle)]">
                Position fields as percentages on the certificate. Student name, course, serial number, and
                date map to certificate data at issuance.
              </p>
              <div className="space-y-4">
                {form.fields.map((field) => (
                  <div
                    key={field.id}
                    className="rounded-[12px] border border-[var(--color-afta-border)] bg-[var(--color-afta-bg)] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--color-afta-text)]">{field.label}</p>
                      <button
                        type="button"
                        className="text-xs text-[#c8102e]"
                        onClick={() => removeField(field.id)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <FormField
                        label="Label"
                        name={`label-${field.id}`}
                        value={field.label}
                        onChange={(event) => updateField(field.id, { label: event.target.value })}
                      />
                      <FormSelect
                        label="Field type"
                        name={`type-${field.id}`}
                        value={field.type}
                        onChange={(event) => updateField(field.id, { type: event.target.value })}
                        options={[
                          { value: "merge", label: "Certificate data" },
                          { value: "static", label: "Static text" },
                        ]}
                      />
                      {field.type === "merge" ? (
                        <FormSelect
                          label="Data field"
                          name={`merge-${field.id}`}
                          value={field.mergeKey}
                          onChange={(event) => updateField(field.id, { mergeKey: event.target.value })}
                          options={CERTIFICATE_MERGE_KEYS.map((item) => ({
                            value: item.value,
                            label: item.label,
                          }))}
                        />
                      ) : (
                        <FormField
                          label="Static text"
                          name={`static-${field.id}`}
                          value={field.staticText}
                          onChange={(event) => updateField(field.id, { staticText: event.target.value })}
                        />
                      )}
                      <FormField
                        label="X position (%)"
                        name={`x-${field.id}`}
                        type="number"
                        value={String(field.x)}
                        onChange={(event) => updateField(field.id, { x: Number(event.target.value) })}
                      />
                      <FormField
                        label="Y position (%)"
                        name={`y-${field.id}`}
                        type="number"
                        value={String(field.y)}
                        onChange={(event) => updateField(field.id, { y: Number(event.target.value) })}
                      />
                      <FormField
                        label="Width (%)"
                        name={`width-${field.id}`}
                        type="number"
                        min="5"
                        max="100"
                        value={String(field.width ?? 80)}
                        onChange={(event) => updateField(field.id, { width: Number(event.target.value) })}
                      />
                      <FormSelect
                        label="Font"
                        name={`font-${field.id}`}
                        value={field.fontFamily || CERTIFICATE_FONT_FAMILIES[0].value}
                        onChange={(event) => updateField(field.id, { fontFamily: event.target.value })}
                        options={CERTIFICATE_FONT_FAMILIES.map((item) => ({
                          value: item.value,
                          label: item.label,
                        }))}
                      />
                      <FormField
                        label="Font size (px)"
                        name={`size-${field.id}`}
                        type="number"
                        min="6"
                        max="120"
                        value={String(field.fontSize)}
                        onChange={(event) => updateField(field.id, { fontSize: Number(event.target.value) })}
                      />
                      <FormSelect
                        label="Alignment"
                        name={`align-${field.id}`}
                        value={field.align}
                        onChange={(event) => updateField(field.id, { align: event.target.value })}
                        options={[
                          { value: "left", label: "Left" },
                          { value: "center", label: "Center" },
                          { value: "right", label: "Right" },
                        ]}
                      />
                      <FormField
                        label="Color"
                        name={`color-${field.id}`}
                        type="color"
                        value={field.color}
                        onChange={(event) => updateField(field.id, { color: event.target.value })}
                      />
                      <div className="md:col-span-3">
                        <p className="app-label">Text style</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            aria-pressed={field.fontWeight === "bold"}
                            onClick={() =>
                              updateField(field.id, {
                                fontWeight: field.fontWeight === "bold" ? "normal" : "bold",
                              })
                            }
                            className={`min-w-[2.5rem] rounded-[8px] border px-3 py-2 text-sm font-bold ${
                              field.fontWeight === "bold"
                                ? "border-[#c8102e] bg-[#c8102e] text-white"
                                : "border-[var(--color-afta-border)] bg-white text-[var(--color-afta-text)]"
                            }`}
                          >
                            B
                          </button>
                          <button
                            type="button"
                            aria-pressed={field.fontStyle === "italic"}
                            onClick={() =>
                              updateField(field.id, {
                                fontStyle: field.fontStyle === "italic" ? "normal" : "italic",
                              })
                            }
                            className={`min-w-[2.5rem] rounded-[8px] border px-3 py-2 text-sm italic ${
                              field.fontStyle === "italic"
                                ? "border-[#c8102e] bg-[#c8102e] text-white"
                                : "border-[var(--color-afta-border)] bg-white text-[var(--color-afta-text)]"
                            }`}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            aria-pressed={field.underline}
                            onClick={() => updateField(field.id, { underline: !field.underline })}
                            className={`min-w-[2.5rem] rounded-[8px] border px-3 py-2 text-sm underline ${
                              field.underline
                                ? "border-[#c8102e] bg-[#c8102e] text-white"
                                : "border-[var(--color-afta-border)] bg-white text-[var(--color-afta-text)]"
                            }`}
                          >
                            U
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="rounded-[10px] border border-dashed border-[var(--color-afta-border)] px-4 py-2 text-xs font-semibold"
                onClick={addField}
              >
                Add field
              </button>
            </FormSection>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || deleting}
              className="rounded-[10px] bg-[#c8102e] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : isNew ? "Create template" : "Save template"}
            </button>
            {!isNew ? (
              <button
                type="button"
                disabled={saving || deleting}
                onClick={handleDelete}
                className="rounded-[10px] border border-[var(--color-afta-border)] px-5 py-2.5 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)] disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete template"}
              </button>
            ) : null}
          </div>
        </form>

        <aside className="w-full shrink-0 lg:w-[480px] xl:w-[560px]">
          <div className="sticky top-6 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-afta-muted)]">
              Live preview
            </p>
            <CertificateDisplay
              certificate={previewCertificate}
              template={form}
              templateContext={templateContext}
              validationCode="PREVIEW00000001"
              showQr={form.showQr}
              editable
              fieldOverrides={previewOverrides}
              onFieldChange={(fieldId, value) =>
                setPreviewOverrides((current) => ({ ...current, [fieldId]: value }))
              }
            />
          </div>
        </aside>
      </div>
    </>
  );
}

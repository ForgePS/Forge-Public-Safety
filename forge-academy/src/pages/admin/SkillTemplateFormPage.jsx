import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../../components/StudentFormFields.jsx";
import { listCourses } from "../../lib/courses.js";
import { createSkill, deleteSkill, listSkillsByTemplate } from "../../lib/skills.js";
import {
  createSkillTemplate,
  getSkillTemplate,
  SKILL_TEMPLATE_STATUSES,
  updateSkillTemplate,
} from "../../lib/skillTemplates.js";

const emptyTemplate = {
  name: "",
  courseId: "",
  description: "",
  status: SKILL_TEMPLATE_STATUSES.ACTIVE,
};

const emptySkill = {
  name: "",
  description: "",
  sortOrder: "0",
  maxScore: "100",
  passingScore: "70",
};

export default function SkillTemplateFormPage() {
  const { templateId } = useParams();
  const isNew = !templateId;
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyTemplate);
  const [courses, setCourses] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillForm, setSkillForm] = useState(emptySkill);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    listCourses().then(setCourses).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;

    let active = true;

    async function load() {
      setLoading(true);
      try {
        const [template, skillRows] = await Promise.all([
          getSkillTemplate(templateId),
          listSkillsByTemplate(templateId),
        ]);
        if (!template) throw new Error("Template not found.");
        if (active) {
          setForm({
            name: template.name,
            courseId: template.courseId,
            description: template.description,
            status: template.status,
          });
          setSkills(skillRows);
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

  async function handleSaveTemplate(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const course = courses.find((item) => item.id === form.courseId);
    const payload = {
      ...form,
      courseName: course?.name ?? "",
      courseNumber: course?.courseNumber ?? "",
    };

    try {
      if (isNew) {
        const id = await createSkillTemplate(payload);
        navigate(`/admin/skills/templates/${id}`);
      } else {
        await updateSkillTemplate(templateId, payload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save template.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSkill(event) {
    event.preventDefault();
    if (isNew) return;

    setSaving(true);
    setError(null);
    try {
      await createSkill({
        templateId,
        name: skillForm.name,
        description: skillForm.description,
        sortOrder: Number(skillForm.sortOrder),
        maxScore: Number(skillForm.maxScore),
        passingScore: Number(skillForm.passingScore),
      });
      const rows = await listSkillsByTemplate(templateId);
      setSkills(rows);
      setSkillForm(emptySkill);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add skill.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSkill(skillId) {
    if (!window.confirm("Remove this skill from the template?")) return;
    await deleteSkill(skillId);
    setSkills(await listSkillsByTemplate(templateId));
  }

  return (
    <>
      <PageHeader
        title={isNew ? "New Skill Template" : "Edit Skill Template"}
        subtitle="Define practical skills for a course"
        actions={
          <Link
            to="/admin/skills/templates"
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Back to templates
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
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading template…</p>
        ) : (
          <>
            <form onSubmit={handleSaveTemplate} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <FormSection title="Template details">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label="Template name"
                    name="name"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                  <FormSelect
                    label="Course"
                    name="courseId"
                    value={form.courseId}
                    onChange={(event) => setForm((prev) => ({ ...prev, courseId: event.target.value }))}
                    required
                  >
                    <option value="">Select course…</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.courseNumber} · {course.name}
                      </option>
                    ))}
                  </FormSelect>
                  <FormSelect
                    label="Status"
                    name="status"
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    <option value={SKILL_TEMPLATE_STATUSES.ACTIVE}>Active</option>
                    <option value={SKILL_TEMPLATE_STATUSES.INACTIVE}>Inactive</option>
                  </FormSelect>
                </div>
                <FormTextarea
                  label="Description"
                  name="description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </FormSection>
              <button
                type="submit"
                disabled={saving}
                className="mt-4 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save template"}
              </button>
            </form>

            {!isNew ? (
              <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
                <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Skills in template</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                        <th className="px-3 py-2">Skill</th>
                        <th className="px-3 py-2">Passing</th>
                        <th className="px-3 py-2">Max</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skills.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-[var(--color-afta-subtle)]">
                            No skills added yet.
                          </td>
                        </tr>
                      ) : (
                        skills.map((skill) => (
                          <tr key={skill.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                            <td className="px-3 py-2">
                              <p className="font-medium text-[var(--color-afta-text)]">{skill.name}</p>
                              {skill.description ? (
                                <p className="text-xs text-[var(--color-afta-muted)]">{skill.description}</p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2">{skill.passingScore}</td>
                            <td className="px-3 py-2">{skill.maxScore}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => handleDeleteSkill(skill.id)}
                                className="text-xs text-[#c8102e]"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <form onSubmit={handleAddSkill} className="mt-5 grid gap-4 md:grid-cols-2">
                  <FormField
                    label="Skill name"
                    name="skillName"
                    value={skillForm.name}
                    onChange={(event) => setSkillForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                  <FormField
                    label="Sort order"
                    name="sortOrder"
                    value={skillForm.sortOrder}
                    onChange={(event) => setSkillForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                  />
                  <FormField
                    label="Passing score"
                    name="passingScore"
                    value={skillForm.passingScore}
                    onChange={(event) => setSkillForm((prev) => ({ ...prev, passingScore: event.target.value }))}
                  />
                  <FormField
                    label="Max score"
                    name="maxScore"
                    value={skillForm.maxScore}
                    onChange={(event) => setSkillForm((prev) => ({ ...prev, maxScore: event.target.value }))}
                  />
                  <div className="md:col-span-2">
                    <FormTextarea
                      label="Description"
                      name="skillDescription"
                      value={skillForm.description}
                      onChange={(event) =>
                        setSkillForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-xs font-semibold text-[var(--color-afta-text)] disabled:opacity-60 md:w-fit"
                  >
                    Add skill
                  </button>
                </form>
              </section>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

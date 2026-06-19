import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Pencil,
  Phone,
  Printer,
  X,
} from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import StudentProfilePhoto from "../../components/StudentProfilePhoto.jsx";
import StudentSelfProfileForm from "../../components/StudentSelfProfileForm.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSystemSettings } from "../../context/SystemSettingsContext.jsx";
import {
  buildProfileTrainingRows,
  filterProfileTrainingRows,
  formatAcademyId,
  formatEmergencyContact,
  formatHoursSummary,
  formatMailingAddress,
  formatProfileDate,
  formatStudentDisplayName,
  formatStudentPhone,
  formatTrainingHours,
  getReportingPeriodBounds,
  sumTrainingHours,
  TRAINING_HISTORY_VIEW_LABELS,
  TRAINING_HISTORY_VIEWS,
  YEAR_MODES,
} from "../../lib/studentProfile.js";
import { listRegistrationsByStudent } from "../../lib/registrations.js";
import {
  listStudentCertificationsByStudent,
  STUDENT_CERTIFICATION_STATUS_LABELS,
} from "../../lib/studentCertifications.js";
import { EMPLOYMENT_STATUS_LABELS, getStudentForUser } from "../../lib/students.js";
import { buildStudentTranscript, downloadTranscriptCsv } from "../../lib/transcripts.js";

function ProfileField({ label, children, className = "" }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-afta-muted)]">{label}</p>
      <div className="mt-1 text-sm text-[var(--color-afta-text)]">{children}</div>
    </div>
  );
}

function TrainingSummaryCard({ label, hoursLabel, rangeLabel, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[180px] flex-1 rounded-[12px] border px-4 py-4 text-left transition ${
        active
          ? "border-sky-300 bg-sky-50 shadow-sm"
          : "border-[var(--color-afta-border)] bg-white hover:border-[var(--color-afta-border)]"
      }`}
    >
      <p className={`text-sm font-semibold ${active ? "text-sky-700" : "text-[var(--color-afta-text)]"}`}>{label}</p>
      <p className="mt-2 text-lg font-bold text-[var(--color-afta-text)]">{hoursLabel}</p>
      {rangeLabel ? <p className="mt-1 text-[11px] text-[var(--color-afta-muted)]">{rangeLabel}</p> : null}
    </button>
  );
}

export default function StudentProfilePage() {
  const { user } = useAuth();
  const { settings } = useSystemSettings();
  const allowPhotoUpload = settings?.students?.allowProfilePhotoUpload === true;
  const [student, setStudent] = useState(null);
  const [certifications, setCertifications] = useState([]);
  const [trainingRows, setTrainingRows] = useState([]);
  const [transcript, setTranscript] = useState(null);
  const [trainingView, setTrainingView] = useState(TRAINING_HISTORY_VIEWS.UPCOMING);
  const [yearMode, setYearMode] = useState(YEAR_MODES.CALENDAR);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const record = await getStudentForUser(user);
        if (!record) {
          if (active) {
            setStudent(null);
            setCertifications([]);
            setTrainingRows([]);
            setTranscript(null);
          }
          return;
        }

        const [certs, registrations, builtTranscript] = await Promise.all([
          listStudentCertificationsByStudent(record.id),
          listRegistrationsByStudent(record.id),
          buildStudentTranscript(record.id),
        ]);

        if (!active) return;
        setStudent(record);
        setCertifications(certs);
        setTranscript(builtTranscript);
        setTrainingRows(buildProfileTrainingRows(registrations, builtTranscript.entries));
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load profile.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user]);

  const filteredTraining = useMemo(
    () => filterProfileTrainingRows(trainingRows, trainingView, yearMode),
    [trainingRows, trainingView, yearMode],
  );

  const currentPeriod = useMemo(
    () => getReportingPeriodBounds(yearMode, 0),
    [yearMode],
  );
  const previousPeriod = useMemo(
    () => getReportingPeriodBounds(yearMode, -1),
    [yearMode],
  );

  const summaryCards = useMemo(
    () => [
      {
        view: TRAINING_HISTORY_VIEWS.UPCOMING,
        label: TRAINING_HISTORY_VIEW_LABELS[TRAINING_HISTORY_VIEWS.UPCOMING],
        hoursLabel: formatHoursSummary(
          sumTrainingHours(filterProfileTrainingRows(trainingRows, TRAINING_HISTORY_VIEWS.UPCOMING, yearMode)),
        ),
        rangeLabel: null,
      },
      {
        view: TRAINING_HISTORY_VIEWS.CURRENT_YEAR,
        label:
          yearMode === YEAR_MODES.FISCAL ? "Current fiscal year" : TRAINING_HISTORY_VIEW_LABELS[TRAINING_HISTORY_VIEWS.CURRENT_YEAR],
        hoursLabel: formatHoursSummary(
          sumTrainingHours(
            filterProfileTrainingRows(trainingRows, TRAINING_HISTORY_VIEWS.CURRENT_YEAR, yearMode),
          ),
        ),
        rangeLabel: currentPeriod.label,
      },
      {
        view: TRAINING_HISTORY_VIEWS.PREVIOUS_YEAR,
        label:
          yearMode === YEAR_MODES.FISCAL ? "Previous fiscal year" : TRAINING_HISTORY_VIEW_LABELS[TRAINING_HISTORY_VIEWS.PREVIOUS_YEAR],
        hoursLabel: formatHoursSummary(
          sumTrainingHours(
            filterProfileTrainingRows(trainingRows, TRAINING_HISTORY_VIEWS.PREVIOUS_YEAR, yearMode),
          ),
        ),
        rangeLabel: previousPeriod.label,
      },
      {
        view: TRAINING_HISTORY_VIEWS.ALL_COMPLETED,
        label: TRAINING_HISTORY_VIEW_LABELS[TRAINING_HISTORY_VIEWS.ALL_COMPLETED],
        hoursLabel: formatHoursSummary(
          sumTrainingHours(
            filterProfileTrainingRows(trainingRows, TRAINING_HISTORY_VIEWS.ALL_COMPLETED, yearMode),
          ),
        ),
        rangeLabel: null,
      },
    ],
    [trainingRows, yearMode, currentPeriod.label, previousPeriod.label],
  );

  useEffect(() => {
    if (!editProfileOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setEditProfileOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [editProfileOpen]);

  const mailingAddress = student ? formatMailingAddress(student) : null;
  const emergencyContact = student ? formatEmergencyContact(student) : null;

  return (
    <>
      <PageHeader
        title="My Profile"
        subtitle="Personal information, employment, and training history"
        actions={
          student ? (
            <div className="flex flex-wrap items-center gap-2 no-print">
              <Link
                to="/student/transcript"
                className="inline-flex items-center gap-2 app-btn-secondary px-4 py-2 text-xs"
              >
                <Mail className="h-4 w-4" />
                Professional history report
              </Link>
            </div>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col gap-0 p-0">
        {error ? (
          <p className="mx-6 mt-6 rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700 lg:mx-7">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="px-6 py-8 text-sm text-[var(--color-afta-subtle)] lg:px-7">Loading profile…</p>
        ) : !student ? (
          <p className="px-6 py-8 text-sm text-[var(--color-afta-subtle)] lg:px-7">
            Your student profile is not linked yet. Contact the academy to connect your account.
          </p>
        ) : (
          <>
            <section className="border-b border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-6 py-6 lg:px-7">
              <h3 className="mb-6 text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-subtle)]">
                Personnel information
              </h3>
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
                <div className="flex flex-col gap-4 xl:min-w-[280px]">
                  <StudentProfilePhoto
                    studentId={student.id}
                    profilePictureUrl={student.profilePictureUrl}
                    displayName={formatStudentDisplayName(student)}
                    editable={allowPhotoUpload}
                    size="lg"
                    onPhotoChange={(url) => setStudent((current) => (current ? { ...current, profilePictureUrl: url } : current))}
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold tracking-wide text-[var(--color-afta-text)]">
                        {formatStudentDisplayName(student)}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setEditProfileOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-afta-border)] bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-afta-text)] transition hover:border-[#c8102e]/50 hover:bg-[var(--color-afta-surface)]"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit profile
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
                      {student.status === "active" ? "Active student" : "Inactive student"}
                    </p>
                  </div>
                </div>

                <div className="grid flex-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  <ProfileField label="Academy ID">{formatAcademyId(student)}</ProfileField>
                  <ProfileField label="FEMA SID">{student.femaSid || "—"}</ProfileField>
                  <ProfileField label="Date of birth">{formatProfileDate(student.dateOfBirth)}</ProfileField>

                  <ProfileField label="Organization">
                    {student.departmentName || <span className="text-[var(--color-afta-muted)]">Not on file</span>}
                  </ProfileField>
                  <ProfileField label="Rank / title">
                    {student.rank || <span className="text-[var(--color-afta-muted)]">Not on file</span>}
                  </ProfileField>
                  <ProfileField label="Employment type">
                    {EMPLOYMENT_STATUS_LABELS[student.employmentStatus] ?? student.employmentStatus ?? "—"}
                  </ProfileField>

                  <ProfileField label="Primary phone">
                    <span className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[var(--color-afta-muted)]" />
                      {student.phone ? (
                        <>
                          {formatStudentPhone(student.phone)}
                          <span className="text-xs text-[var(--color-afta-muted)]">Primary contact</span>
                        </>
                      ) : (
                        <span className="text-[var(--color-afta-muted)]">Not on file</span>
                      )}
                    </span>
                  </ProfileField>

                  <ProfileField label="Primary email">
                    {student.email ? (
                      <a href={`mailto:${student.email}`} className="text-[#38bdf8] hover:underline">
                        {student.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </ProfileField>

                  {student.emsLicense ? (
                    <ProfileField label="EMS license">{student.emsLicense}</ProfileField>
                  ) : null}

                  <ProfileField label="Mailing address" className="sm:col-span-2 xl:col-span-3">
                    {mailingAddress ? (
                      <span className="block whitespace-pre-line">{mailingAddress.join("\n")}</span>
                    ) : (
                      <span className="text-[var(--color-afta-muted)]">Not on file</span>
                    )}
                  </ProfileField>

                  <ProfileField label="Emergency contact" className="sm:col-span-2 xl:col-span-3">
                    {emergencyContact ? (
                      <span className="block">
                        <span className="font-medium text-[var(--color-afta-text)]">
                          {emergencyContact.name}
                          {emergencyContact.relationship ? ` · ${emergencyContact.relationship}` : ""}
                        </span>
                        <span className="mt-1 block">{emergencyContact.phone}</span>
                        <span className="mt-1 block text-[var(--color-afta-subtle)]">{emergencyContact.address}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--color-afta-muted)]">Not on file</span>
                    )}
                  </ProfileField>
                </div>
              </div>
            </section>

            {editProfileOpen ? (
              <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[max(1rem,8vh)] sm:p-6">
                <button
                  type="button"
                  aria-label="Close edit profile"
                  className="absolute inset-0 bg-[var(--color-afta-bg)]/80 backdrop-blur-[2px]"
                  onClick={() => setEditProfileOpen(false)}
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="edit-profile-title"
                  className="relative z-10 flex max-h-[min(85vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-[18px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-[var(--color-afta-border)] px-5 py-4">
                    <div>
                      <h3 id="edit-profile-title" className="text-sm font-semibold text-[var(--color-afta-text)]">
                        Edit profile
                      </h3>
                      <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
                        Mailing address, phone, emergency contact, employment, and special considerations
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditProfileOpen(false)}
                      className="rounded-full border border-[var(--color-afta-border)] p-2 text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="overflow-y-auto px-5 py-5">
                    <StudentSelfProfileForm
                      student={student}
                      onSaved={(updated) => {
                        setStudent(updated);
                        setEditProfileOpen(false);
                      }}
                      onCancel={() => setEditProfileOpen(false)}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {student.specialConsiderations ? (
              <section className="border-b border-[var(--color-afta-border)] px-6 py-5 lg:px-7">
                <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-subtle)]">
                  Special considerations on file
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-afta-text)]">
                  {student.specialConsiderations}
                </p>
              </section>
            ) : null}

            <section className="border-b border-[var(--color-afta-border)] px-6 py-5 lg:px-7">
              <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-subtle)]">
                Certifications
              </h3>
              {certifications.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--color-afta-muted)]">
                  No certifications have been issued to this person.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                        <th className="px-3 py-2 font-semibold">Certification</th>
                        <th className="px-3 py-2 font-semibold">Issued</th>
                        <th className="px-3 py-2 font-semibold">Expires</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certifications.map((row) => (
                        <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                          <td className="px-3 py-3 font-medium text-[var(--color-afta-text)]">{row.certificationName}</td>
                          <td className="px-3 py-3">{formatProfileDate(row.issuedDate)}</td>
                          <td className="px-3 py-3">{formatProfileDate(row.expiryDate)}</td>
                          <td className="px-3 py-3">
                            {STUDENT_CERTIFICATION_STATUS_LABELS[row.status] ?? row.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="px-6 py-6 lg:px-7 print:px-0">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between no-print">
                <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-subtle)]">
                  Training history
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-[10px] border border-[var(--color-afta-border)] bg-white p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setYearMode(YEAR_MODES.CALENDAR)}
                      className={`rounded-[8px] px-3 py-1.5 font-semibold ${
                        yearMode === YEAR_MODES.CALENDAR
                          ? "bg-slate-100 text-[var(--color-afta-text)]"
                          : "text-[var(--color-afta-muted)] hover:text-[var(--color-afta-text)]"
                      }`}
                    >
                      Calendar year
                    </button>
                    <button
                      type="button"
                      onClick={() => setYearMode(YEAR_MODES.FISCAL)}
                      className={`rounded-[8px] px-3 py-1.5 font-semibold ${
                        yearMode === YEAR_MODES.FISCAL
                          ? "bg-slate-100 text-[var(--color-afta-text)]"
                          : "text-[var(--color-afta-muted)] hover:text-[var(--color-afta-text)]"
                      }`}
                    >
                      Fiscal year
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {transcript ? (
                      <button
                        type="button"
                        onClick={() => downloadTranscriptCsv(transcript, student)}
                        className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
                      >
                        Download CSV
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 no-print">
                {summaryCards.map((card) => (
                  <TrainingSummaryCard
                    key={card.view}
                    label={card.label}
                    hoursLabel={card.hoursLabel}
                    rangeLabel={card.rangeLabel}
                    active={trainingView === card.view}
                    onClick={() => setTrainingView(card.view)}
                  />
                ))}
              </div>

              <div className="mt-6 overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
                <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-text)]">
                    {TRAINING_HISTORY_VIEW_LABELS[trainingView]}
                  </h4>
                  <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
                    {trainingView === TRAINING_HISTORY_VIEWS.UPCOMING
                      ? "Classes you are registered for or awaiting approval on."
                      : trainingView === TRAINING_HISTORY_VIEWS.ALL_COMPLETED
                        ? "All completed academy training on your record."
                        : trainingView === TRAINING_HISTORY_VIEWS.PREVIOUS_YEAR
                          ? previousPeriod.label
                          : currentPeriod.label}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-afta-border)] bg-white text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                        <th className="px-4 py-3 font-semibold">Training</th>
                        <th className="px-4 py-3 font-semibold">Start date</th>
                        <th className="px-4 py-3 font-semibold">End date</th>
                        <th className="px-4 py-3 font-semibold">Hours</th>
                        <th className="px-4 py-3 font-semibold">Training category</th>
                        <th className="px-4 py-3 font-semibold">Student status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTraining.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                            No training records in this view.
                          </td>
                        </tr>
                      ) : (
                        filteredTraining.map((row) => (
                          <tr key={row.key} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                            <td className="px-4 py-3">
                              <Link
                                to={`/student/register?classId=${row.classId}`}
                                className="font-medium text-[#38bdf8] hover:underline"
                              >
                                {row.courseName}
                              </Link>
                              <p className="mt-0.5 font-mono text-[11px] text-[var(--color-afta-muted)]">
                                {row.courseNumber}
                              </p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {formatProfileDate(row.startDate)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {formatProfileDate(row.endDate)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {formatTrainingHours(row.hours)}
                            </td>
                            <td className="px-4 py-3">{row.category || "—"}</td>
                            <td className="px-4 py-3">{row.statusLabel}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--color-afta-border)] px-5 py-3 text-xs text-[var(--color-afta-muted)]">
                  <span>
                    Showing {filteredTraining.length} record{filteredTraining.length === 1 ? "" : "s"}
                    {filteredTraining.length
                      ? ` · ${formatHoursSummary(sumTrainingHours(filteredTraining))}`
                      : ""}
                  </span>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUSES,
  approveDepartmentRegistration,
  denyDepartmentRegistration,
  filterRegistrations,
  formatCampusMealLodgingPreference,
  listRegistrationsByDepartment,
} from "../../lib/registrations.js";

export default function DepartmentApprovalsPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState("");
  const [error, setError] = useState(null);

  async function loadRows() {
    if (!user?.departmentId) {
      setRegistrations([]);
      return;
    }

    const rows = await listRegistrationsByDepartment(
      user.departmentId,
      REGISTRATION_STATUSES.PENDING_DEPARTMENT,
    );
    setRegistrations(rows);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        await loadRows();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load approval queue.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user?.departmentId]);

  const filtered = useMemo(
    () => filterRegistrations(registrations, search),
    [registrations, search],
  );

  async function handleApprove(registrationId) {
    setActingId(registrationId);
    setError(null);
    try {
      await approveDepartmentRegistration(registrationId, user.uid);
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve registration.");
    } finally {
      setActingId("");
    }
  }

  async function handleDeny(registrationId) {
    const reason = window.prompt("Reason for denial (optional):") ?? "";
    if (reason === null) return;

    setActingId(registrationId);
    setError(null);
    try {
      await denyDepartmentRegistration(registrationId, user.uid, reason);
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deny registration.");
    } finally {
      setActingId("");
    }
  }

  return (
    <>
      <PageHeader title="Registration Approvals" subtitle="Review requests from your department roster" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {!user?.departmentId ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">
            Your user profile needs a linked department before approvals can load.
          </p>
        ) : null}

        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student, course, location…"
            className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
          />
        </label>

        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading pending approvals…
                    </td>
                  </tr>
                ) : null}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No pending department approvals.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filtered.map((registration) => (
                      <tr key={registration.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--color-afta-text)]">{registration.studentName}</p>
                          <p className="text-xs text-[var(--color-afta-muted)]">{registration.studentEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p>{registration.courseName}</p>
                          <p className="font-mono text-xs text-[#c8102e]">{registration.courseNumber}</p>
                        </td>
                        <td className="px-4 py-3">
                          {registration.classStartDate === registration.classEndDate
                            ? registration.classStartDate
                            : `${registration.classStartDate} – ${registration.classEndDate}`}
                          <p className="text-xs text-[var(--color-afta-muted)]">{registration.classLocation}</p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {formatCampusMealLodgingPreference(registration) ? (
                            <p className="font-medium text-[var(--color-afta-text)]">
                              {formatCampusMealLodgingPreference(registration)}
                            </p>
                          ) : null}
                          <p className={formatCampusMealLodgingPreference(registration) ? "mt-1" : ""}>
                            {registration.notes || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={actingId === registration.id}
                              onClick={() => handleApprove(registration.id)}
                              className="rounded-[8px] bg-[#c8102e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={actingId === registration.id}
                              onClick={() => handleDeny(registration.id)}
                              className="rounded-[8px] border border-[var(--color-afta-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)] disabled:opacity-60"
                            >
                              Deny
                            </button>
                          </div>
                          <p className="mt-2 text-[10px] uppercase text-[var(--color-afta-muted)]">
                            {REGISTRATION_STATUS_LABELS[registration.status]}
                          </p>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

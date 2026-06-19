/**
 * @param {{ student: { firstName: string, lastName: string, departmentName?: string, femaSid?: string }, entries: import('../lib/transcripts.js').TranscriptEntry[], generatedAt?: string }} props
 */
export default function TranscriptDisplay({ student, entries, generatedAt }) {
  return (
    <article className="transcript-print mx-auto max-w-5xl rounded-[18px] border border-[#cbd5e1] bg-white p-8 text-[#0f172a] shadow-lg md:p-10">
      <header className="flex flex-col gap-6 border-b border-[#e2e8f0] pb-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <img src="/afta-logo.png" alt="" className="h-[72px] w-[72px] object-contain" />
          <div>
            <strong className="block text-lg text-[#0f172a]">Arkansas Fire Training Academy</strong>
            <span className="mt-1 block text-xs text-[var(--color-afta-muted)]">
              Official Training Transcript · Forge Academy Management System
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-[var(--color-afta-muted)]">
          <p className="text-sm font-semibold text-[#0f172a]">
            {student.firstName} {student.lastName}
          </p>
          {student.departmentName ? <p>{student.departmentName}</p> : null}
          {student.femaSid ? <p>FEMA SID: {student.femaSid}</p> : null}
          {generatedAt ? (
            <p className="mt-2">Generated {new Date(generatedAt).toLocaleDateString()}</p>
          ) : null}
        </div>
      </header>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#e2e8f0] text-[11px] uppercase tracking-[0.08em] text-[var(--color-afta-muted)]">
              <th className="px-3 py-3">Course</th>
              <th className="px-3 py-3">Number</th>
              <th className="px-3 py-3">Completed</th>
              <th className="px-3 py-3">Hours</th>
              <th className="px-3 py-3">Result</th>
              <th className="px-3 py-3">Certificate</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--color-afta-muted)]">
                  No training history recorded yet.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={`${entry.classId}-${entry.courseNumber}`} className="border-b border-[#e2e8f0]">
                  <td className="px-3 py-3">{entry.courseName}</td>
                  <td className="px-3 py-3 font-mono text-xs">{entry.courseNumber}</td>
                  <td className="px-3 py-3">
                    {entry.completedDate === "In progress"
                      ? "In progress"
                      : entry.completedDate === "—"
                        ? "—"
                        : new Date(`${entry.completedDate}T00:00:00`).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                  </td>
                  <td className="px-3 py-3">{entry.hours ?? "—"}</td>
                  <td className="px-3 py-3">{entry.result}</td>
                  <td className="px-3 py-3 font-mono text-xs text-[#c8102e]">
                    {entry.certificateNumber}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

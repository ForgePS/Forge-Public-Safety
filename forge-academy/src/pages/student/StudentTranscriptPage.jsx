import { useEffect, useState } from "react";
import TranscriptDisplay from "../../components/TranscriptDisplay.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getStudentForUser } from "../../lib/students.js";
import { buildStudentTranscript, downloadTranscriptCsv } from "../../lib/transcripts.js";

export default function StudentTranscriptPage() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [transcript, setTranscript] = useState(null);
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
            setTranscript({ studentId: "", entries: [], generatedAt: new Date().toISOString() });
          }
          return;
        }

        const built = await buildStudentTranscript(record.id);
        if (active) {
          setStudent(record);
          setTranscript(built);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load transcript.");
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

  return (
    <>
      <PageHeader
        title="Training Transcript"
        subtitle={student ? `${student.firstName} ${student.lastName}` : "Official training history"}
        actions={
          student && transcript ? (
            <div className="flex flex-wrap gap-2 no-print">
              <button
                type="button"
                onClick={() => downloadTranscriptCsv(transcript, student)}
                className="app-btn-secondary px-4 py-2 text-xs"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
              >
                Print / PDF
              </button>
            </div>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7 print:bg-white print:p-0">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700 no-print">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading transcript…</p>
        ) : student && transcript ? (
          <TranscriptDisplay student={student} entries={transcript.entries} generatedAt={transcript.generatedAt} />
        ) : (
          <p className="text-sm text-[var(--color-afta-subtle)]">
            Your student profile is not linked yet. Contact the academy to connect your account.
          </p>
        )}
      </div>
    </>
  );
}

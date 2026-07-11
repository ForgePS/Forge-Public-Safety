import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCms } from "../../cms/context/CmsContext.jsx";
import AdminPageHeader from "../components/AdminPageHeader.jsx";

export default function FormSubmissionsPage() {
  const { formId } = useParams();
  const { forms, store } = useCms();
  const [submissions, setSubmissions] = useState([]);
  const form = forms.find((f) => f.id === formId);

  useEffect(() => {
    store.getAll("formSubmissions").then((s) => {
      setSubmissions((Array.isArray(s) ? s : []).filter((sub) => sub.formId === formId));
    });
  }, [formId, store]);

  const exportCsv = () => {
    if (!submissions.length) return;
    const keys = Object.keys(submissions[0].data || {});
    const csv = [keys.join(","), ...submissions.map((s) => keys.map((k) => JSON.stringify(s.data[k] || "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${form?.name || "submissions"}.csv`;
    a.click();
  };

  return (
    <div className="p-8">
      <AdminPageHeader title={`Submissions: ${form?.name || formId}`} description={`${submissions.length} submission(s)`} actions={
        <button onClick={exportCsv} className="rounded-full px-4 py-2 text-sm font-bold text-white bg-[#F97316]">Export CSV</button>
      } />
      <div className="mt-8 rounded-2xl border border-[#1E293B] bg-[#111827] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1E293B] text-[#64748B] text-left">
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Status</th>
              {form?.fields?.map((f) => <th key={f.id} className="px-6 py-3">{f.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr key={sub.id} className="border-b border-[#1E293B]/50">
                <td className="px-6 py-4 text-[#64748B]">{new Date(sub.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{sub.status || "new"}</span></td>
                {form?.fields?.map((f) => <td key={f.id} className="px-6 py-4 text-white">{String(sub.data?.[f.name] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {submissions.length === 0 && <p className="p-8 text-center text-[#64748B]">No submissions yet.</p>}
      </div>
    </div>
  );
}

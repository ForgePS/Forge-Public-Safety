import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "./firebase.js";

export async function listScheduledReportExports(maxRows = 50) {
  const snap = await getDocs(query(collection(db, "scheduledReportExports"), limit(200)));
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
    .slice(0, maxRows);
}

/** @param {{ filename?: string, content?: string, reportType?: string }} row */
export function downloadScheduledReportExport(row) {
  const filename = row.filename || `${row.reportType || "report"}.csv`;
  const blob = new Blob([row.content || ""], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

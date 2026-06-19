import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { sendEmailMessage } from "./sendEmail.js";

function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function csvFromRows(headers, rows) {
  return [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
}

async function getSystemSettingsDoc() {
  const snap = await getFirestore().doc("systemSettings/default").get();
  return snap.exists ? snap.data() : {};
}

async function buildPassFailReport() {
  const snap = await getFirestore().collection("testResults").limit(5000).get();
  const headers = ["Student ID", "Class ID", "Test ID", "Score", "Pass/Fail", "Graded At"];
  const rows = snap.docs.map((doc) => {
    const data = doc.data();
    return [
      data.studentId ?? "",
      data.classId ?? "",
      data.testId ?? "",
      data.score ?? "",
      data.passFail ?? "",
      data.gradedAt?.toDate?.()?.toISOString?.() ?? "",
    ];
  });
  return { filename: "pass-fail-report.csv", content: csvFromRows(headers, rows), rowCount: rows.length };
}

async function buildEligibilityReport() {
  const snap = await getFirestore().collection("testEligibility").limit(5000).get();
  const headers = ["Student ID", "Class ID", "Test ID", "Approved", "LMS Met", "Attendance Met"];
  const rows = snap.docs.map((doc) => {
    const data = doc.data();
    return [
      data.studentId ?? "",
      data.classId ?? "",
      data.testId ?? "",
      data.approvedToTest ? "yes" : "no",
      data.lmsMet ? "yes" : "no",
      data.attendanceMet ? "yes" : "no",
    ];
  });
  return { filename: "eligibility-report.csv", content: csvFromRows(headers, rows), rowCount: rows.length };
}

async function buildCertificateReleaseReport() {
  const snap = await getFirestore().collection("certificateReleaseQueue").limit(5000).get();
  const headers = ["Student ID", "Class ID", "Status", "Test Result ID"];
  const rows = snap.docs.map((doc) => {
    const data = doc.data();
    return [data.studentId ?? "", data.classId ?? "", data.status ?? "", data.testResultId ?? ""];
  });
  return { filename: "certificate-release-report.csv", content: csvFromRows(headers, rows), rowCount: rows.length };
}

async function buildRemediationReport() {
  const snap = await getFirestore().collection("remediationAssignments").limit(5000).get();
  const headers = ["Student ID", "Class ID", "Status", "Test Result ID"];
  const rows = snap.docs.map((doc) => {
    const data = doc.data();
    return [data.studentId ?? "", data.classId ?? "", data.status ?? "", data.testResultId ?? ""];
  });
  return { filename: "remediation-report.csv", content: csvFromRows(headers, rows), rowCount: rows.length };
}

const REPORT_BUILDERS = {
  passFail: buildPassFailReport,
  eligibility: buildEligibilityReport,
  certificateRelease: buildCertificateReleaseReport,
  remediation: buildRemediationReport,
};

function shouldRunScheduledExport(frequency) {
  const now = new Date();
  if (frequency === "daily") return true;
  if (frequency === "weekly") return now.getUTCDay() === 1;
  if (frequency === "monthly") return now.getUTCDate() === 1;
  return false;
}

export async function runScheduledReportExports() {
  const settings = await getSystemSettingsDoc();
  const reports = settings.reports ?? {};
  if (!reports.scheduledExportsEnabled) {
    return { skipped: true, reason: "Scheduled exports disabled." };
  }

  const frequency = reports.scheduledExportFrequency ?? "weekly";
  if (!shouldRunScheduledExport(frequency)) {
    return { skipped: true, reason: `Not scheduled for ${frequency} run today.` };
  }

  const types = String(reports.scheduledExportTypes ?? "passFail")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const db = getFirestore();
  const batchId = db.collection("scheduledReportExports").doc().id;
  const generated = [];

  for (const type of types) {
    const builder = REPORT_BUILDERS[type];
    if (!builder) continue;
    const report = await builder();
    await db.collection("scheduledReportExports").add({
      batchId,
      reportType: type,
      filename: report.filename,
      rowCount: report.rowCount,
      content: report.content,
      createdAt: FieldValue.serverTimestamp(),
    });
    generated.push({ type, rowCount: report.rowCount, filename: report.filename });
  }

  await db.doc("systemSettings/default").set(
    {
      reports: {
        ...reports,
        scheduledExportLastRunAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  );

  const recipients = String(reports.scheduledExportRecipients ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (recipients.length > 0 && settings.notifications?.emailEnabled) {
    const summary = generated.map((item) => `${item.type}: ${item.rowCount} rows`).join("; ");
    for (const to of recipients) {
      await sendEmailMessage({
        to,
        subject: "Forge Academy scheduled report export complete",
        text: `Scheduled exports completed.\n\n${summary}\n\nDownload from Admin → Reports → Scheduled exports.`,
        template: "scheduled_report_export",
      });
    }
  }

  return { batchId, generated };
}

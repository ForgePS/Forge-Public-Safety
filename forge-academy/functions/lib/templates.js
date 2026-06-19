const PORTAL_URL = "https://forge-academy-95f84.web.app";

const MEAL_LODGING_LABELS = {
  lodging_and_food: "Lodging & food",
  lodging_only: "Lodging only",
  food_only: "Food only",
};

const STATUS_LABELS = {
  pending_department: "Awaiting department approval",
  pending_academy: "Awaiting academy approval",
  enrolled: "Enrolled",
  waitlisted: "Waitlisted",
};

function formatDates(registration) {
  if (registration.classStartDate === registration.classEndDate) {
    return registration.classStartDate;
  }
  return `${registration.classStartDate} – ${registration.classEndDate}`;
}

function formatTimes(registration) {
  if (!registration.classStartTime && !registration.classEndTime) return "";
  if (registration.classStartTime && registration.classEndTime) {
    return `${registration.classStartTime} – ${registration.classEndTime}`;
  }
  return registration.classStartTime || registration.classEndTime || "";
}

function classDetailsLines(registration) {
  const lines = [
    `Course: ${registration.courseName} (${registration.courseNumber})`,
    `Dates: ${formatDates(registration)}`,
  ];

  const times = formatTimes(registration);
  if (times) lines.push(`Daily hours: ${times}`);
  lines.push(`Location: ${registration.classLocation}`);

  if (registration.classRegistrationDeadline) {
    lines.push(`Registration deadline: ${registration.classRegistrationDeadline}`);
  }
  if (registration.classCancellationDeadline) {
    lines.push(`Cancellation deadline: ${registration.classCancellationDeadline}`);
  }
  if (registration.campusMealLodgingPreference) {
    lines.push(
      `Lodging/meals requested: ${MEAL_LODGING_LABELS[registration.campusMealLodgingPreference] ?? registration.campusMealLodgingPreference}`,
    );
  }
  if (registration.classMealLodgingNotes) {
    lines.push(`Meal/lodging notes: ${registration.classMealLodgingNotes}`);
  }
  if (registration.classHousingNotes) {
    lines.push(`Housing notes: ${registration.classHousingNotes}`);
  }
  if (registration.catalogPrerequisites) {
    lines.push(`Prerequisites: ${registration.catalogPrerequisites}`);
  }
  if (registration.catalogBook) {
    lines.push(`Textbook: ${registration.catalogBook}`);
  }
  if (registration.notes) {
    lines.push(`Student notes: ${registration.notes}`);
  }

  return lines;
}

function htmlList(lines) {
  return `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRegistrationSubmittedStudentEmail(registration) {
  const lines = classDetailsLines(registration);
  const statusLabel = STATUS_LABELS[registration.status] ?? registration.status;
  const subject = `Registration received — ${registration.courseName}`;
  const text = [
    `Hello ${registration.studentName},`,
    "",
    "Your class registration request has been submitted to the Arkansas Fire Training Academy.",
    "",
    `Current status: ${statusLabel}`,
    "",
    ...lines,
    "",
    registration.departmentName
      ? "Your department training officer will review this request first, then the academy will finalize approval."
      : "The academy will review and approve your request.",
    "",
    `Track your registration: ${PORTAL_URL}/student/register`,
    "",
    "Arkansas Fire Training Academy",
  ].join("\n");

  const html = `
    <p>Hello ${escapeHtml(registration.studentName)},</p>
    <p>Your class registration request has been submitted to the Arkansas Fire Training Academy.</p>
    <p><strong>Current status:</strong> ${escapeHtml(statusLabel)}</p>
    ${htmlList(lines)}
    <p>${
      registration.departmentName
        ? "Your department training officer will review this request first, then the academy will finalize approval."
        : "The academy will review and approve your request."
    }</p>
    <p><a href="${PORTAL_URL}/student/register">Track your registration</a></p>
    <p>Arkansas Fire Training Academy</p>
  `;

  return { subject, text, html };
}

export function buildRegistrationSubmittedDepartmentEmail(registration, recipientRole) {
  const lines = [
    `Student: ${registration.studentName} (${registration.studentEmail})`,
    `Department: ${registration.departmentName || "Independent"}`,
    ...classDetailsLines(registration),
  ];
  const subject = `New class registration — ${registration.studentName} · ${registration.courseName}`;
  const text = [
    `Hello ${recipientRole},`,
    "",
    "A new class registration request was submitted and requires your awareness.",
    "",
    ...lines,
    "",
    `Review in the portal: ${PORTAL_URL}/department/approvals`,
    "",
    "Arkansas Fire Training Academy",
  ].join("\n");

  const html = `
    <p>Hello ${escapeHtml(recipientRole)},</p>
    <p>A new class registration request was submitted and requires your awareness.</p>
    ${htmlList(lines)}
    <p><a href="${PORTAL_URL}/department/approvals">Review in the portal</a></p>
    <p>Arkansas Fire Training Academy</p>
  `;

  return { subject, text, html };
}

export function buildRegistrationApprovedStudentEmail(registration) {
  const statusLabel = STATUS_LABELS[registration.status] ?? registration.status;
  const lines = classDetailsLines(registration);
  const subject = `Registration approved — ${registration.courseName}`;
  const text = [
    `Hello ${registration.studentName},`,
    "",
    `Your registration has been approved. Status: ${statusLabel}.`,
    "",
    "Important class details:",
    ...lines,
    "",
    registration.catalogDescription
      ? `About this course: ${registration.catalogDescription}`
      : "",
    "",
    registration.status === "waitlisted"
      ? "You are currently on the waitlist. The academy will contact you if a seat opens."
      : "Please arrive on time and bring required textbooks and PPE as listed above.",
    "",
    `Student portal: ${PORTAL_URL}/student/register`,
    registration.needsLodging ? `Housing information: ${PORTAL_URL}/student/housing` : "",
    "",
    "If you have questions, contact your department training officer or the academy.",
    "",
    "Arkansas Fire Training Academy",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Hello ${escapeHtml(registration.studentName)},</p>
    <p>Your registration has been approved. <strong>Status:</strong> ${escapeHtml(statusLabel)}.</p>
    <h3>Important class details</h3>
    ${htmlList(lines)}
    ${
      registration.catalogDescription
        ? `<p><strong>About this course:</strong> ${escapeHtml(registration.catalogDescription)}</p>`
        : ""
    }
    <p>${
      registration.status === "waitlisted"
        ? "You are currently on the waitlist. The academy will contact you if a seat opens."
        : "Please arrive on time and bring required textbooks and PPE as listed above."
    }</p>
    <p><a href="${PORTAL_URL}/student/register">Student portal</a></p>
    ${
      registration.needsLodging
        ? `<p><a href="${PORTAL_URL}/student/housing">View housing information</a></p>`
        : ""
    }
    <p>Arkansas Fire Training Academy</p>
  `;

  return { subject, text, html };
}

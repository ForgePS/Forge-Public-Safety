import { getDocs, collection, query } from "firebase/firestore";
import { db } from "./firebase.js";
import { listClassSessions, isHousingRequired } from "./classes.js";
import { listEnrolledRegistrationsByClass } from "./registrations.js";
import { listAssignmentsByClass, ASSIGNMENT_STATUSES } from "./roomAssignments.js";
import { listRooms, ROOM_STATUSES } from "./rooms.js";
import { getStudent } from "./students.js";

/**
 * @typedef {Object} HousingDashboardMetrics
 * @property {number} studentsNeedingAssignment
 * @property {number} roomsAvailable
 * @property {number} roomsFull
 * @property {number} roomsMaintenance
 * @property {number} upcomingHousingClasses
 */

/** @returns {Promise<HousingDashboardMetrics>} */
export async function getHousingDashboardMetrics() {
  const [classes, rooms] = await Promise.all([listClassSessions(), listRooms()]);
  const today = new Date().toISOString().slice(0, 10);
  const housingClasses = classes.filter(
    (session) =>
      isHousingRequired(session) &&
      session.endDate >= today &&
      session.status !== "cancelled",
  );

  let studentsNeedingAssignment = 0;
  for (const classSession of housingClasses) {
    const [enrolled, assignments] = await Promise.all([
      listEnrolledRegistrationsByClass(classSession.id),
      listAssignmentsByClass(classSession.id),
    ]);
    const assignedStudentIds = new Set(
      assignments
        .filter((item) =>
          [ASSIGNMENT_STATUSES.ASSIGNED, ASSIGNMENT_STATUSES.CHECKED_IN].includes(item.status),
        )
        .map((item) => item.studentId),
    );
    studentsNeedingAssignment += enrolled.filter((item) => !assignedStudentIds.has(item.studentId))
      .length;
  }

  const activeRooms = rooms.filter((room) => room.status === ROOM_STATUSES.ACTIVE);
  const roomsMaintenance = rooms.filter((room) => room.status === ROOM_STATUSES.MAINTENANCE).length;

  let roomsFull = 0;
  let roomsAvailable = 0;
  for (const room of activeRooms) {
    const occupancy = await countCurrentRoomOccupancy(room.id);
    if (occupancy >= room.capacity) roomsFull += 1;
    else roomsAvailable += 1;
  }

  return {
    studentsNeedingAssignment,
    roomsAvailable,
    roomsFull,
    roomsMaintenance,
    upcomingHousingClasses: housingClasses.length,
  };
}

/** @param {string} roomId */
async function countCurrentRoomOccupancy(roomId) {
  const assignments = await getAllActiveAssignments();
  return assignments.filter((item) => item.roomId === roomId).length;
}

async function getAllActiveAssignments() {
  const snap = await getDocs(query(collection(db, "roomAssignments")));
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) =>
      [ASSIGNMENT_STATUSES.ASSIGNED, ASSIGNMENT_STATUSES.CHECKED_IN].includes(item.status),
    );
}

/**
 * @typedef {Object} ClassHousingRosterRow
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} departmentName
 * @property {string} femaSid
 * @property {string} courseName
 * @property {string} roomNumber
 * @property {string} building
 * @property {string} bedAssignment
 * @property {string} status
 * @property {string} checkInDate
 * @property {string} checkOutDate
 * @property {string} notes
 * @property {string} assignmentId
 */

/** @param {string} classId @returns {Promise<ClassHousingRosterRow[]>} */
export async function buildClassHousingRoster(classId) {
  const [enrolled, assignments] = await Promise.all([
    listEnrolledRegistrationsByClass(classId),
    listAssignmentsByClass(classId),
  ]);

  const assignmentByStudent = new Map(assignments.map((item) => [item.studentId, item]));
  const rows = [];

  for (const registration of enrolled) {
    const assignment = assignmentByStudent.get(registration.studentId);
    let femaSid = assignment?.femaSid ?? "";
    if (!femaSid) {
      const student = await getStudent(registration.studentId);
      femaSid = student?.femaSid ?? "";
    }

    rows.push({
      studentId: registration.studentId,
      studentName: registration.studentName,
      departmentName: registration.departmentName || "Independent",
      femaSid,
      courseName: registration.courseName,
      roomNumber: assignment?.roomNumber ?? "—",
      building: assignment?.building ?? "",
      bedAssignment: assignment?.bedAssignment ?? "—",
      status: assignment?.status ?? "unassigned",
      checkInDate: assignment?.checkInDate ?? "",
      checkOutDate: assignment?.checkOutDate ?? "",
      notes: assignment?.notes ?? "",
      assignmentId: assignment?.id ?? "",
    });
  }

  return rows.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/** @param {ClassHousingRosterRow[]} rows @param {string} filename */
export function downloadHousingRosterCsv(rows, filename) {
  const lines = [
    "Student,Department,FEMA SID,Course,Room,Building,Bed,Status,Check-In,Check-Out,Notes",
    ...rows.map(
      (row) =>
        [
          csvEscape(row.studentName),
          csvEscape(row.departmentName),
          csvEscape(row.femaSid),
          csvEscape(row.courseName),
          csvEscape(row.roomNumber),
          csvEscape(row.building),
          csvEscape(row.bedAssignment),
          csvEscape(row.status),
          csvEscape(row.checkInDate),
          csvEscape(row.checkOutDate),
          csvEscape(row.notes),
        ].join(","),
    ),
  ];

  downloadCsv(lines.join("\n"), filename);
}

/** @param {import('./rooms.js').RoomRecord[]} rooms @param {string} reportType */
export function downloadRoomReportCsv(rooms, reportType) {
  const lines = [
    "Room Number,Building,Floor,Type,Status,Capacity,Notes",
    ...rooms.map((room) =>
      [
        csvEscape(room.roomNumber),
        csvEscape(room.building),
        csvEscape(room.floor),
        csvEscape(room.roomType),
        csvEscape(room.status),
        room.capacity,
        csvEscape(room.notes),
      ].join(","),
    ),
  ];
  downloadCsv(lines.join("\n"), `${reportType}-rooms.csv`);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** @param {string} departmentId @returns {Promise<ClassHousingRosterRow[]>} */
export async function buildDepartmentHousingView(departmentId) {
  const classes = await listClassSessions();
  const housingClasses = classes.filter((session) => isHousingRequired(session));
  const rows = [];

  for (const classSession of housingClasses) {
    const roster = await buildClassHousingRoster(classSession.id);
    for (const row of roster) {
      const student = await getStudent(row.studentId);
      if (student?.departmentId === departmentId) {
        rows.push(row);
      }
    }
  }

  return rows.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export function printHousingRoster(title, rows) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 18px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>
              <th>Student</th><th>Department</th><th>FEMA SID</th><th>Room</th>
              <th>Bed</th><th>Status</th><th>Check-In</th><th>Check-Out</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `<tr>
                  <td>${escapeHtml(row.studentName)}</td>
                  <td>${escapeHtml(row.departmentName)}</td>
                  <td>${escapeHtml(row.femaSid)}</td>
                  <td>${escapeHtml(row.roomNumber)}</td>
                  <td>${escapeHtml(row.bedAssignment)}</td>
                  <td>${escapeHtml(row.status)}</td>
                  <td>${escapeHtml(row.checkInDate)}</td>
                  <td>${escapeHtml(row.checkOutDate)}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

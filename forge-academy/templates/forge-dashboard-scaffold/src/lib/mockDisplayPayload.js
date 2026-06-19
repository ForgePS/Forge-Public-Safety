/** @typedef {{ type: string, title: string, items: { id: string, label: string, detail?: string, severity?: string }[] }} RmsWidget */

/**
 * Mock payload until RMS `GET /v1/departments/{id}/dashboard-feed` is wired.
 * @param {string} displayId
 * @returns {Promise<{ display: { id: string, name: string, departmentLabel: string }, widgets: RmsWidget[], generatedAt: string }>}
 */
export async function fetchDisplayPayload(displayId, publicKey) {
  if (!displayId || !publicKey) {
    throw new Error("Display id and public key are required.");
  }

  await new Promise((resolve) => setTimeout(resolve, 200));

  return {
    display: {
      id: displayId,
      name: "Station 1 — Ops Display",
      departmentLabel: "Sample Fire Department · FDID 0452",
    },
    generatedAt: new Date().toISOString(),
    widgets: [
      {
        type: "alerts",
        title: "Active alerts",
        items: [
          { id: "a1", label: "Training drill Saturday 0800", severity: "info" },
          { id: "a2", label: "Apparatus 2 out of service — maintenance", severity: "warn" },
        ],
      },
      {
        type: "units",
        title: "Unit status",
        items: [
          { id: "u1", label: "Engine 1", detail: "Available", severity: "info" },
          { id: "u2", label: "Ladder 1", detail: "On scene", severity: "warn" },
          { id: "u3", label: "Rescue 1", detail: "Available", severity: "info" },
        ],
      },
      {
        type: "incidents",
        title: "Recent incidents",
        items: [
          { id: "i1", label: "Medical assist", detail: "14:22 · Closed" },
          { id: "i2", label: "Alarm activation", detail: "11:05 · Closed" },
        ],
      },
    ],
  };
}

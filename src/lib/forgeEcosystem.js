/** Forge Public Safety product map — see docs/ARCHITECTURE.md */

export const FORGE_ACADEMY_PROJECT_ID = "forge-academy-95f84";
export const FORGE_ACADEMY_HOSTING_URL = "https://forge-academy-95f84.web.app";

export const FORGE_RMS_PROJECT_ID = "rms-dashboard-7562e";
export const FORGE_RMS_HOSTING_URL = "https://rms-dashboard-7562e.web.app";
/** Platform tenant for Forge RMS integration — not a single fire department. */
export const FORGE_RMS_PLATFORM_TENANT_ID = "forge-platform";
/** Custom domain when DNS is wired; hosting URL is the live Firebase deployment today. */
export const FORGE_RMS_CUSTOM_DOMAIN = "https://rms.forgepublicsafety.com";

/** @typedef {{ id: string, name: string, description: string, repoUrl?: string, appUrl?: string, owns: string[] }} ForgeProduct */

/** @type {ForgeProduct[]} */
export const FORGE_ECOSYSTEM_PRODUCTS = [
  {
    id: "academy",
    name: "Forge Academy",
    description: "Training platform — registration, classes, skills, testing, certificates, campus signage.",
    appUrl: FORGE_ACADEMY_HOSTING_URL,
    owns: [
      "Student & instructor portals",
      "Campus digital signage (this admin)",
      "Training records & certifications",
    ],
  },
  {
    id: "rms",
    name: "Forge RMS",
    description: "Records management for fire departments — personnel, incidents, field operations.",
    appUrl: FORGE_RMS_HOSTING_URL,
    repoUrl: "https://github.com/ForgePS/firebase-app",
    owns: ["Forge Field App", "Department & personnel system of record"],
  },
  {
    id: "integration-hub",
    name: "Forge Integration Hub",
    description:
      "Central Academy ↔ RMS sync and Forge Person Identity — permanent personId, FEMA SID matching, merges, and audit.",
    owns: [
      "Person Identity (personId / forgePersonId)",
      "forge* identifiers",
      "Department connection",
      "Duplicate review & FEMA SID corrections",
      "Sync logs & audit",
    ],
  },
  {
    id: "dashboard",
    name: "ForgePS Dashboard",
    description: "Org-wide digital signage fed primarily from RMS data (Display 1, Display 2, …).",
    repoUrl: "https://github.com/ForgePS/Dashboard",
    owns: ["Operations TV displays", "RMS-driven widgets & alerts"],
  },
  {
    id: "website",
    name: "Public website",
    description: "Marketing and login links — maintained in a separate off-site program.",
    owns: ["Public marketing pages", "Links to Academy & RMS login"],
  },
];

export const CAMPUS_SIGNAGE_SUMMARY =
  "Campus Signage manages AFTA training-site TVs (schedules, dining, announcements). It is separate from ForgePS/Dashboard, which shows org-wide RMS content on department displays.";

/** @type {{ title: string, detail: string }[]} */
export const INTEGRATION_PRINCIPLES = [
  {
    title: "Separate Firebase projects",
    detail: "Academy uses forge-academy-95f84. RMS and Dashboard use their own backends — no shared Firestore.",
  },
  {
    title: "Hub owns Person Identity",
    detail:
      "Academy and RMS must call Integration Hub POST /identity/resolve before creating people. personId is a Firestore auto-id (never Auth UID, never manually edited).",
  },
  {
    title: "APIs, not shared databases",
    detail: "When products exchange data, use authenticated HTTPS APIs or webhooks with shared forge* IDs.",
  },
  {
    title: "Website stays external",
    detail: "The public marketing site links to product logins only; it does not read training or RMS data.",
  },
  {
    title: "Campus vs org displays",
    detail: "Configure campus TVs here. Configure department ops TVs in ForgePS/Dashboard once RMS feeds are live.",
  },
];

/** Shared identifiers for cross-product sync. */
export const SHARED_IDENTIFIER_FIELDS = [
  {
    id: "forgePersonId",
    note: "Permanent Forge-wide person identity from Hub (same value as personId; never Auth UID)",
  },
  { id: "forgeDepartmentId", note: "Permanent department / connection identity from Hub" },
  { id: "forgeAcademyStudentId", note: "Academy students/{id} linked on Hub identity map" },
  { id: "departmentId", note: "Academy departments collection id" },
  { id: "fdid", note: "Fire department FDID on department profile" },
  { id: "studentId", note: "Academy students collection id (local training profile)" },
  { id: "rmsPersonId", note: "Forge RMS personnel id (platform-wide, e.g. FPS-001)" },
  { id: "rmsDepartmentId", note: "Optional — link Academy department when multi-dept mapping is enabled" },
];

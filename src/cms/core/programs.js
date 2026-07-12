import { createId } from "./ids.js";

export const DEFAULT_PROGRAM_ID = "forge-marketing";

export const PROGRAM_TYPES = {
  marketing: "Marketing Website",
  application: "Web Application",
  landing: "Landing Page",
};

export const DEFAULT_PROGRAMS = [
  {
    id: "forge-marketing",
    name: "Forge Public Safety",
    shortName: "Marketing",
    slug: "forge-public-safety",
    type: "marketing",
    description: "Main company marketing site — forgepublicsafety.com",
    domains: ["forgepublicsafety.com", "www.forgepublicsafety.com"],
    previewDomains: ["forge-website-b276c.web.app", "localhost"],
    liveUrl: "https://forge-website-b276c.web.app",
    status: "active",
    color: "#F97316",
    createdAt: new Date().toISOString(),
  },
  {
    id: "forge-industrial-survey",
    name: "Forge Industrial Survey",
    shortName: "Industrial Survey",
    slug: "forge-industrial-survey",
    type: "marketing",
    description: "Industrial survey product marketing site",
    domains: [],
    previewDomains: [],
    liveUrl: "",
    status: "draft",
    color: "#3B82F6",
    createdAt: new Date().toISOString(),
  },
  {
    id: "forge-rms",
    name: "Forge RMS",
    shortName: "RMS",
    slug: "forge-rms",
    type: "application",
    description: "Records management system — marketing pages and public site content",
    domains: ["rms.forgepublicsafety.com"],
    previewDomains: [],
    liveUrl: "https://rms.forgepublicsafety.com",
    appUrl: "https://rms.forgepublicsafety.com",
    status: "active",
    color: "#10B981",
    createdAt: new Date().toISOString(),
  },
  {
    id: "forge-academy",
    name: "Forge Academy",
    shortName: "Academy",
    slug: "forge-academy",
    type: "application",
    description: "Training academy — marketing pages (LMS admin stays in Academy app)",
    domains: [],
    previewDomains: ["forge-academy-95f84.web.app"],
    liveUrl: "https://forge-academy-95f84.web.app",
    appUrl: "https://forge-academy-95f84.web.app/admin",
    status: "active",
    color: "#8B5CF6",
    createdAt: new Date().toISOString(),
  },
];

export function createProgram(overrides = {}) {
  return {
    id: createId("program"),
    name: "New Program",
    shortName: "New",
    slug: "new-program",
    type: "marketing",
    description: "",
    domains: [],
    previewDomains: [],
    liveUrl: "",
    appUrl: "",
    status: "draft",
    color: "#64748B",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function resolveProgramFromHost(hostname, programs = DEFAULT_PROGRAMS) {
  const host = (hostname || "").replace(/^www\./, "").toLowerCase();
  const match = programs.find((p) =>
    (p.domains || []).some((d) => d.replace(/^www\./, "").toLowerCase() === host) ||
    (p.previewDomains || []).some((d) => d.replace(/^www\./, "").toLowerCase() === host)
  );
  return match || programs.find((p) => p.id === DEFAULT_PROGRAM_ID) || programs[0];
}

export function programSingletonId(programId) {
  return programId || DEFAULT_PROGRAM_ID;
}

export function belongsToProgram(item, programId) {
  if (!item) return false;
  return (item.programId || DEFAULT_PROGRAM_ID) === programId;
}

export function withProgramId(item, programId) {
  return { ...item, programId: programId || DEFAULT_PROGRAM_ID };
}

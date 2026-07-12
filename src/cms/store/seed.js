import { DEFAULT_ROLES } from "../core/constants.js";
import { DEFAULT_PROGRAMS } from "../core/programs.js";
import { setLocalStore } from "./localStore.js";
import { getProgramContentSource } from "./programContentSources.js";
import { buildProgramBundle } from "./contentBuilders.js";

export function buildSeedData() {
  const programs = DEFAULT_PROGRAMS;
  const bundles = programs.map((p) => buildProgramBundle(p, getProgramContentSource(p.id)));

  const merge = (key) => bundles.flatMap((b) => b[key] || []);

  return {
    programs,
    pages: merge("pages"),
    savedSections: [],
    branding: merge("branding"),
    navigation: merge("navigation"),
    footers: merge("footers"),
    media: [],
    forms: merge("forms"),
    formSubmissions: [],
    collections: merge("collections"),
    collectionEntries: [],
    settings: merge("settings"),
    emailTemplates: merge("emailTemplates"),
    popups: [],
    integrations: [],
    roles: DEFAULT_ROLES,
    users: [{ id: "admin", email: "admin@forgepublicsafety.com", role: "super_admin", name: "Administrator" }],
    versions: [],
    redirects: merge("redirects"),
    seoGlobal: merge("seoGlobal"),
    search: merge("search"),
  };
}

export function seedLocalStore() {
  const data = buildSeedData();
  setLocalStore(data);
  return data;
}

export { buildProgramBundle, buildMarketingBundleFromContent } from "./contentBuilders.js";

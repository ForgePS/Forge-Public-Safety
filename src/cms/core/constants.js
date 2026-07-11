export const CMS_COLLECTIONS = {
  pages: "cms_pages",
  savedSections: "cms_saved_sections",
  branding: "cms_branding",
  navigation: "cms_navigation",
  footers: "cms_footers",
  media: "cms_media",
  forms: "cms_forms",
  formSubmissions: "cms_form_submissions",
  collections: "cms_collections",
  collectionEntries: "cms_collection_entries",
  settings: "cms_settings",
  emailTemplates: "cms_email_templates",
  popups: "cms_popups",
  integrations: "cms_integrations",
  roles: "cms_roles",
  users: "cms_users",
  versions: "cms_versions",
  redirects: "cms_redirects",
  seoGlobal: "cms_seo_global",
  search: "cms_search",
};

export const PAGE_STATUS = {
  draft: "draft",
  published: "published",
  scheduled: "scheduled",
  archived: "archived",
};

export const BREAKPOINTS = ["desktop", "tablet", "mobile"];

export const DEFAULT_ROLES = [
  {
    id: "super_admin",
    name: "Super Administrator",
    permissions: ["*"],
  },
  {
    id: "admin",
    name: "Administrator",
    permissions: [
      "pages.*", "sections.*", "branding.*", "navigation.*", "footer.*",
      "media.*", "forms.*", "collections.*", "seo.*", "settings.*",
      "email.*", "popups.*", "integrations.read", "roles.read", "versions.*",
    ],
  },
  {
    id: "website_manager",
    name: "Website Manager",
    permissions: [
      "pages.*", "sections.*", "branding.read", "navigation.*", "footer.*",
      "media.*", "forms.read", "collections.*", "seo.*", "popups.*", "versions.read",
    ],
  },
  {
    id: "content_editor",
    name: "Content Editor",
    permissions: ["pages.edit", "sections.*", "media.read", "collections.edit", "versions.read"],
  },
  {
    id: "marketing_editor",
    name: "Marketing Editor",
    permissions: ["pages.edit", "sections.*", "popups.*", "seo.edit", "media.*"],
  },
  {
    id: "media_manager",
    name: "Media Manager",
    permissions: ["media.*"],
  },
  {
    id: "form_manager",
    name: "Form Manager",
    permissions: ["forms.*"],
  },
  {
    id: "seo_manager",
    name: "SEO Manager",
    permissions: ["seo.*", "pages.read", "redirects.*"],
  },
  {
    id: "read_only",
    name: "Read Only",
    permissions: ["*.read"],
  },
];

export const LOCAL_STORE_KEY = "forge_cms_data_v1";

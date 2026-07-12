import { createId, createPageId, createSectionId, createBlockId } from "../core/ids.js";
import {
  DEFAULT_BRANDING,
  DEFAULT_NAVIGATION,
  DEFAULT_FOOTER,
  DEFAULT_SEO,
  DEFAULT_PAGE,
  createBlock,
  createSection,
} from "../blocks/registry.js";
import { DEFAULT_ROLES } from "../core/constants.js";
import { DEFAULT_PROGRAMS, DEFAULT_PROGRAM_ID, withProgramId, createProgram } from "../core/programs.js";
import { setLocalStore } from "./localStore.js";

import globalData from "../../../content/global.json";
import homeData from "../../../content/home.json";
import productsPageData from "../../../content/products-page.json";
import productModulesData from "../../../content/product-modules.json";
import addonModulesData from "../../../content/addon-modules.json";
import solutionsData from "../../../content/solutions.json";
import companyData from "../../../content/company.json";
import contactData from "../../../content/contact.json";
import resourcesData from "../../../content/resources.json";
import footerData from "../../../content/footer.json";

function heroSection(data, bgImage = "/assets/hero-firefighter.png") {
  return {
    id: createSectionId(),
    type: "hero",
    hidden: false,
    settings: {
      width: "full",
      height: "auto",
      padding: { top: "96px", right: "0", bottom: "96px", left: "0" },
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      background: { type: "color", color: "#0B1220" },
    },
    blocks: [{
      id: createBlockId(),
      type: "hero",
      hidden: false,
      settings: {},
      content: {
        eyebrow: data.eyebrow || data.heroEyebrow || "",
        title: data.title || data.heroTitle || "",
        lead: data.lead || data.heroLead || "",
        body: data.body || data.heroBody || "",
        bullets: data.bullets || data.heroBullets || [],
        backgroundImage: bgImage,
        buttons: data.buttons || [
          { label: globalData.navigation.ctaLabel, href: "/contact", style: "primary", newTab: false },
          { label: "Learn More", href: "/products", style: "outline", newTab: false },
        ],
      },
    }],
  };
}

function headingSection(eyebrow, title, description, align = "left") {
  return {
    id: createSectionId(),
    type: "heading",
    hidden: false,
    settings: { padding: { top: "80px", right: "0", bottom: "0", left: "0" }, background: { type: "color", color: "#000000" } },
    blocks: [{
      id: createBlockId(),
      type: "heading",
      hidden: false,
      settings: {},
      content: { eyebrow, title, description, align },
    }],
  };
}

function cardGridSection(eyebrow, title, description, cards, columns = 3, bg = "#000000") {
  return {
    id: createSectionId(),
    type: "cardGrid",
    hidden: false,
    settings: { padding: { top: "80px", right: "0", bottom: "80px", left: "0" }, background: { type: "color", color: bg } },
    blocks: [{
      id: createBlockId(),
      type: "cardGrid",
      hidden: false,
      settings: {},
      content: { eyebrow, title, description, cards, columns },
    }],
  };
}

function ctaSection(title, description, buttons, note = "", bg = "#0B1220") {
  return {
    id: createSectionId(),
    type: "cta",
    hidden: false,
    settings: {
      padding: { top: "80px", right: "0", bottom: "80px", left: "0" },
      background: { type: "color", color: bg },
      border: { width: "1px 0", style: "solid", color: "#1E293B" },
    },
    blocks: [{
      id: createBlockId(),
      type: "cta",
      hidden: false,
      settings: {},
      content: { eyebrow: "", title, description, buttons, note, align: "center" },
    }],
  };
}

function buildHomePage() {
  const home = homeData.home;
  return {
    id: createPageId(),
    ...DEFAULT_PAGE,
    title: "Home",
    slug: "home",
    status: "published",
    seo: {
      ...DEFAULT_SEO,
      title: `${globalData.site.name} — ${globalData.site.tagline}`,
      description: home.heroLead,
    },
    sections: [
      heroSection({
        heroEyebrow: home.heroEyebrow,
        heroTitle: home.heroTitle,
        heroLead: home.heroLead,
        heroBody: home.heroBody,
        heroBullets: home.heroBullets,
      }),
      cardGridSection(
        home.modulesEyebrow,
        home.modulesTitle,
        home.modulesDescription,
        addonModulesData.addOnModules.map((m) => ({
          title: m.name,
          subtitle: m.subtitle,
          description: m.description,
          badge: "Module",
        })),
        3,
        "#000000"
      ),
      cardGridSection(
        home.productsEyebrow,
        home.productsTitle,
        home.productsDescription,
        productModulesData.productModules.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: p.subtitle,
          description: p.description,
          link: p.liveLink ? globalData.site.rmsUrl : "/contact",
          linkLabel: p.liveLink ? `Explore ${p.name}` : globalData.navigation.ctaLabel,
        })),
        3,
        "#0B1220"
      ),
      {
        id: createSectionId(),
        type: "featureGrid",
        hidden: false,
        settings: { padding: { top: "80px", right: "0", bottom: "80px", left: "0" }, background: { type: "color", color: "#000000" } },
        blocks: [{
          id: createBlockId(),
          type: "featureGrid",
          hidden: false,
          settings: {},
          content: {
            eyebrow: home.whyEyebrow,
            title: home.whyTitle,
            description: home.whyDescription,
            features: home.whyCards.map((c) => ({ title: c.title, description: c.copy })),
            columns: 1,
          },
        }],
      },
      ctaSection(
        home.closingTitle,
        home.closingDescription,
        [
          { label: "Request a Demo", href: "/contact", style: "primary", newTab: false },
          { label: "Explore Forge RMS", href: globalData.site.rmsUrl, style: "outline", newTab: true },
        ],
        globalData.site.pricingNote
      ),
    ],
  };
}

function buildProductsPage() {
  const page = productsPageData.products || {};
  return {
    id: createPageId(),
    ...DEFAULT_PAGE,
    title: "Products",
    slug: "products",
    status: "published",
    seo: { ...DEFAULT_SEO, title: `Products — ${globalData.site.name}`, description: page.heroDescription || "" },
    sections: [
      headingSection(page.heroEyebrow || "Products", page.heroTitle || "Products", page.heroDescription || ""),
      cardGridSection(page.baseEyebrow, page.baseTitle, page.baseDescription, (productsPageData.basePackageFeatures || []).map((f) => ({ title: f, description: "" })), 2, "#000000"),
      cardGridSection("", page.coreTitle || "Core Products", page.coreDescription || "", productModulesData.productModules.map((p) => ({
        id: p.id, title: p.name, subtitle: p.subtitle, description: p.description,
      })), 3, "#0B1220"),
      cardGridSection(page.addonsEyebrow, page.addonsTitle, page.addonsDescription, addonModulesData.addOnModules.map((m) => ({
        title: m.name, subtitle: m.subtitle, description: m.description, badge: "Module",
      })), 3, "#000000"),
      ctaSection("Ready to get started?", page.heroSecondaryLink || "", [
        { label: globalData.navigation.ctaLabel, href: "/contact", style: "primary", newTab: false },
      ]),
    ],
  };
}

function buildSolutionsPage() {
  const sol = solutionsData.solutions || {};
  return {
    id: createPageId(),
    ...DEFAULT_PAGE,
    title: "Solutions",
    slug: "solutions",
    status: "published",
    seo: { ...DEFAULT_SEO, title: `Solutions — ${globalData.site.name}`, description: sol.description || "" },
    sections: [
      heroSection({ eyebrow: sol.eyebrow, title: sol.title, lead: sol.description, body: "" }, ""),
      cardGridSection("", "Solutions", "", (sol.items || []).map((item) => ({
        title: item.title, description: item.copy || item.description,
      })), 2, "#000000"),
      ctaSection(sol.closingTitle || "", sol.closingDescription || "", [
        { label: globalData.navigation.ctaLabel, href: "/contact", style: "primary", newTab: false },
      ]),
    ],
  };
}

function buildCompanyPage() {
  const co = companyData.company || {};
  return {
    id: createPageId(),
    ...DEFAULT_PAGE,
    title: "Company",
    slug: "company",
    status: "published",
    seo: { ...DEFAULT_SEO, title: `Company — ${globalData.site.name}`, description: co.description || "" },
    sections: [
      headingSection(co.eyebrow || "Company", co.title || "About Us", co.description || ""),
      ...(co.paragraphs || []).map((para) => ({
        id: createSectionId(),
        type: "text",
        hidden: false,
        settings: { padding: { top: "20px", right: "0", bottom: "20px", left: "0" }, background: { type: "color", color: "#000000" } },
        blocks: [{
          id: createBlockId(), type: "text", hidden: false, settings: {},
          content: { eyebrow: "", title: "", content: `<p>${para}</p>`, align: "left" },
        }],
      })),
      ctaSection(co.closingTitle || "", co.closingDescription || "", [
        { label: globalData.navigation.ctaLabel, href: "/contact", style: "primary", newTab: false },
      ]),
    ],
  };
}

function buildContactPage() {
  const contact = contactData.contact;
  return {
    id: createPageId(),
    ...DEFAULT_PAGE,
    title: "Contact",
    slug: "contact",
    status: "published",
    seo: { ...DEFAULT_SEO, title: `Contact — ${globalData.site.name}`, description: contact.description },
    sections: [
      {
        id: createSectionId(),
        type: "contactForm",
        hidden: false,
        settings: { padding: { top: "80px", right: "0", bottom: "80px", left: "0" }, background: { type: "color", color: "#000000" } },
        blocks: [{
          id: createBlockId(),
          type: "contactForm",
          hidden: false,
          settings: {},
          content: {
            formId: "demo-request",
            eyebrow: contact.eyebrow,
            title: contact.title,
            description: contact.description,
          },
        }],
      },
      {
        id: createSectionId(),
        type: "testimonials",
        hidden: false,
        settings: { padding: { top: "0", right: "0", bottom: "80px", left: "0" }, background: { type: "color", color: "#000000" } },
        blocks: [{
          id: createBlockId(),
          type: "testimonials",
          hidden: false,
          settings: {},
          content: {
            eyebrow: "",
            title: contact.sidebarTitle,
            items: [{ quote: contact.quote, author: "Agency Customer", role: "" }],
          },
        }],
      },
    ],
  };
}

function buildResourcesPage() {
  const res = resourcesData.resources || {};
  return {
    id: createPageId(),
    ...DEFAULT_PAGE,
    title: "Resources",
    slug: "resources",
    status: "published",
    seo: { ...DEFAULT_SEO, title: `Resources — ${globalData.site.name}`, description: res.description || "" },
    sections: [
      headingSection(res.eyebrow || "Resources", res.title || "Resources", res.description || ""),
      cardGridSection("", "", "", (res.cards || res.items || []).map((item) => ({
        title: item.title, description: item.copy || item.description, link: item.linkHref || item.href, linkLabel: item.linkLabel || "Learn More",
      })), 3, "#0B1220"),
    ],
  };
}

function buildLegalPage(slug, title, sections) {
  return {
    id: createPageId(),
    ...DEFAULT_PAGE,
    title,
    slug,
    status: "published",
    seo: { ...DEFAULT_SEO, title: `${title} — ${globalData.site.name}`, index: true },
    sections: [{
      id: createSectionId(),
      type: "text",
      hidden: false,
      settings: { padding: { top: "80px", right: "0", bottom: "80px", left: "0" }, background: { type: "color", color: "#000000" } },
      blocks: [{
        id: createBlockId(),
        type: "text",
        hidden: false,
        settings: {},
        content: {
          eyebrow: "",
          title,
          content: sections.map((s) => `<h2>${s.title}</h2><p>${s.body}</p>`).join(""),
          align: "left",
        },
      }],
    }],
  };
}

function buildBranding() {
  return {
    id: DEFAULT_PROGRAM_ID,
    programId: DEFAULT_PROGRAM_ID,
    ...DEFAULT_BRANDING,
    companyName: globalData.site.name,
    tagline: globalData.site.tagline,
    logos: { ...DEFAULT_BRANDING.logos, primary: "/assets/forge-logo.png" },
  };
}

function buildNavigation() {
  return {
    id: DEFAULT_PROGRAM_ID,
    programId: DEFAULT_PROGRAM_ID,
    ...DEFAULT_NAVIGATION,
    mainMenu: globalData.navigation.main.map((item) => ({
      id: createId("nav"),
      label: item.label,
      href: item.href,
      type: "internal",
      newTab: false,
      icon: "",
      children: [],
    })),
    headerButtons: [{
      id: createId("btn"),
      label: globalData.navigation.ctaLabel,
      href: "/contact",
      style: "primary",
      newTab: false,
    }],
  };
}

function buildFooter() {
  const columns = Object.entries(footerData.footerColumns).map(([title, links]) => ({
    id: createId("col"),
    title,
    type: "menu",
    links: links.map((l) => ({ id: createId("link"), label: l.label, href: l.href, newTab: false })),
  }));

  return [{
    id: DEFAULT_PROGRAM_ID,
    programId: DEFAULT_PROGRAM_ID,
    name: "Default Footer",
    logo: "/assets/forge-logo.png",
    blurb: globalData.site.footerBlurb,
    columns,
    copyright: `© ${new Date().getFullYear()} ${globalData.site.name}. All rights reserved.`,
    legalLinks: [
      { id: createId("link"), label: "Privacy Policy", href: "/privacy" },
      { id: createId("link"), label: "Terms of Service", href: "/terms" },
      { id: createId("link"), label: "Security", href: "/security" },
    ],
  }];
}

function buildDemoForm() {
  return [{
    id: "demo-request",
    name: "Demo Request",
    description: "Request a live product demo",
    fields: [
      { id: createId("fld"), type: "text", label: "Full Name", name: "name", required: true, placeholder: "Your name" },
      { id: createId("fld"), type: "email", label: "Email", name: "email", required: true, placeholder: "you@agency.gov" },
      { id: createId("fld"), type: "text", label: "Agency Name", name: "agency", required: true, placeholder: "Your agency" },
      { id: createId("fld"), type: "select", label: "Agency Type", name: "agencyType", required: true, options: ["Fire & Rescue", "EMS", "Emergency Management", "Law Enforcement", "Multi-Discipline"] },
      { id: createId("fld"), type: "select", label: "Products of Interest", name: "products", required: false, options: ["Forge RMS", "Forge Personnel", "Forge Training", "Forge Prevention", "Forge Fleet", "Forge Analytics", "Forge Command", "Full Platform"] },
      { id: createId("fld"), type: "textarea", label: "Message", name: "message", required: false, placeholder: "Tell us about your agency and goals" },
      { id: createId("fld"), type: "consent", label: "I agree to be contacted about Forge products", name: "consent", required: true },
    ],
    settings: {
      multiStep: false,
      captcha: false,
      confirmationMessage: "Thank you! Our team will reach out within one business day.",
      redirectUrl: "",
      notificationEmails: [globalData.site.demoEmail],
      webhookUrl: "",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }];
}

function buildSettings() {
  return {
    id: "default",
    business: {
      name: globalData.site.name,
      tagline: globalData.site.tagline,
      description: globalData.site.footerBlurb,
    },
    contact: {
      demoEmail: globalData.site.demoEmail,
      privacyEmail: globalData.site.privacyEmail,
      securityEmail: globalData.site.securityEmail,
      phone: "",
      address: "",
    },
    social: [],
    hours: [],
    locations: [],
    maintenance: { enabled: false, message: "We are currently performing scheduled maintenance." },
    cookieBanner: { enabled: false, text: "We use cookies to improve your experience.", acceptLabel: "Accept", declineLabel: "Decline" },
    analytics: { googleAnalyticsId: "", googleTagManagerId: "", metaPixelId: "" },
    scripts: { header: "", footer: "" },
    locale: { defaultLanguage: "en", dateFormat: "MM/dd/yyyy", timeFormat: "12h", timezone: "America/New_York" },
    emailSender: { name: globalData.site.name, email: globalData.site.demoEmail, replyTo: globalData.site.demoEmail },
  };
}

function buildEmailTemplates() {
  return [
    {
      id: "form-confirmation",
      name: "Form Confirmation",
      subject: "Thank you for contacting {{site.name}}",
      senderName: globalData.site.name,
      replyTo: globalData.site.demoEmail,
      body: "<p>Hi {{submission.name}},</p><p>Thank you for reaching out. Our team will contact you within one business day.</p>",
      enabled: true,
    },
    {
      id: "form-notification",
      name: "Internal Form Notification",
      subject: "New form submission: {{form.name}}",
      senderName: globalData.site.name,
      replyTo: "{{submission.email}}",
      body: "<p>New submission received from {{submission.name}} ({{submission.email}}).</p>",
      enabled: true,
    },
  ];
}

function buildCollections() {
  return [
    {
      id: "product-modules",
      name: "Product Modules",
      slug: "product-modules",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "subtitle", label: "Subtitle", type: "text" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "liveLink", label: "Live Link", type: "text" },
      ],
      entries: productModulesData.productModules.map((p) => ({ id: p.id, ...p, status: "published" })),
    },
    {
      id: "addon-modules",
      name: "Add-On Modules",
      slug: "addon-modules",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "subtitle", label: "Subtitle", type: "text" },
        { key: "description", label: "Description", type: "textarea" },
      ],
      entries: addonModulesData.addOnModules.map((m, i) => ({ id: `addon-${i}`, ...m, status: "published" })),
    },
  ];
}

function tagProgram(items, programId = DEFAULT_PROGRAM_ID) {
  if (!items) return items;
  if (Array.isArray(items)) return items.map((i) => withProgramId(i, programId));
  return withProgramId(items, programId);
}

function buildStarterPages(program) {
  return [
    {
      id: `page_home_${program.id}`,
      programId: program.id,
      title: "Home",
      slug: "home",
      status: program.status === "active" ? "draft" : "draft",
      layout: "default",
      seo: { title: `${program.name} — Home`, description: program.description },
      sections: [{
        id: createSectionId(),
        type: "hero",
        hidden: false,
        settings: { padding: { top: "96px", right: "0", bottom: "96px", left: "0" }, background: { type: "color", color: program.color || "#0B1220" } },
        blocks: [{
          id: createBlockId(),
          type: "hero",
          hidden: false,
          settings: {},
          content: {
            eyebrow: program.shortName,
            title: program.name.toUpperCase(),
            lead: program.description || "Build your site with the Forge CMS page builder.",
            body: "",
            bullets: [],
            backgroundImage: "",
            buttons: [{ label: "Get Started", href: "/contact", style: "primary", newTab: false }],
          },
        }],
      }],
      createdAt: new Date().toISOString(),
    },
    {
      id: `page_contact_${program.id}`,
      programId: program.id,
      title: "Contact",
      slug: "contact",
      status: "draft",
      layout: "default",
      seo: { title: `Contact — ${program.name}`, description: "" },
      sections: [{
        id: createSectionId(),
        type: "heading",
        hidden: false,
        settings: { padding: { top: "80px", right: "0", bottom: "80px", left: "0" }, background: { type: "color", color: "#000000" } },
        blocks: [{
          id: createBlockId(),
          type: "heading",
          hidden: false,
          settings: {},
          content: { eyebrow: "Contact", title: "Get in Touch", description: "Contact our team to learn more.", align: "center" },
        }],
      }],
      createdAt: new Date().toISOString(),
    },
  ];
}

function buildProgramBundle(program, includeFullMarketing = false) {
  if (includeFullMarketing) {
    return {
      pages: tagProgram([
        buildHomePage(),
        buildProductsPage(),
        buildSolutionsPage(),
        buildCompanyPage(),
        buildContactPage(),
        buildResourcesPage(),
        buildLegalPage("privacy", "Privacy Policy", [
          { title: "Information We Collect", body: "We collect information you provide directly to us." },
          { title: "Contact Us", body: `Contact us at ${globalData.site.privacyEmail}.` },
        ]),
        buildLegalPage("terms", "Terms of Service", [
          { title: "Use of the Platform", body: "Services subject to these terms." },
        ]),
        buildLegalPage("security", "Security", [
          { title: "Platform Security", body: "Encrypted transport and role-based access." },
        ]),
      ], program.id),
      branding: [buildBranding()],
      navigation: [buildNavigation()],
      footers: buildFooter(),
      forms: tagProgram(buildDemoForm(), program.id),
      collections: tagProgram(buildCollections(), program.id),
      settings: [tagProgram(buildSettings(), program.id)],
      emailTemplates: tagProgram(buildEmailTemplates(), program.id),
      redirects: tagProgram([{ id: "pricing-redirect", from: "/pricing", to: "/contact", type: "301", enabled: true }], program.id),
      seoGlobal: [tagProgram({
        id: program.id,
        defaultTitle: globalData.site.name,
        titleTemplate: "{{page.title}} — {{site.name}}",
        defaultDescription: globalData.site.footerBlurb,
        robotsTxt: "User-agent: *\nAllow: /",
        sitemapEnabled: true,
      }, program.id)],
      search: [tagProgram({
        id: program.id,
        enabled: true,
        placeholder: "Search...",
        noResultsMessage: "No results found.",
        excludePages: [],
      }, program.id)],
    };
  }

  return {
    pages: buildStarterPages(program),
    branding: [tagProgram({
      id: program.id,
      programId: program.id,
      ...DEFAULT_BRANDING,
      companyName: program.name,
      tagline: program.description,
      colors: { ...DEFAULT_BRANDING.colors, primary: program.color || DEFAULT_BRANDING.colors.primary },
    }, program.id)],
    navigation: [tagProgram({ id: program.id, programId: program.id, ...DEFAULT_NAVIGATION, mainMenu: [], headerButtons: [] }, program.id)],
    footers: [tagProgram({ id: program.id, programId: program.id, ...DEFAULT_FOOTER, name: `${program.name} Footer`, blurb: program.description, columns: [] }, program.id)],
    forms: [],
    collections: [],
    settings: [tagProgram({ id: program.id, programId: program.id, business: { name: program.name, tagline: program.description }, contact: {}, maintenance: { enabled: false, message: "" } }, program.id)],
    emailTemplates: [],
    redirects: [],
    seoGlobal: [tagProgram({ id: program.id, defaultTitle: program.name, defaultDescription: program.description, sitemapEnabled: true }, program.id)],
    search: [tagProgram({ id: program.id, enabled: true, placeholder: "Search...", noResultsMessage: "No results." }, program.id)],
  };
}

export function buildSeedData() {
  const programs = DEFAULT_PROGRAMS;
  const bundles = programs.map((p) => buildProgramBundle(p, p.id === DEFAULT_PROGRAM_ID));

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

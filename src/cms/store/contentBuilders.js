import { createId, createPageId, createSectionId, createBlockId } from "../core/ids.js";
import {
  DEFAULT_BRANDING,
  DEFAULT_NAVIGATION,
  DEFAULT_FOOTER,
  DEFAULT_SEO,
  DEFAULT_PAGE,
} from "../blocks/registry.js";
import { withProgramId } from "../core/programs.js";

const LEGAL_PAGES = {
  privacy: [
    { title: "Information We Collect", body: "We collect information you provide directly to us, such as when you create an account, request a demo, or contact our support team." },
    { title: "How We Use Your Information", body: "We use the information we collect to provide, maintain, and improve the platform; process transactions; and respond to your comments and questions." },
    { title: "Data Security", body: "Industry-standard encryption (AES-256 at rest, TLS 1.3 in transit) with strictly controlled and audited access to customer data." },
    { title: "Contact Us", body: "Contact us at the privacy email listed in site settings." },
  ],
  terms: [
    { title: "Use of the Platform", body: "Services are provided subject to these terms and any applicable order or agreement with your organization." },
    { title: "Agency Responsibilities", body: "Organizations are responsible for maintaining account credentials and ensuring platform use complies with applicable laws and policies." },
    { title: "Changes", body: "We may update these terms from time to time. Material changes will be communicated to account administrators when possible." },
  ],
  security: [
    { title: "Platform Security", body: "Encrypted transport, role-based access, audit logging, and tenant isolation between platforms." },
    { title: "Operational Practices", body: "Secure development practices, platform monitoring, and restricted administrative access." },
    { title: "Report a concern", body: "Security questions or vulnerability reports can be sent to the security email listed in site settings." },
  ],
};

function disciplineHeroSection(content, data) {
  const global = content.global;
  const lines = content.productLines?.productLines?.lines || data.lines || [];
  return {
    id: createSectionId(),
    type: "disciplineHero",
    hidden: false,
    settings: {
      width: "full",
      height: "auto",
      padding: { top: "0", right: "0", bottom: "0", left: "0" },
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      background: { type: "color", color: "#0B1220" },
    },
    blocks: [{
      id: createBlockId(),
      type: "disciplineHero",
      hidden: false,
      settings: {},
      content: {
        eyebrow: data.eyebrow || data.heroEyebrow || content.productLines?.productLines?.eyebrow || "",
        title: data.title || data.heroTitle || content.productLines?.productLines?.title || "",
        lead: data.lead || data.heroLead || content.productLines?.productLines?.lead || "",
        body: data.body || data.heroBody || content.productLines?.productLines?.body || "",
        bullets: data.bullets || data.heroBullets || [],
        lines,
        buttons: data.buttons || [
          { label: global.navigation?.ctaLabel || "Request Demo", href: "/contact", style: "primary", newTab: false },
          { label: "Learn More", href: "/products", style: "outline", newTab: false },
        ],
      },
    }],
  };
}

function heroSection(content, data, bgImage = "/assets/uploads/hero-three-responders.png") {
  const global = content.global;
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
          { label: global.navigation?.ctaLabel || "Request Demo", href: "/contact", style: "primary", newTab: false },
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

function ctaSection(content, title, description, buttons, note = "", bg = "#0B1220") {
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

function buildHomePage(content, programId) {
  const global = content.global;
  const home = content.home.home;
  const addonModules = content.addonModules?.addOnModules || [];

  return {
    id: createPageId(),
    programId,
    ...DEFAULT_PAGE,
    title: "Home",
    slug: "home",
    status: "published",
    seo: {
      ...DEFAULT_SEO,
      title: `${global.site.name} — ${global.site.tagline}`,
      description: home.heroLead,
    },
    sections: [
      heroSection(content, {
        heroEyebrow: home.heroEyebrow,
        heroTitle: home.heroTitle,
        heroLead: home.heroLead,
        heroBody: home.heroBody,
        heroBullets: home.heroBullets,
      }, content.media?.images?.hero || "/assets/uploads/hero-three-responders.png"),
      cardGridSection(
        home.modulesEyebrow,
        home.modulesTitle,
        home.modulesDescription,
        addonModules.map((m) => ({
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
        productModuleCards(content, { liveLabelMode: "explore" }),
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
            features: (home.whyCards || []).map((c) => ({ title: c.title, description: c.copy })),
            columns: 1,
          },
        }],
      },
      ctaSection(
        content,
        home.closingTitle,
        home.closingDescription,
        [
          { label: global.navigation.ctaLabel, href: "/contact", style: "primary", newTab: false },
          ...(global.site.rmsUrl ? [{ label: "Explore platform", href: global.site.rmsUrl, style: "outline", newTab: true }] : []),
        ],
        global.site.pricingNote
      ),
    ],
  };
}

function productModuleCards(content, { liveLabelMode = "explore" } = {}) {
  const global = content.global;
  const productModules = content.productModules?.productModules || [];
  const explorePrefix = global.ui?.exploreProductPrefix || "Explore";
  const openLiveLabel = global.ui?.openLivePlatformLabel || "Open live platform";
  const ctaLabel = global.navigation?.ctaLabel || "Request Demo";
  return productModules.map((p) => ({
    id: p.id,
    title: p.name,
    subtitle: p.subtitle,
    description: p.description,
    link: p.liveLink ? (global.site.rmsUrl || "/contact") : "/contact",
    linkLabel: p.liveLink
      ? (liveLabelMode === "open" ? openLiveLabel : `${explorePrefix} ${p.name}`)
      : ctaLabel,
  }));
}

function buildProductsPage(content, programId) {
  const global = content.global;
  const page = content.productsPage?.products || {};
  const addonModules = content.addonModules?.addOnModules || [];
  const baseFeatures = content.productsPage?.basePackageFeatures || [];

  return {
    id: createPageId(),
    programId,
    ...DEFAULT_PAGE,
    title: "Products",
    slug: "products",
    status: "published",
    seo: { ...DEFAULT_SEO, title: `Products — ${global.site.name}`, description: page.heroDescription || "" },
    sections: [
      headingSection(page.heroEyebrow || "Products", page.heroTitle || "Products", page.heroDescription || ""),
      ctaSection(content, "", "", [
        { label: global.navigation.ctaLabel, href: "/contact", style: "primary", newTab: false },
        { label: page.heroSecondaryLink || "Talk to our team about your agency", href: "/contact", style: "ghost", newTab: false },
      ], "", "#0B1220"),
      cardGridSection(page.baseEyebrow, page.baseTitle, page.baseDescription, baseFeatures.map((f) => ({ title: f, description: "" })), 2, "#000000"),
      cardGridSection(page.addonsEyebrow, page.addonsTitle, page.addonsDescription, addonModules.map((m) => ({
        title: m.name, subtitle: m.subtitle, description: m.description, badge: "Module",
      })), 3, "#0B1220"),
      cardGridSection("", page.coreTitle || "Core Products", page.coreDescription || "", productModuleCards(content, { liveLabelMode: "open" }), 2, "#000000"),
      ctaSection(content, "Ready to get started?", "", [
        { label: global.ui?.requestDemoLabel || global.navigation.ctaLabel, href: "/contact", style: "primary", newTab: false },
      ]),
    ],
  };
}

function buildSolutionsPage(content, programId) {
  const global = content.global;
  const sol = content.solutions?.solutions || {};
  return {
    id: createPageId(),
    programId,
    ...DEFAULT_PAGE,
    title: "Solutions",
    slug: "solutions",
    status: "published",
    seo: { ...DEFAULT_SEO, title: `Solutions — ${global.site.name}`, description: sol.description || "" },
    sections: [
      heroSection(content, { eyebrow: sol.eyebrow, title: sol.title, lead: sol.description, body: "" }, ""),
      cardGridSection("", "Solutions", "", (sol.items || []).map((item) => ({
        title: item.title, description: item.copy || item.description,
      })), 2, "#000000"),
      ctaSection(content, sol.closingTitle || "", sol.closingDescription || "", [
        { label: global.navigation.ctaLabel, href: "/contact", style: "primary", newTab: false },
      ]),
    ],
  };
}

function buildCompanyPage(content, programId) {
  const global = content.global;
  const co = content.company?.company || {};
  return {
    id: createPageId(),
    programId,
    ...DEFAULT_PAGE,
    title: "Company",
    slug: "company",
    status: "published",
    seo: { ...DEFAULT_SEO, title: `Company — ${global.site.name}`, description: co.description || "" },
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
      ctaSection(content, co.closingTitle || "", co.closingDescription || "", [
        { label: global.navigation.ctaLabel, href: "/contact", style: "primary", newTab: false },
      ]),
    ],
  };
}

function buildContactPage(content, programId) {
  const global = content.global;
  const contact = content.contact?.contact || {
    title: "Contact Us",
    description: "Request a demo or ask a question.",
    email: global.site.demoEmail,
    fields: [],
  };
  return {
    id: createPageId(),
    programId,
    ...DEFAULT_PAGE,
    title: "Contact",
    slug: "contact",
    status: "published",
    seo: { ...DEFAULT_SEO, title: `Contact — ${global.site.name}`, description: contact.description },
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
            items: [{ quote: contact.quote, author: "Customer", role: "" }],
          },
        }],
      },
    ],
  };
}

function buildResourcesPage(content, programId) {
  const global = content.global;
  const res = content.resources?.resources || {};
  return {
    id: createPageId(),
    programId,
    ...DEFAULT_PAGE,
    title: "Resources",
    slug: "resources",
    status: "published",
    seo: { ...DEFAULT_SEO, title: `Resources — ${global.site.name}`, description: res.description || "" },
    sections: [
      headingSection(res.eyebrow || "Resources", res.title || "Resources", res.description || ""),
      cardGridSection("", "", "", (res.cards || res.items || []).map((item) => ({
        title: item.title,
        description: item.copy || item.description,
        link: item.linkHref || item.href,
        linkLabel: item.linkLabel || "Learn More",
      })), 3, "#0B1220"),
    ],
  };
}

function buildLegalPage(content, programId, slug, title, sections) {
  const global = content.global;
  const privacyEmail = global.site.privacyEmail;
  const securityEmail = global.site.securityEmail;
  const resolved = sections.map((s) => ({
    title: s.title,
    body: s.body
      .replace("the privacy email listed in site settings", privacyEmail)
      .replace("the security email listed in site settings", securityEmail),
  }));

  return {
    id: createPageId(),
    programId,
    ...DEFAULT_PAGE,
    title,
    slug,
    status: "published",
    seo: { ...DEFAULT_SEO, title: `${title} — ${global.site.name}`, index: true },
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
          content: resolved.map((s) => `<h2>${s.title}</h2><p>${s.body}</p>`).join(""),
          align: "left",
        },
      }],
    }],
  };
}

function buildBranding(content, program) {
  const global = content.global;
  return {
    id: program.id,
    programId: program.id,
    ...DEFAULT_BRANDING,
    companyName: global.site.name,
    tagline: global.site.tagline,
    logos: { ...DEFAULT_BRANDING.logos, primary: content.media?.images?.logo || "/assets/uploads/forge-logo-hero.png" },
    colors: { ...DEFAULT_BRANDING.colors, primary: program.color || DEFAULT_BRANDING.colors.primary },
  };
}

function buildNavigation(content, program) {
  const global = content.global;
  const main = global.navigation?.main || [];
  return {
    id: program.id,
    programId: program.id,
    ...DEFAULT_NAVIGATION,
    mainMenu: main.map((item) => ({
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
      label: global.navigation?.ctaLabel || "Request Demo",
      href: program.appUrl || "/contact",
      style: "primary",
      newTab: Boolean(program.appUrl),
    }],
  };
}

function buildFooter(content, program) {
  const global = content.global;
  const footerColumns = content.footer?.footerColumns || {};
  const columns = Object.entries(footerColumns).map(([title, links]) => ({
    id: createId("col"),
    title,
    type: "menu",
    links: (links || []).map((l) => ({
      id: createId("link"),
      label: l.label,
      href: l.href,
      newTab: Boolean(l.href?.startsWith("http")),
    })),
  }));

  const legal = content.footer?.footerLegal?.links || [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Security", href: "/security" },
  ];
  const suffix = content.footer?.footerLegal?.copyrightSuffix || "All rights reserved.";

  return [{
    id: program.id,
    programId: program.id,
    name: `${program.name} Footer`,
    logo: content.media?.images?.logo || "/assets/uploads/forge-logo-hero.png",
    blurb: global.site.footerBlurb,
    columns,
    copyright: `© ${new Date().getFullYear()} ${global.site.name}. ${suffix}`,
    legalLinks: legal.map((l) => ({
      id: createId("link"),
      label: l.label,
      href: l.href,
    })),
  }];
}

function buildDemoForm(content, programId) {
  const global = content.global;
  return [{
    id: `demo-request-${programId}`,
    programId,
    name: "Demo Request",
    description: "Request a live product demo",
    fields: [
      { id: createId("fld"), type: "text", label: "Full Name", name: "name", required: true, placeholder: "Your name" },
      { id: createId("fld"), type: "email", label: "Email", name: "email", required: true, placeholder: "you@company.com" },
      { id: createId("fld"), type: "text", label: "Organization", name: "organization", required: true, placeholder: "Your organization" },
      { id: createId("fld"), type: "textarea", label: "Message", name: "message", required: false, placeholder: "Tell us about your goals" },
      { id: createId("fld"), type: "consent", label: "I agree to be contacted", name: "consent", required: true },
    ],
    settings: {
      multiStep: false,
      captcha: false,
      confirmationMessage: "Thank you! Our team will reach out within one business day.",
      redirectUrl: "",
      notificationEmails: [global.site.demoEmail],
      webhookUrl: "",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }];
}

function buildSettings(content, program) {
  const global = content.global;
  return {
    id: program.id,
    programId: program.id,
    business: {
      name: global.site.name,
      tagline: global.site.tagline,
      description: global.site.footerBlurb,
    },
    contact: {
      demoEmail: global.site.demoEmail,
      privacyEmail: global.site.privacyEmail,
      securityEmail: global.site.securityEmail,
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
    emailSender: { name: global.site.name, email: global.site.demoEmail, replyTo: global.site.demoEmail },
  };
}

function buildCollections(content, programId) {
  const productModules = content.productModules?.productModules || [];
  const addonModules = content.addonModules?.addOnModules || [];
  return [
    {
      id: `product-modules-${programId}`,
      programId,
      name: "Product Modules",
      slug: "product-modules",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "subtitle", label: "Subtitle", type: "text" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "liveLink", label: "Live Link", type: "text" },
      ],
      entries: productModules.map((p) => ({ id: p.id, ...p, status: "published" })),
    },
    {
      id: `addon-modules-${programId}`,
      programId,
      name: "Add-On Modules",
      slug: "addon-modules",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "subtitle", label: "Subtitle", type: "text" },
        { key: "description", label: "Description", type: "textarea" },
      ],
      entries: addonModules.map((m, i) => ({ id: `addon-${i}`, ...m, status: "published" })),
    },
  ];
}

function tagProgram(items, programId) {
  if (!items) return items;
  if (Array.isArray(items)) return items.map((i) => withProgramId(i, programId));
  return withProgramId(items, programId);
}

export function buildStarterPages(program) {
  return [
    {
      id: `page_home_${program.id}`,
      programId: program.id,
      title: "Home",
      slug: "home",
      status: "draft",
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

export function buildMarketingBundleFromContent(program, content) {
  const programId = program.id;
  const pages = [
    buildHomePage(content, programId),
    buildProductsPage(content, programId),
    ...(content.solutions ? [buildSolutionsPage(content, programId)] : []),
    buildCompanyPage(content, programId),
    buildContactPage(content, programId),
    buildResourcesPage(content, programId),
    buildLegalPage(content, programId, "privacy", "Privacy Policy", LEGAL_PAGES.privacy),
    buildLegalPage(content, programId, "terms", "Terms of Service", LEGAL_PAGES.terms),
    buildLegalPage(content, programId, "security", "Security", LEGAL_PAGES.security),
  ];

  const forms = buildDemoForm(content, programId);
  pages.forEach((page) => {
    page.sections?.forEach((section) => {
      section.blocks?.forEach((block) => {
        if (block.type === "contactForm" && block.content?.formId === "demo-request") {
          block.content.formId = forms[0].id;
        }
      });
    });
  });

  return {
    pages: tagProgram(pages, programId),
    branding: [buildBranding(content, program)],
    navigation: [buildNavigation(content, program)],
    footers: buildFooter(content, program),
    forms: tagProgram(forms, programId),
    collections: tagProgram(buildCollections(content, programId), programId),
    settings: [buildSettings(content, program)],
    emailTemplates: tagProgram([
      {
        id: `form-confirmation-${programId}`,
        name: "Form Confirmation",
        subject: "Thank you for contacting {{site.name}}",
        senderName: content.global.site.name,
        replyTo: content.global.site.demoEmail,
        body: "<p>Hi {{submission.name}},</p><p>Thank you for reaching out. Our team will contact you within one business day.</p>",
        enabled: true,
      },
      {
        id: `form-notification-${programId}`,
        name: "Internal Form Notification",
        subject: "New form submission: {{form.name}}",
        senderName: content.global.site.name,
        replyTo: "{{submission.email}}",
        body: "<p>New submission received from {{submission.name}} ({{submission.email}}).</p>",
        enabled: true,
      },
    ], programId),
    redirects: tagProgram([{ id: `pricing-redirect-${programId}`, from: "/pricing", to: "/contact", type: "301", enabled: true }], programId),
    seoGlobal: [tagProgram({
      id: programId,
      defaultTitle: content.global.site.name,
      titleTemplate: "{{page.title}} — {{site.name}}",
      defaultDescription: content.global.site.footerBlurb,
      robotsTxt: "User-agent: *\nAllow: /",
      sitemapEnabled: true,
    }, programId)],
    search: [tagProgram({
      id: programId,
      enabled: true,
      placeholder: "Search...",
      noResultsMessage: "No results found.",
      excludePages: [],
    }, programId)],
  };
}

export function buildStarterBundle(program) {
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

export function buildProgramBundle(program, content = null) {
  if (content) return buildMarketingBundleFromContent(program, content);
  return buildStarterBundle(program);
}

export function normalizeLegacyContentJson(json) {
  if (!json || typeof json !== "object") return null;

  const global = json.global || (json.site ? { site: json.site, navigation: json.navigation } : null);
  if (global?.site) {
    return {
      global,
      home: json.home ? { home: json.home.home || json.home } : undefined,
      productsPage: json["products-page"] || json.productsPage,
      productModules: json["product-modules"] || json.productModules,
      addonModules: json["addon-modules"] || json.addonModules,
      solutions: json.solutions,
      company: json.company,
      contact: json.contact,
      resources: json.resources,
      footer: json.footer,
      media: json.media,
    };
  }
  return null;
}

const CONTENT_FILE_MAP = {
  "global.json": "global",
  "home.json": "home",
  "products-page.json": "productsPage",
  "product-modules.json": "productModules",
  "addon-modules.json": "addonModules",
  "solutions.json": "solutions",
  "company.json": "company",
  "contact.json": "contact",
  "resources.json": "resources",
  "footer.json": "footer",
  "media.json": "media",
};

export function parseJsonText(text) {
  const cleaned = String(text).replace(/^\uFEFF/, "").trim();
  if (!cleaned) throw new Error("The file is empty.");
  return JSON.parse(cleaned);
}

export function looksLikeCmsPage(value) {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && typeof value.slug === "string"
    && Array.isArray(value.sections)
  );
}

export function extractPagesFromPayload(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter(looksLikeCmsPage);
  }
  if (looksLikeCmsPage(data)) return [data];
  if (Array.isArray(data.pages)) return data.pages.filter(looksLikeCmsPage);
  if (data.forge_cms_data_v2?.pages) return extractPagesFromPayload(data.forge_cms_data_v2);
  if (data.store?.pages) return extractPagesFromPayload(data.store);
  if (data.data?.pages) return extractPagesFromPayload(data.data);
  return [];
}

export function mergeUploadedContentFiles(fileDataList) {
  const merged = {};
  const collectedPages = [];

  for (const { name, data } of fileDataList) {
    const lower = name.toLowerCase();

    const pagesFromFile = extractPagesFromPayload(data);
    if (pagesFromFile.length) {
      collectedPages.push(...pagesFromFile);
      Object.keys(data).forEach((key) => {
        if (key !== "pages") merged[key] = data[key];
      });
      continue;
    }

    if (Array.isArray(data?.pages) && data.pages.length) {
      collectedPages.push(...data.pages);
      Object.assign(merged, data);
      continue;
    }

    const mappedKey = CONTENT_FILE_MAP[lower];
    if (mappedKey) {
      merged[mappedKey] = data;
      continue;
    }

    if (data?.global?.site || data?.site) {
      Object.assign(merged, data);
      continue;
    }

    if (lower.endsWith(".json")) {
      const stem = lower.replace(/\.json$/, "");
      merged[stem] = data;
    }
  }

  if (collectedPages.length) {
    merged.pages = collectedPages;
  }

  return merged;
}

export function analyzeMergedUpload(merged) {
  const pages = extractPagesFromPayload(merged);
  if (pages.length) {
    return {
      format: "cms-backup",
      pageCount: pages.length,
      pageTitles: pages.map((p) => p.title || p.slug).slice(0, 8),
    };
  }
  if (merged.global?.site || merged.site || merged.home || merged["products-page"]) {
    return { format: "content-copy", pageCount: 9, pageTitles: ["home", "products", "solutions", "company", "contact", "resources", "privacy", "terms", "security"] };
  }
  return { format: "unknown", pageCount: 0, pageTitles: [] };
}

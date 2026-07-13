import { defaultSectionSettings } from "../core/responsive.js";
import { createBlockId, createSectionId } from "../core/ids.js";

const STYLE_FIELDS = [
  { key: "width", label: "Width", type: "text", group: "layout" },
  { key: "height", label: "Height", type: "text", group: "layout" },
  { key: "alignment", label: "Alignment", type: "select", options: ["left", "center", "right"], group: "layout" },
  { key: "padding", label: "Padding", type: "spacing", group: "spacing" },
  { key: "margin", label: "Margin", type: "spacing", group: "spacing" },
  { key: "background", label: "Background", type: "background", group: "style" },
  { key: "overlay", label: "Overlay", type: "overlay", group: "style" },
  { key: "border", label: "Border", type: "border", group: "style" },
  { key: "shadow", label: "Shadow", type: "select", options: ["none", "sm", "md", "lg", "xl"], group: "style" },
  { key: "animation", label: "Animation", type: "select", options: ["none", "fade-in", "slide-up", "slide-down"], group: "style" },
  { key: "customClass", label: "Custom CSS Class", type: "text", group: "advanced" },
  { key: "customId", label: "Custom Element ID", type: "text", group: "advanced" },
  { key: "responsive", label: "Responsive Settings", type: "responsive", group: "responsive" },
];

export const BLOCK_TYPES = {
  hero: {
    label: "Hero Section",
    icon: "Layout",
    category: "sections",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "lead", label: "Lead Text", type: "textarea" },
      { key: "body", label: "Body Text", type: "textarea" },
      { key: "bullets", label: "Bullet Points", type: "list" },
      { key: "backgroundImage", label: "Background Image", type: "media" },
      { key: "imageWidth", label: "Image Width (optional)", type: "text" },
      { key: "imageHeight", label: "Image Height (optional)", type: "text" },
      { key: "buttons", label: "Buttons", type: "buttons" },
    ],
    defaultContent: {
      eyebrow: "Built for public safety",
      title: "Your Headline Here",
      lead: "Lead paragraph text",
      body: "",
      bullets: [],
      backgroundImage: "",
      buttons: [{ label: "Get Started", href: "/contact", style: "primary", newTab: false }],
    },
  },
  disciplineHero: {
    label: "Discipline Hero (3 People)",
    icon: "Users",
    category: "sections",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "lead", label: "Lead Text", type: "textarea" },
      { key: "body", label: "Body Text", type: "textarea" },
      { key: "bullets", label: "Bullet Points", type: "list" },
      { key: "lines", label: "Discipline Lines", type: "disciplineLines" },
      { key: "buttons", label: "Buttons", type: "buttons" },
    ],
    defaultContent: {
      eyebrow: "Built for public safety",
      title: "ONE PLATFORM. EVERY MISSION.",
      lead: "",
      body: "",
      bullets: [],
      lines: [],
      buttons: [{ label: "Request Demo", href: "/contact", style: "primary", newTab: false }],
    },
  },
  text: {
    label: "Text Section",
    icon: "Type",
    category: "content",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "content", label: "Content", type: "richtext", required: true },
      { key: "align", label: "Alignment", type: "select", options: ["left", "center", "right"] },
    ],
    defaultContent: { eyebrow: "", title: "", content: "<p>Enter your text here.</p>", align: "left" },
  },
  image: {
    label: "Image",
    icon: "Image",
    category: "media",
    fields: [
      { key: "src", label: "Image", type: "media", required: true },
      { key: "alt", label: "Alt Text", type: "text", required: true },
      { key: "caption", label: "Caption", type: "text" },
      { key: "imageWidth", label: "Width (optional)", type: "text" },
      { key: "imageHeight", label: "Height (optional)", type: "text" },
      { key: "link", label: "Link URL", type: "link" },
    ],
    defaultContent: { src: "", alt: "", caption: "", link: "", imageWidth: "", imageHeight: "" },
  },
  imageText: {
    label: "Image & Text",
    icon: "Columns",
    category: "content",
    fields: [
      { key: "image", label: "Image", type: "media" },
      { key: "imageAlt", label: "Image Alt Text", type: "text" },
      { key: "imageWidth", label: "Width (optional)", type: "text" },
      { key: "imageHeight", label: "Height (optional)", type: "text" },
      { key: "imagePosition", label: "Image Position", type: "select", options: ["left", "right"] },
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "content", label: "Content", type: "richtext" },
      { key: "buttons", label: "Buttons", type: "buttons" },
    ],
    defaultContent: {
      image: "", imageAlt: "", imagePosition: "left", imageWidth: "", imageHeight: "",
      eyebrow: "", title: "", content: "<p>Content here.</p>", buttons: [],
    },
  },
  video: {
    label: "Video",
    icon: "Video",
    category: "media",
    fields: [
      { key: "url", label: "Video URL", type: "text" },
      { key: "poster", label: "Poster Image", type: "media" },
      { key: "autoplay", label: "Autoplay", type: "boolean" },
      { key: "caption", label: "Caption", type: "text" },
    ],
    defaultContent: { url: "", poster: "", autoplay: false, caption: "" },
  },
  gallery: {
    label: "Gallery",
    icon: "Grid",
    category: "media",
    fields: [
      { key: "images", label: "Images", type: "mediaList" },
      { key: "columns", label: "Columns", type: "number" },
    ],
    defaultContent: { images: [], columns: 3 },
  },
  slideshow: {
    label: "Slideshow",
    icon: "Layers",
    category: "media",
    fields: [
      { key: "slides", label: "Slides", type: "slides" },
      { key: "autoplay", label: "Autoplay", type: "boolean" },
      { key: "interval", label: "Interval (seconds)", type: "number" },
    ],
    defaultContent: { slides: [], autoplay: true, interval: 5 },
  },
  testimonials: {
    label: "Testimonials",
    icon: "Quote",
    category: "social",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "items", label: "Testimonials", type: "testimonials" },
    ],
    defaultContent: { eyebrow: "", title: "", items: [] },
  },
  reviews: {
    label: "Reviews",
    icon: "Star",
    category: "social",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "items", label: "Reviews", type: "reviews" },
    ],
    defaultContent: { title: "", items: [] },
  },
  statistics: {
    label: "Statistics",
    icon: "BarChart",
    category: "content",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "stats", label: "Statistics", type: "stats" },
    ],
    defaultContent: { eyebrow: "", title: "", stats: [] },
  },
  featureGrid: {
    label: "Feature Grid",
    icon: "Grid",
    category: "content",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "features", label: "Features", type: "cards" },
      { key: "columns", label: "Columns", type: "number" },
    ],
    defaultContent: { eyebrow: "", title: "", description: "", features: [], columns: 3 },
  },
  serviceListings: {
    label: "Service Listings",
    icon: "List",
    category: "content",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "services", label: "Services", type: "cards" },
    ],
    defaultContent: { eyebrow: "", title: "", description: "", services: [] },
  },
  pricingTable: {
    label: "Pricing Table",
    icon: "DollarSign",
    category: "content",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "plans", label: "Plans", type: "pricingPlans" },
    ],
    defaultContent: { eyebrow: "", title: "", plans: [] },
  },
  teamMembers: {
    label: "Team Members",
    icon: "Users",
    category: "content",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "members", label: "Members", type: "teamMembers" },
      { key: "collectionId", label: "Or use Collection", type: "collection" },
    ],
    defaultContent: { eyebrow: "", title: "", members: [], collectionId: "" },
  },
  faq: {
    label: "FAQ",
    icon: "HelpCircle",
    category: "content",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "items", label: "FAQ Items", type: "faqItems" },
      { key: "collectionId", label: "Or use Collection", type: "collection" },
    ],
    defaultContent: { eyebrow: "", title: "", items: [], collectionId: "" },
  },
  accordion: {
    label: "Accordion",
    icon: "ChevronDown",
    category: "content",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "items", label: "Items", type: "accordionItems" },
    ],
    defaultContent: { title: "", items: [] },
  },
  tabs: {
    label: "Tabs",
    icon: "Folder",
    category: "content",
    fields: [
      { key: "tabs", label: "Tabs", type: "tabItems" },
    ],
    defaultContent: { tabs: [] },
  },
  contactForm: {
    label: "Contact Form",
    icon: "Mail",
    category: "forms",
    fields: [
      { key: "formId", label: "Form", type: "form", required: true },
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    defaultContent: { formId: "", eyebrow: "", title: "", description: "" },
  },
  quoteForm: {
    label: "Quote Request Form",
    icon: "FileText",
    category: "forms",
    fields: [
      { key: "formId", label: "Form", type: "form", required: true },
      { key: "title", label: "Title", type: "text" },
    ],
    defaultContent: { formId: "", title: "Request a Quote" },
  },
  newsletterForm: {
    label: "Newsletter Form",
    icon: "Send",
    category: "forms",
    fields: [
      { key: "formId", label: "Form", type: "form" },
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "buttonLabel", label: "Button Label", type: "text" },
    ],
    defaultContent: { formId: "", title: "Subscribe", description: "", buttonLabel: "Subscribe" },
  },
  cta: {
    label: "Call to Action",
    icon: "Zap",
    category: "content",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "buttons", label: "Buttons", type: "buttons" },
      { key: "note", label: "Footer Note", type: "text" },
      { key: "align", label: "Alignment", type: "select", options: ["left", "center", "right"] },
    ],
    defaultContent: {
      eyebrow: "", title: "Ready to get started?", description: "",
      buttons: [{ label: "Contact Us", href: "/contact", style: "primary", newTab: false }],
      note: "", align: "center",
    },
  },
  map: {
    label: "Map",
    icon: "MapPin",
    category: "embed",
    fields: [
      { key: "address", label: "Address", type: "text" },
      { key: "embedUrl", label: "Embed URL", type: "text" },
      { key: "height", label: "Height", type: "text" },
    ],
    defaultContent: { address: "", embedUrl: "", height: "400px" },
  },
  calendar: {
    label: "Calendar",
    icon: "Calendar",
    category: "embed",
    fields: [
      { key: "embedUrl", label: "Calendar Embed URL", type: "text" },
      { key: "height", label: "Height", type: "text" },
    ],
    defaultContent: { embedUrl: "", height: "600px" },
  },
  downloads: {
    label: "Downloads",
    icon: "Download",
    category: "content",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "items", label: "Download Items", type: "downloads" },
    ],
    defaultContent: { title: "", items: [] },
  },
  button: {
    label: "Button",
    icon: "MousePointer",
    category: "content",
    fields: [
      { key: "label", label: "Label", type: "text", required: true },
      { key: "href", label: "Link", type: "link", required: true },
      { key: "style", label: "Style", type: "select", options: ["primary", "secondary", "outline", "ghost"] },
      { key: "newTab", label: "Open in New Tab", type: "boolean" },
      { key: "icon", label: "Icon", type: "icon" },
    ],
    defaultContent: { label: "Click Here", href: "/", style: "primary", newTab: false, icon: "" },
  },
  divider: {
    label: "Divider",
    icon: "Minus",
    category: "layout",
    fields: [
      { key: "style", label: "Style", type: "select", options: ["solid", "dashed", "dotted"] },
      { key: "color", label: "Color", type: "color" },
      { key: "width", label: "Width", type: "text" },
    ],
    defaultContent: { style: "solid", color: "#1E293B", width: "100%" },
  },
  spacer: {
    label: "Spacer",
    icon: "Maximize",
    category: "layout",
    fields: [
      { key: "height", label: "Height", type: "text" },
    ],
    defaultContent: { height: "48px" },
  },
  customHtml: {
    label: "Custom HTML",
    icon: "Code",
    category: "advanced",
    fields: [
      { key: "html", label: "HTML Content", type: "code" },
    ],
    defaultContent: { html: "" },
  },
  embed: {
    label: "Embedded Content",
    icon: "ExternalLink",
    category: "embed",
    fields: [
      { key: "url", label: "Embed URL", type: "text" },
      { key: "height", label: "Height", type: "text" },
    ],
    defaultContent: { url: "", height: "400px" },
  },
  collectionGrid: {
    label: "Collection Grid",
    icon: "Database",
    category: "dynamic",
    fields: [
      { key: "collectionId", label: "Collection", type: "collection", required: true },
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "columns", label: "Columns", type: "number" },
      { key: "template", label: "Card Template", type: "select", options: ["default", "compact", "detailed"] },
    ],
    defaultContent: { collectionId: "", eyebrow: "", title: "", description: "", columns: 3, template: "default" },
  },
  cardGrid: {
    label: "Card Grid",
    icon: "LayoutGrid",
    category: "content",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "cards", label: "Cards", type: "cards" },
      { key: "columns", label: "Columns", type: "number" },
    ],
    defaultContent: { eyebrow: "", title: "", description: "", cards: [], columns: 3 },
  },
  heading: {
    label: "Heading Block",
    icon: "Heading",
    category: "content",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "align", label: "Alignment", type: "select", options: ["left", "center", "right"] },
    ],
    defaultContent: { eyebrow: "", title: "Section Title", description: "", align: "left" },
  },
};

export const STYLE_FIELD_DEFS = STYLE_FIELDS;

export function getBlockDef(type) {
  return BLOCK_TYPES[type] || null;
}

export function getAllBlockTypes() {
  return Object.entries(BLOCK_TYPES).map(([type, def]) => ({ type, ...def }));
}

export function getBlocksByCategory() {
  const categories = {};
  getAllBlockTypes().forEach((block) => {
    const cat = block.category || "other";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(block);
  });
  return categories;
}

export function createBlock(type, contentOverrides = {}) {
  const def = getBlockDef(type);
  if (!def) throw new Error(`Unknown block type: ${type}`);
  return {
    id: createBlockId(),
    type,
    content: { ...def.defaultContent, ...contentOverrides },
    settings: defaultSectionSettings({ padding: { top: "0", right: "0", bottom: "0", left: "0" } }),
    hidden: false,
  };
}

export function createSection(type, blocks = [], settingsOverrides = {}) {
  return {
    id: createSectionId(),
    type,
    hidden: false,
    settings: defaultSectionSettings(settingsOverrides),
    blocks: blocks.length ? blocks : [createBlock(type === "hero" ? "hero" : "heading")],
  };
}

export const DEFAULT_SEO = {
  title: "",
  description: "",
  canonicalUrl: "",
  socialTitle: "",
  socialDescription: "",
  socialImage: "",
  index: true,
  follow: true,
  structuredData: "",
  sitemap: true,
  ogType: "website",
  twitterCard: "summary_large_image",
};

export const DEFAULT_PAGE = {
  title: "New Page",
  slug: "new-page",
  status: "draft",
  scheduledAt: null,
  layout: "default",
  headerId: "default",
  footerId: "default",
  seo: { ...DEFAULT_SEO },
  sections: [],
  locale: "en",
  translations: {},
};

export const DEFAULT_BRANDING = {
  companyName: "Forge Public Safety",
  tagline: "One Platform. Every Mission.",
  logos: {
    primary: "/assets/forge-logo.png",
    alternate: "",
    dark: "",
    light: "",
  },
  favicon: "/favicon.ico",
  appIcon: "",
  colors: {
    primary: "#F97316",
    secondary: "#0B1220",
    accent: "#F97316",
    background: "#000000",
    backgroundAlt: "#0B1220",
    text: "#FFFFFF",
    textMuted: "#94A3B8",
    link: "#F97316",
    button: "#F97316",
    buttonText: "#FFFFFF",
    border: "#1E293B",
  },
  fonts: {
    heading: "system-ui, sans-serif",
    body: "system-ui, sans-serif",
    button: "system-ui, sans-serif",
    headingSize: "2.5rem",
    bodySize: "1rem",
    buttonSize: "0.875rem",
    headingWeight: "900",
    bodyWeight: "400",
    lineHeight: "1.6",
  },
  styles: {
    borderRadius: "9999px",
    shadow: "0 4px 6px rgba(0,0,0,0.1)",
    containerWidth: "1280px",
    spacing: "1rem",
    buttonStyle: "rounded-full",
    formStyle: "rounded-xl",
    cardStyle: "rounded-[32px]",
  },
  customCss: "",
  customJs: "",
};

export const DEFAULT_NAVIGATION = {
  sticky: true,
  transparent: false,
  announcementBar: {
    enabled: false,
    text: "",
    link: "",
    linkLabel: "",
    backgroundColor: "#F97316",
    textColor: "#FFFFFF",
  },
  mainMenu: [],
  mobileMenu: null,
  utilityNav: [],
  headerButtons: [],
  phone: "",
  email: "",
  socialLinks: [],
  loggedInMenu: null,
  loggedOutMenu: null,
};

export const DEFAULT_FOOTER = {
  id: "default",
  name: "Default Footer",
  columns: [],
  logo: "",
  blurb: "",
  copyright: "",
  legalLinks: [],
  backgroundColor: "#000000",
  textColor: "#94A3B8",
  mobileStack: true,
};

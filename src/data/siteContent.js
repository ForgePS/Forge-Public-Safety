export const RMS_APP_URL = "https://rms.forgepublicsafety.com";

export const mainNav = [
  { label: "Solutions", href: "/solutions" },
  { label: "Products", href: "/products" },
  { label: "Resources", href: "/resources" },
  { label: "Company", href: "/company" }
];

export const footerColumns = {
  Solutions: [
    { label: "Fire & Rescue", href: "/solutions" },
    { label: "EMS", href: "/solutions" },
    { label: "Emergency Management", href: "/solutions" },
    { label: "Public Safety", href: "/solutions" }
  ],
  Products: [
    { label: "Forge RMS", href: "/products#forge-rms" },
    { label: "Forge Personnel", href: "/products#personnel" },
    { label: "Forge Training", href: "/products#training" },
    { label: "Forge Prevention", href: "/products#prevention" },
    { label: "Forge Fleet", href: "/products#fleet" },
    { label: "Forge Analytics", href: "/products#analytics" },
    { label: "Forge Command", href: "/products#command" }
  ],
  Resources: [
    { label: "Documentation", href: "/resources" },
    { label: "Support", href: "/contact" }
  ],
  Company: [
    { label: "About Us", href: "/company" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" }
  ]
};

export const productModules = [
  {
    id: "forge-rms",
    name: "Forge RMS",
    subtitle: "Records Management System",
    description:
      "Complete incident and records management. NFIRS-compliant reporting, narrative tools, and seamless data flow from dispatch to documentation.",
    href: RMS_APP_URL
  },
  {
    id: "personnel",
    name: "Forge Personnel",
    subtitle: "Personnel Management",
    description:
      "Scheduling, staffing, certifications, and accountability — all connected. Manage your entire workforce from a single dashboard."
  },
  {
    id: "training",
    name: "Forge Training",
    subtitle: "Training Management",
    description:
      "Training management and compliance tracking. Assign, track, and verify training across your entire department with automated compliance alerts."
  },
  {
    id: "prevention",
    name: "Forge Prevention",
    subtitle: "Fire Prevention",
    description:
      "Inspections and prevention workflows built for modern fire prevention bureaus. Manage inspections, violations, and community risk reduction."
  },
  {
    id: "fleet",
    name: "Forge Fleet",
    subtitle: "Fleet & Asset Management",
    description:
      "Fleet and asset readiness at your fingertips. Track maintenance schedules, apparatus status, and equipment inventory across every station."
  },
  {
    id: "analytics",
    name: "Forge Analytics",
    subtitle: "Operational Intelligence",
    description:
      "Executive dashboards and performance metrics that transform raw operational data into strategic decisions. Real-time KPIs for every level of command."
  },
  {
    id: "command",
    name: "Forge Command",
    subtitle: "Incident Command",
    description:
      "Operational command and incident awareness for every mission. Real-time unit tracking, ICS integration, and situational awareness tools."
  }
];

export const addOnModules = [
  {
    name: "Forge Operations",
    subtitle: "Field Intelligence & Mapping",
    description: "Preplans, hydrants, occupancies, GIS mapping, Knox Box tracking, and target hazards."
  },
  {
    name: "Forge Prevention",
    subtitle: "Fire Prevention & Code Enforcement",
    description: "Mobile inspections, code enforcement, investigations, permits, and business contacts."
  },
  {
    name: "Forge EMS",
    subtitle: "EMS Operations & QA/QI",
    description: "EMS staffing, QA/QI workflows, medication inventory, and unit utilization analytics."
  },
  {
    name: "Forge Command",
    subtitle: "Dashboards, Analytics & ISO",
    description: "Live dashboards, staffing reports, budget analytics, and ISO documentation support."
  },
  {
    name: "Forge Mobile",
    subtitle: "Field-Ready Mobile Tools",
    description: "Tablet inspections, mobile preplans, training sign-offs, and daily truck checks."
  }
];

export const basePackageFeatures = [
  "Personnel, scheduling, certifications, and accountability",
  "Training records, ISO/NFPA compliance mapping, and career development",
  "Automated renewal alerts, digital cert storage, and compliance dashboards",
  "Drag-and-drop shift scheduling with overtime, callback, and union rules",
  "Daily inspection checklists, maintenance scheduling, and out-of-service tracking",
  "Station supply tracking, equipment logs, and automated reorder alerts",
  "NFIRS & NERIS-compliant reporting with CAD integration and offline capture"
];

import { useMemo } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  ClipboardList,
  FileQuestion,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  Megaphone,
  MonitorPlay,
  Rocket,
  ScrollText,
  Settings,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import DashboardLayout from "./DashboardLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSystemSettingsOptional } from "../context/SystemSettingsContext.jsx";
import { filterNavItemsBySettings } from "../lib/moduleAccess.js";
import { isSystemSettingsAdmin } from "../lib/roles.js";

const adminNavBase = [
  { group: "Overview", label: "Dashboard", to: "/admin", end: true, icon: LayoutDashboard },
  { group: "Overview", label: "Announcements", to: "/admin/announcements", icon: Megaphone },

  { group: "People", label: "Students", to: "/admin/students", icon: Users },
  { group: "People", label: "Departments", to: "/admin/departments", icon: Building2, module: "departments" },
  { group: "People", label: "Instructors", to: "/admin/instructors", icon: GraduationCap, module: "instructors" },
  { group: "People", label: "Portal Users", to: "/admin/users", icon: UserCog },

  { group: "Training", label: "Courses", to: "/admin/courses", icon: BookOpen, module: "classes" },
  { group: "Training", label: "Classes & Schedule", to: "/admin/scheduling", icon: Calendar, module: "classes" },
  { group: "Training", label: "Registrations", to: "/admin/registrations", icon: ClipboardList, module: "registration" },

  { group: "Completion", label: "Completion Certificates", to: "/admin/certificates", icon: ScrollText, module: "certificates" },
  { group: "Completion", label: "Certificate Templates", to: "/admin/certificates/templates", icon: FileText, module: "certificates" },
  { group: "Completion", label: "Professional Certifications", to: "/admin/certifications", icon: Award, module: "certifications" },
  { group: "Completion", label: "Skill Templates", to: "/admin/skills/templates", icon: Sparkles, module: "skills" },

  { group: "Testing", label: "Testing Hub", to: "/admin/testing", icon: FileQuestion, module: "testing" },

  { group: "Campus", label: "Housing", to: "/admin/housing", icon: Home, module: "housing" },

  { group: "Reports", label: "Reports & Analytics", to: "/admin/reports", icon: BarChart3, module: "reports" },
  { group: "Reports", label: "Digital Dashboard", to: "/admin/digital-dashboard", icon: MonitorPlay, module: "digitalDashboard" },

  { group: "System", label: "System Settings", to: "/admin/settings", icon: Settings, settingsOnly: true },
  { group: "System", label: "Pilot Release", to: "/admin/pilot", icon: Rocket, pilotOnly: true },
];

export default function AdminPortalShell() {
  const { user } = useAuth();
  const settingsContext = useSystemSettingsOptional();
  const settings = settingsContext?.settings;

  const navItems = useMemo(() => {
    const base = adminNavBase.filter((item) => {
      if (item.settingsOnly && !isSystemSettingsAdmin(user?.role)) return false;
      return true;
    });
    return settings ? filterNavItemsBySettings(settings, base) : base;
  }, [user?.role, settings]);

  const portalTitle = settings?.organization?.portalTitle ?? "Arkansas Fire Training Academy Dashboard";
  const portalSubtitle = settings?.organization?.portalSubtitle ?? "AFTA Portal";
  const announcement =
    settings?.features?.announcementEnabled && settings?.features?.announcementBanner
      ? settings.features.announcementBanner
      : "";

  return (
    <DashboardLayout
      portalLabel={portalSubtitle}
      portalTitle={portalTitle}
      navItems={navItems}
      announcement={announcement}
    />
  );
}

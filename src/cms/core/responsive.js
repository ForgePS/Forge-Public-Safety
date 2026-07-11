import { BREAKPOINTS } from "./constants.js";

export function defaultResponsiveSettings(overrides = {}) {
  const base = {
    visibility: { desktop: true, tablet: true, mobile: true },
    padding: { desktop: "0", tablet: "0", mobile: "0" },
    margin: { desktop: "0", tablet: "0", mobile: "0" },
    fontSize: { desktop: "", tablet: "", mobile: "" },
    alignment: { desktop: "left", tablet: "left", mobile: "left" },
    width: { desktop: "100%", tablet: "100%", mobile: "100%" },
    order: { desktop: 0, tablet: 0, mobile: 0 },
  };
  return { ...base, ...overrides };
}

export function defaultSectionSettings(overrides = {}) {
  return {
    width: "full",
    height: "auto",
    alignment: "center",
    padding: { top: "80px", right: "0", bottom: "80px", left: "0" },
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    background: { type: "color", color: "#000000", image: "", overlay: "", position: "center", size: "cover" },
    overlay: { enabled: false, color: "rgba(0,0,0,0.5)", opacity: 0.5 },
    border: { width: "0", style: "solid", color: "transparent", radius: "0" },
    shadow: "none",
    animation: "none",
    customClass: "",
    customId: "",
    responsive: defaultResponsiveSettings(),
    ...overrides,
  };
}

export function getResponsiveValue(settings, field, breakpoint = "desktop") {
  const responsive = settings?.responsive?.[field];
  if (responsive && typeof responsive === "object") {
    return responsive[breakpoint] ?? responsive.desktop ?? "";
  }
  return settings?.[field] ?? "";
}

export function visibilityClass(settings, breakpoint = "desktop") {
  const visible = settings?.responsive?.visibility?.[breakpoint];
  if (visible === false) return "cms-hidden";
  return "";
}

export function sectionStyle(settings) {
  const bg = settings.background || {};
  const style = {
    paddingTop: settings.padding?.top,
    paddingRight: settings.padding?.right,
    paddingBottom: settings.padding?.bottom,
    paddingLeft: settings.padding?.left,
    marginTop: settings.margin?.top,
    marginRight: settings.margin?.right,
    marginBottom: settings.margin?.bottom,
    marginLeft: settings.margin?.left,
    borderWidth: settings.border?.width,
    borderStyle: settings.border?.style,
    borderColor: settings.border?.color,
    borderRadius: settings.border?.radius,
    boxShadow: settings.shadow !== "none" ? settings.shadow : undefined,
  };

  if (bg.type === "color" && bg.color) {
    style.backgroundColor = bg.color;
  }
  if (bg.type === "image" && bg.image) {
    style.backgroundImage = `url(${bg.image})`;
    style.backgroundSize = bg.size || "cover";
    style.backgroundPosition = bg.position || "center";
  }

  return style;
}

export function mergeBreakpointStyles(settings, breakpoint) {
  const responsive = settings?.responsive || {};
  return BREAKPOINTS.includes(breakpoint)
    ? {
        padding: getResponsiveValue(settings, "padding", breakpoint),
        margin: getResponsiveValue(settings, "margin", breakpoint),
        fontSize: getResponsiveValue(settings, "fontSize", breakpoint),
        textAlign: getResponsiveValue(settings, "alignment", breakpoint),
        width: getResponsiveValue(settings, "width", breakpoint),
        order: getResponsiveValue(settings, "order", breakpoint),
      }
    : {};
}

import { useLocation } from "react-router-dom";

const FULL_BLEED_PATHS = [
  /^\/admin\/pages\/[^/]+$/,
  "/admin/branding",
  "/admin/navigation",
  "/admin/footer",
];

export function isFullBleedAdminRoute(pathname) {
  return FULL_BLEED_PATHS.some((p) => (typeof p === "string" ? pathname === p : p.test(pathname)));
}

export default function AdminSplitLayout({ editor, preview, previewWidth = "50%", editorWidth }) {
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="overflow-y-auto min-w-0 min-h-0" style={{ width: editorWidth || `calc(100% - ${previewWidth})`, flex: editorWidth ? undefined : "1 1 0" }}>
        {editor}
      </div>
      <div className="shrink-0 border-l border-[#1E293B] min-h-0 overflow-hidden flex flex-col" style={{ width: previewWidth, minWidth: "360px" }}>
        {preview}
      </div>
    </div>
  );
}

export function useAdminSplitScreen() {
  const { pathname } = useLocation();
  return isFullBleedAdminRoute(pathname);
}

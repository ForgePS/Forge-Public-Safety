export default function AdminSplitLayout({ editor, preview, previewWidth = "45%" }) {
  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      <div className="flex-1 overflow-y-auto min-w-0">
        {editor}
      </div>
      <div className="shrink-0 border-l border-[#1E293B]" style={{ width: previewWidth, minWidth: "320px" }}>
        {preview}
      </div>
    </div>
  );
}

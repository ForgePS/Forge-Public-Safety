import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ImagePlus, Replace } from "lucide-react";
import { uploadImage, validateImageFile } from "../../cms/store/mediaUpload.js";

const PreviewEditContext = createContext(null);

export function PreviewEditProvider({ children, value }) {
  return <PreviewEditContext.Provider value={value}>{children}</PreviewEditContext.Provider>;
}

export function usePreviewEdit() {
  return useContext(PreviewEditContext);
}

/** Inline text editing for live preview. */
export function EditableText({
  as: Tag = "p",
  value = "",
  fieldKey,
  className = "",
  style,
  multiline = false,
  html = false,
}) {
  const edit = usePreviewEdit();
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !edit) return;
    if (document.activeElement === ref.current) return;
    if (html) {
      if (ref.current.innerHTML !== (value || "")) ref.current.innerHTML = value || "";
    } else {
      const next = value || "";
      if (ref.current.textContent !== next) ref.current.textContent = next;
    }
  }, [value, html, edit]);

  if (!edit) {
    if (html) {
      return <Tag className={className} style={style} dangerouslySetInnerHTML={{ __html: value || "" }} />;
    }
    return <Tag className={className} style={style}>{value}</Tag>;
  }

  const commit = () => {
    if (!ref.current) return;
    const next = html ? ref.current.innerHTML : ref.current.innerText;
    if ((next || "") !== (value || "")) {
      edit.onContentChange(fieldKey, next);
    }
  };

  return (
    <Tag
      ref={ref}
      className={`${className} relative rounded-sm hover:outline hover:outline-1 hover:outline-[#F97316]/60 focus:outline focus:outline-2 focus:outline-[#F97316] focus:outline-offset-2 cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-[#64748B] empty:before:italic`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={`Edit ${fieldKey}…`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          ref.current?.blur();
        }
        if (e.key === "Escape") {
          if (html) ref.current.innerHTML = value || "";
          else ref.current.textContent = value || "";
          ref.current?.blur();
        }
      }}
    />
  );
}

/** Image with resize handle + right-click replace menu (live preview only). */
export function EditableImage({
  src,
  alt = "",
  className = "",
  style,
  fieldKey,
  widthKey = "imageWidth",
  heightKey = "imageHeight",
  width,
  height,
  objectFit = "cover",
}) {
  const edit = usePreviewEdit();
  const fileRef = useRef(null);
  const [menu, setMenu] = useState(null);
  const [resizing, setResizing] = useState(false);
  const [draftSize, setDraftSize] = useState(null);
  const startRef = useRef(null);
  const wrapRef = useRef(null);

  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!menu) return undefined;
    const onDoc = () => closeMenu();
    window.addEventListener("click", onDoc);
    return () => window.removeEventListener("click", onDoc);
  }, [menu, closeMenu]);

  if (!edit || !src) {
    return src ? <img src={src} alt={alt} className={className} style={style} loading="lazy" /> : null;
  }

  const displayWidth = draftSize?.width ?? width;
  const displayHeight = draftSize?.height ?? height;
  const sizeStyle = {
    ...style,
    width: displayWidth ? (typeof displayWidth === "number" ? `${displayWidth}px` : displayWidth) : undefined,
    height: displayHeight ? (typeof displayHeight === "number" ? `${displayHeight}px` : displayHeight) : undefined,
    maxWidth: "100%",
    objectFit,
  };

  const onResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const img = wrapRef.current?.querySelector("img");
    if (!img) return;
    const rect = img.getBoundingClientRect();
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: rect.width,
      h: rect.height,
    };
    setResizing(true);
    setDraftSize({ width: Math.round(rect.width), height: Math.round(rect.height) });

    const onMove = (ev) => {
      if (!startRef.current) return;
      const dx = ev.clientX - startRef.current.x;
      const dy = ev.clientY - startRef.current.y;
      const nextW = Math.max(80, Math.round(startRef.current.w + dx));
      const nextH = Math.max(60, Math.round(startRef.current.h + dy));
      setDraftSize({ width: nextW, height: nextH });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setResizing(false);
      setDraftSize((current) => {
        if (current) {
          if (edit.onContentPatch) {
            edit.onContentPatch({
              [widthKey]: `${current.width}px`,
              [heightKey]: `${current.height}px`,
            });
          } else {
            edit.onContentChange(widthKey, `${current.width}px`);
            edit.onContentChange(heightKey, `${current.height}px`);
          }
        }
        return null;
      });
      startRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const replaceFromFile = async (file) => {
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      edit.onToast?.(err, "error");
      return;
    }
    try {
      edit.onToast?.("Uploading image…");
      const item = await uploadImage(file, { store: edit.store, programId: edit.programId });
      edit.onContentChange(fieldKey, item.url);
      edit.onToast?.("Image replaced");
    } catch (e) {
      edit.onToast?.(e.message || "Upload failed", "error");
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`relative group/editable-img ${resizing ? "select-none" : ""}`}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <img src={src} alt={alt} className={className} style={sizeStyle} loading="lazy" draggable={false} />
      <div className="pointer-events-none absolute inset-0 rounded-inherit ring-0 group-hover/editable-img:ring-2 group-hover/editable-img:ring-[#F97316]/70" />
      <button
        type="button"
        title="Drag to resize"
        className="absolute bottom-1 right-1 z-20 h-4 w-4 cursor-se-resize rounded-sm border border-white/80 bg-[#F97316] shadow opacity-0 group-hover/editable-img:opacity-100"
        onPointerDown={onResizeStart}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          replaceFromFile(file);
        }}
      />
      {menu && (
        <div
          className="fixed z-[300] min-w-[180px] rounded-lg border border-[#1E293B] bg-[#0B1220] py-1 shadow-xl"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-[#F97316]/15"
            onClick={() => {
              closeMenu();
              fileRef.current?.click();
            }}
          >
            <ImagePlus size={14} className="text-[#F97316]" /> Upload replacement
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-[#F97316]/15"
            onClick={() => {
              closeMenu();
              edit.onOpenMediaPicker?.(fieldKey);
            }}
          >
            <Replace size={14} className="text-[#F97316]" /> Choose from library
          </button>
        </div>
      )}
    </div>
  );
}

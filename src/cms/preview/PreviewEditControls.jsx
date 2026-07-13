import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const lastExternal = useRef(value);

  useLayoutEffect(() => {
    if (!ref.current || !edit) return;
    if (document.activeElement === ref.current) return;
    if (lastExternal.current === value && (html ? ref.current.innerHTML : ref.current.textContent) === (value || "")) {
      return;
    }
    lastExternal.current = value;
    if (html) {
      ref.current.innerHTML = value || "";
    } else {
      ref.current.textContent = value || "";
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
      lastExternal.current = next;
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
      data-editable-text={fieldKey}
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

/** Image with resize handle + right-click / toolbar replace (live preview only). */
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
  toolbar = true,
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
    // Defer so the opening contextmenu/click doesn't immediately close the menu.
    const timer = window.setTimeout(() => {
      window.addEventListener("click", closeMenu);
      window.addEventListener("contextmenu", closeMenu);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("contextmenu", closeMenu);
    };
  }, [menu, closeMenu]);

  if (!edit) {
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
    const target = wrapRef.current?.querySelector("img") || wrapRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
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

  const openMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const menuNode = menu ? (
    <div
      className="fixed z-[300] min-w-[180px] rounded-lg border border-[#1E293B] bg-[#0B1220] py-1 shadow-xl"
      style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 100) }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-[#F97316]/15"
        onClick={() => {
          closeMenu();
          fileRef.current?.click();
        }}
      >
        <ImagePlus size={14} className="text-[#F97316]" /> {src ? "Upload replacement" : "Upload image"}
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
  ) : null;

  const fileInput = (
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
  );

  const actions = toolbar ? (
    <div className="absolute left-2 top-2 z-30 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover/editable-img:opacity-100">
      <button
        type="button"
        title="Upload replacement"
        className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-[#0B1220]/90 px-2 py-1 text-[11px] font-semibold text-white shadow hover:bg-[#F97316]"
        onClick={(e) => {
          e.stopPropagation();
          fileRef.current?.click();
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ImagePlus size={12} /> Upload
      </button>
      <button
        type="button"
        title="Choose from library"
        className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-[#0B1220]/90 px-2 py-1 text-[11px] font-semibold text-white shadow hover:bg-[#F97316]"
        onClick={(e) => {
          e.stopPropagation();
          edit.onOpenMediaPicker?.(fieldKey);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Replace size={12} /> Library
      </button>
    </div>
  ) : null;

  if (!src) {
    return (
      <div
        ref={wrapRef}
        className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#F97316]/50 bg-[#111827]/80 px-4 py-8 text-center ${resizing ? "select-none" : ""}`}
        style={sizeStyle}
        data-editable-image={fieldKey}
        onClick={(e) => {
          e.stopPropagation();
          fileRef.current?.click();
        }}
        onContextMenu={openMenu}
      >
        <ImagePlus size={22} className="text-[#F97316]" />
        <p className="text-sm font-medium text-white">Add image</p>
        <p className="text-xs text-[#64748B]">Click to upload · right-click for options</p>
        {fileInput}
        {menuNode}
      </div>
    );
  }

  const fillParent = /\bh-full\b/.test(className || "") || /\bw-full\b/.test(className || "");

  return (
    <div
      ref={wrapRef}
      className={`relative group/editable-img max-w-full ${fillParent ? "block h-full w-full" : "inline-block"} ${resizing ? "select-none" : ""}`}
      data-editable-image={fieldKey}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={openMenu}
    >
      <img src={src} alt={alt} className={className} style={sizeStyle} loading="lazy" draggable={false} />
      <div className="pointer-events-none absolute inset-0 ring-0 group-hover/editable-img:ring-2 group-hover/editable-img:ring-[#F97316]/70" />
      {actions}
      <button
        type="button"
        title="Drag to resize"
        className="absolute bottom-1 right-1 z-30 h-5 w-5 cursor-se-resize rounded-sm border border-white/80 bg-[#F97316] shadow opacity-100 sm:opacity-0 sm:group-hover/editable-img:opacity-100"
        onPointerDown={onResizeStart}
      />
      {fileInput}
      {menuNode}
    </div>
  );
}

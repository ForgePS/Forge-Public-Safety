import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, Plus, GripVertical, Eye, EyeOff, Copy, Trash2, Undo2, Redo2, Save, MousePointerClick,
} from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { getAllBlockTypes, getBlockDef, createBlock, createSection } from "../../cms/blocks/registry.js";
import { createSectionId, createBlockId } from "../../cms/core/ids.js";
import { validatePage, sanitizeSlug, isValidSlug } from "../../cms/core/validation.js";
import LiveSitePreview from "../components/LiveSitePreview.jsx";
import AdminSplitLayout from "../components/AdminSplitLayout.jsx";
import FieldEditor from "../components/FieldEditor.jsx";
import ImageUploadInput from "../components/ImageUploadInput.jsx";
import { AdminButton, AdminInput, AdminSelect, AdminTextarea, Toast } from "../components/AdminPageHeader.jsx";

export default function PageBuilderPage() {
  const { pageId } = useParams();
  const { pages, branding, navigation, footers, forms, collections, store, refresh } = useCms();
  const [page, setPage] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [hoveredSection, setHoveredSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [tab, setTab] = useState("content");
  const dirtyRef = useRef(false);
  const loadedPageIdRef = useRef(null);

  useEffect(() => {
    const p = pages.find((pg) => pg.id === pageId);
    if (!p) {
      setPage(null);
      return;
    }

    const pageChanged = loadedPageIdRef.current !== pageId;
    if (!pageChanged && dirtyRef.current) return;

    const copy = JSON.parse(JSON.stringify(p));
    // Fix legacy bad slugs like products/rms → products-rms before edit/save.
    if (copy.slug && !isValidSlug(copy.slug)) {
      copy.slug = sanitizeSlug(copy.slug) || copy.slug;
    }
    setPage(copy);
    setHistory([copy]);
    setHistoryIndex(0);
    dirtyRef.current = false;
    loadedPageIdRef.current = pageId;
    const firstSection = copy.sections?.[0];
    if (firstSection) {
      setSelectedSection(firstSection.id);
      setSelectedBlock(firstSection.blocks?.[0]?.id);
    }
  }, [pageId, pages]);

  const pushHistory = useCallback((newPage) => {
    setHistory((prev) => {
      const base = prev.slice(0, historyIndex + 1);
      return [...base, JSON.parse(JSON.stringify(newPage))].slice(-50);
    });
    setHistoryIndex((i) => Math.min(i + 1, 49));
  }, [historyIndex]);

  const updatePage = useCallback((updater) => {
    dirtyRef.current = true;
    setPage((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // Defer history so we don't nest setState
      queueMicrotask(() => pushHistory(next));
      return next;
    });
  }, [pushHistory]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setPage(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setPage(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    updatePage((prev) => {
      const oldIndex = prev.sections.findIndex((s) => s.id === active.id);
      const newIndex = prev.sections.findIndex((s) => s.id === over.id);
      return { ...prev, sections: arrayMove(prev.sections, oldIndex, newIndex) };
    });
  };

  const addSection = (blockType) => {
    const section = createSection(blockType, [createBlock(blockType)]);
    updatePage((prev) => ({ ...prev, sections: [...(prev.sections || []), section] }));
    setSelectedSection(section.id);
    setSelectedBlock(section.blocks[0]?.id);
    setShowBlockPicker(false);
    setTab("content");
  };

  const duplicateSection = (sectionId) => {
    updatePage((prev) => {
      const section = prev.sections.find((s) => s.id === sectionId);
      if (!section) return prev;
      const copy = JSON.parse(JSON.stringify(section));
      copy.id = createSectionId();
      copy.blocks = copy.blocks.map((b) => ({ ...b, id: createBlockId() }));
      const idx = prev.sections.findIndex((s) => s.id === sectionId);
      const sections = [...prev.sections];
      sections.splice(idx + 1, 0, copy);
      return { ...prev, sections };
    });
  };

  const toggleSectionHidden = (sectionId) => {
    updatePage((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? { ...s, hidden: !s.hidden } : s),
    }));
  };

  const deleteSection = (sectionId) => {
    if (!confirm("Delete this section?")) return;
    updatePage((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== sectionId) }));
    if (selectedSection === sectionId) {
      setSelectedSection(null);
      setSelectedBlock(null);
    }
  };

  const updateBlockContent = useCallback((sectionId, blockId, key, value) => {
    updatePage((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? {
        ...s,
        blocks: s.blocks.map((b) => b.id === blockId ? { ...b, content: { ...b.content, [key]: value } } : b),
      } : s),
    }));
  }, [updatePage]);

  const updateBlockContentPatch = useCallback((sectionId, blockId, patch) => {
    updatePage((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? {
        ...s,
        blocks: s.blocks.map((b) => b.id === blockId ? { ...b, content: { ...b.content, ...patch } } : b),
      } : s),
    }));
  }, [updatePage]);

  const handleLiveContentChange = useCallback((sectionId, blockId, key, value) => {
    setSelectedSection(sectionId);
    setSelectedBlock(blockId);
    setTab("content");
    updateBlockContent(sectionId, blockId, key, value);
  }, [updateBlockContent]);

  const handleLiveContentPatch = useCallback((sectionId, blockId, patch) => {
    setSelectedSection(sectionId);
    setSelectedBlock(blockId);
    setTab("content");
    updateBlockContentPatch(sectionId, blockId, patch);
  }, [updateBlockContentPatch]);

  const updateSectionSettings = (sectionId, settings) => {
    updatePage((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? { ...s, settings: { ...s.settings, ...settings } } : s),
    }));
  };

  const handleSave = async () => {
    const slug = sanitizeSlug(page.slug) || page.slug;
    const toSave = { ...page, slug };
    const errors = validatePage(toSave);
    if (errors.length) {
      setToast(`Validation errors: ${errors.join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      await store.save("pages", toSave);
      dirtyRef.current = false;
      await refresh();
      setToast(slug !== page.slug ? `Page saved (slug fixed to ${slug})` : "Page saved successfully");
      if (slug !== page.slug) setPage(toSave);
    } catch (err) {
      const msg = err?.message || "Save failed";
      if (err?.code === "STORAGE_QUOTA" || /quota|setitem|storage/i.test(msg)) {
        try {
          const { compactLocalStore } = await import("../../cms/store/localStore.js");
          compactLocalStore();
          await store.save("pages", toSave);
          dirtyRef.current = false;
          await refresh();
          setToast("Storage was full — cleared history and saved. Re-upload large images if any are missing.");
          if (slug !== page.slug) setPage(toSave);
        } catch (retryErr) {
          setToast(retryErr?.message || msg);
        }
      } else {
        setToast(`Error: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!page) return <div className="p-8 text-[#64748B]">Loading page...</div>;

  const selectedSectionData = page.sections?.find((s) => s.id === selectedSection);
  const selectedBlockData = selectedSectionData?.blocks?.find((b) => b.id === selectedBlock);
  const blockDef = selectedBlockData ? getBlockDef(selectedBlockData.type) : null;
  const blockCategories = getAllBlockTypes().reduce((acc, b) => {
    const cat = b.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});

  const liveEditApi = {
    store,
    programId: page.programId,
    onToast: (message) => setToast(message),
    onContentChange: handleLiveContentChange,
    onContentPatch: handleLiveContentPatch,
  };

  const editorPanel = (
    <div className="flex flex-col h-full bg-[#0B1220]">
      <div className="shrink-0 border-b border-[#1E293B] px-4 py-3 flex items-center justify-between bg-[#111827]">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/admin/pages" className="text-[#64748B] hover:text-white shrink-0"><ArrowLeft size={20} /></Link>
          <div className="min-w-0">
            <input
              value={page.title}
              onChange={(e) => updatePage({ ...page, title: e.target.value })}
              className="text-base font-bold text-white bg-transparent border-none focus:outline-none w-full truncate"
            />
            <p className="text-xs text-[#64748B]">/{page.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <AdminButton variant="ghost" onClick={undo} disabled={historyIndex <= 0}><Undo2 size={16} /></AdminButton>
          <AdminButton variant="ghost" onClick={redo} disabled={historyIndex >= history.length - 1}><Redo2 size={16} /></AdminButton>
          <AdminButton onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? "..." : "Save"}</AdminButton>
        </div>
      </div>

      <div className="flex border-b border-[#1E293B] shrink-0">
        {[
          { id: "content", label: "Content" },
          { id: "page", label: "Page" },
          { id: "seo", label: "SEO" },
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider ${tab === id ? "text-[#F97316] border-b-2 border-[#F97316] bg-[#F97316]/5" : "text-[#64748B] hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "content" && (
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Sections</h3>
                <AdminButton onClick={() => setShowBlockPicker(true)}><Plus size={14} /> Add</AdminButton>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={page.sections?.map((s) => s.id) || []} strategy={verticalListSortingStrategy}>
                  {(page.sections || []).map((section) => (
                    <SortableSection
                      key={section.id}
                      section={section}
                      selected={selectedSection === section.id}
                      onSelect={() => { setSelectedSection(section.id); setSelectedBlock(section.blocks?.[0]?.id); }}
                      onDuplicate={() => duplicateSection(section.id)}
                      onToggleHidden={() => toggleSectionHidden(section.id)}
                      onDelete={() => deleteSection(section.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            {selectedBlockData && blockDef ? (
              <div className="rounded-xl border border-[#1E293B] bg-[#111827] p-4">
                <h3 className="text-sm font-bold text-white">{blockDef.label}</h3>
                <p className="text-xs text-[#64748B] mb-4">Changes appear instantly in the preview →</p>
                <div className="space-y-4">
                  {blockDef.fields?.map((field) => (
                    <FieldEditor
                      key={field.key}
                      field={field}
                      value={selectedBlockData.content?.[field.key]}
                      onChange={(v) => updateBlockContent(selectedSection, selectedBlock, field.key, v)}
                      forms={forms}
                      collections={collections}
                    />
                  ))}
                </div>
                {selectedSectionData && (
                  <div className="mt-6 pt-6 border-t border-[#1E293B] space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Section Style</h4>
                    <AdminInput label="Background Color" value={selectedSectionData.settings?.background?.color} onChange={(v) => updateSectionSettings(selectedSection, { background: { ...selectedSectionData.settings?.background, type: "color", color: v } })} />
                    <ImageUploadInput
                      label="Background Image"
                      value={selectedSectionData.settings?.background?.image || ""}
                      onChange={(v) => updateSectionSettings(selectedSection, { background: { ...selectedSectionData.settings?.background, type: v ? "image" : "color", image: v } })}
                      help="Optional full-width background for this section"
                    />
                    <AdminInput label="Padding Top" value={selectedSectionData.settings?.padding?.top} onChange={(v) => updateSectionSettings(selectedSection, { padding: { ...selectedSectionData.settings?.padding, top: v } })} />
                    <AdminInput label="Padding Bottom" value={selectedSectionData.settings?.padding?.bottom} onChange={(v) => updateSectionSettings(selectedSection, { padding: { ...selectedSectionData.settings?.padding, bottom: v } })} />
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#334155] p-8 text-center">
                <MousePointerClick size={32} className="mx-auto text-[#64748B] mb-3" />
                <p className="text-sm text-white font-medium">Select a section to edit</p>
                <p className="text-xs text-[#64748B] mt-1">Click a section on the left or in the live preview</p>
              </div>
            )}
          </div>
        )}

        {tab === "page" && (
          <div className="p-4 space-y-4">
            <AdminInput label="Page Title" value={page.title} onChange={(v) => updatePage({ ...page, title: v })} />
            <AdminInput label="URL Slug" value={page.slug} onChange={(v) => updatePage({ ...page, slug: v })} help="Lowercase letters, numbers, and hyphens only (example: products-rms)" />
            <AdminSelect label="Status" value={page.status} onChange={(v) => updatePage({ ...page, status: v })} options={[
              { value: "draft", label: "Draft" }, { value: "published", label: "Published" }, { value: "scheduled", label: "Scheduled" },
            ]} />
            {page.status === "scheduled" && (
              <AdminInput label="Publish Date" type="datetime-local" value={page.scheduledAt?.slice(0, 16) || ""} onChange={(v) => updatePage({ ...page, scheduledAt: v ? new Date(v).toISOString() : null })} />
            )}
            <AdminSelect label="Layout" value={page.layout} onChange={(v) => updatePage({ ...page, layout: v })} options={[
              { value: "default", label: "Default" }, { value: "full-width", label: "Full Width" }, { value: "boxed", label: "Boxed" }, { value: "landing", label: "Landing Page" },
            ]} />
          </div>
        )}

        {tab === "seo" && (
          <div className="p-4 space-y-4">
            <AdminInput label="SEO Title" value={page.seo?.title} onChange={(v) => updatePage({ ...page, seo: { ...page.seo, title: v } })} />
            <AdminTextarea label="Meta Description" value={page.seo?.description} onChange={(v) => updatePage({ ...page, seo: { ...page.seo, description: v } })} rows={3} />
            <ImageUploadInput label="Social Share Image" value={page.seo?.socialImage} onChange={(v) => updatePage({ ...page, seo: { ...page.seo, socialImage: v } })} help="Shown when this page is shared on social media" />
            <label className="flex items-center gap-2 text-sm text-white">
              <input type="checkbox" checked={page.seo?.index !== false} onChange={(e) => updatePage({ ...page, seo: { ...page.seo, index: e.target.checked } })} /> Allow indexing
            </label>
          </div>
        )}
      </div>
    </div>
  );

  const previewPanel = (
    <LiveSitePreview
      branding={branding}
      navigation={navigation}
      footer={footers?.[0]}
      page={page}
      forms={forms}
      collections={collections}
      highlight={selectedSection || hoveredSection}
      onSectionClick={(id) => {
        setSelectedSection(id);
        setTab("content");
        const section = page.sections?.find((s) => s.id === id);
        setSelectedBlock(section?.blocks?.[0]?.id);
      }}
      onSectionHover={setHoveredSection}
      label="Live View"
      liveEdit={liveEditApi}
    />
  );

  return (
    <div className="h-full min-h-0 flex flex-col">
      <AdminSplitLayout editor={editorPanel} preview={previewPanel} previewWidth="50%" />

      {showBlockPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-white mb-4">Add Section Block</h3>
            {Object.entries(blockCategories).map(([cat, blocks]) => (
              <div key={cat} className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">{cat}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {blocks.map((block) => (
                    <button key={block.type} type="button" onClick={() => addSection(block.type)} className="p-3 rounded-xl border border-[#1E293B] text-left hover:border-[#F97316]/50 transition-colors">
                      <p className="text-sm font-medium text-white">{block.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <AdminButton variant="secondary" onClick={() => setShowBlockPicker(false)} className="mt-4">Cancel</AdminButton>
          </div>
        </div>
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function SortableSection({ section, selected, onSelect, onDuplicate, onToggleHidden, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  const def = getBlockDef(section.blocks?.[0]?.type);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`mb-2 rounded-xl border p-3 cursor-pointer transition-colors ${selected ? "border-[#F97316] bg-[#F97316]/10 ring-1 ring-[#F97316]/30" : "border-[#1E293B] hover:border-[#334155]"}`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <button type="button" {...attributes} {...listeners} className="text-[#64748B] hover:text-white cursor-grab" onClick={(e) => e.stopPropagation()}><GripVertical size={16} /></button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{def?.label || section.type}</p>
          {section.hidden && <p className="text-xs text-yellow-400">Hidden</p>}
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); onToggleHidden(); }} className="p-1 text-[#64748B] hover:text-white">{section.hidden ? <Eye size={14} /> : <EyeOff size={14} />}</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 text-[#64748B] hover:text-white"><Copy size={14} /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

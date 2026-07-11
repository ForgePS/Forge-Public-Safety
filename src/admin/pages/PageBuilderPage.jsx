import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, Plus, GripVertical, Eye, EyeOff, Copy, Trash2, Undo2, Redo2, Monitor, Tablet, Smartphone, Save,
} from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { getAllBlockTypes, getBlockDef, createBlock, createSection, DEFAULT_SEO } from "../../cms/blocks/registry.js";
import { createSectionId, createBlockId } from "../../cms/core/ids.js";
import { validatePage, sanitizeSlug } from "../../cms/core/validation.js";
import { PageRenderer } from "../../cms/renderer/BlockRenderer.jsx";
import FieldEditor from "../components/FieldEditor.jsx";
import AdminPageHeader, { AdminButton, AdminInput, AdminSelect, AdminTextarea, SaveBar, Toast } from "../components/AdminPageHeader.jsx";

export default function PageBuilderPage() {
  const { pageId } = useParams();
  const { pages, branding, forms, collections, store, refresh } = useCms();
  const [page, setPage] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [breakpoint, setBreakpoint] = useState("desktop");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [tab, setTab] = useState("sections");

  useEffect(() => {
    const p = pages.find((pg) => pg.id === pageId);
    if (p) {
      setPage(JSON.parse(JSON.stringify(p)));
      setHistory([JSON.parse(JSON.stringify(p))]);
      setHistoryIndex(0);
    }
  }, [pageId, pages]);

  const pushHistory = useCallback((newPage) => {
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(newPage))].slice(-50));
    setHistoryIndex((i) => Math.min(i + 1, 49));
  }, [historyIndex]);

  const updatePage = useCallback((updater) => {
    setPage((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      pushHistory(next);
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
    setSelectedSection(null);
  };

  const updateBlockContent = (sectionId, blockId, key, value) => {
    updatePage((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? {
        ...s,
        blocks: s.blocks.map((b) => b.id === blockId ? { ...b, content: { ...b.content, [key]: value } } : b),
      } : s),
    }));
  };

  const updateSectionSettings = (sectionId, settings) => {
    updatePage((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? { ...s, settings: { ...s.settings, ...settings } } : s),
    }));
  };

  const handleSave = async () => {
    const errors = validatePage(page);
    if (errors.length) {
      setToast(`Validation errors: ${errors.join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      await store.save("pages", { ...page, slug: sanitizeSlug(page.slug) || page.slug });
      await refresh();
      setToast("Page saved successfully");
    } catch (err) {
      setToast(`Error: ${err.message}`);
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

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-[#1E293B] px-6 py-3 flex items-center justify-between bg-[#0B1220]">
        <div className="flex items-center gap-4">
          <Link to="/admin/pages" className="text-[#64748B] hover:text-white"><ArrowLeft size={20} /></Link>
          <div>
            <input
              value={page.title}
              onChange={(e) => updatePage({ ...page, title: e.target.value })}
              className="text-lg font-bold text-white bg-transparent border-none focus:outline-none"
            />
            <p className="text-xs text-[#64748B]">/{page.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdminButton variant="ghost" onClick={undo} disabled={historyIndex <= 0}><Undo2 size={16} /></AdminButton>
          <AdminButton variant="ghost" onClick={redo} disabled={historyIndex >= history.length - 1}><Redo2 size={16} /></AdminButton>
          <div className="flex rounded-lg border border-[#1E293B] overflow-hidden">
            {[{ id: "desktop", icon: Monitor }, { id: "tablet", icon: Tablet }, { id: "mobile", icon: Smartphone }].map(({ id, icon: Icon }) => (
              <button key={id} onClick={() => setBreakpoint(id)} className={`p-2 ${breakpoint === id ? "bg-[#F97316]/15 text-[#F97316]" : "text-[#64748B] hover:text-white"}`}><Icon size={16} /></button>
            ))}
          </div>
          <AdminButton variant="secondary" onClick={() => setPreviewMode(!previewMode)}><Eye size={16} /> {previewMode ? "Edit" : "Preview"}</AdminButton>
          <AdminButton onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? "Saving..." : "Save"}</AdminButton>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {!previewMode && (
          <aside className="w-72 shrink-0 border-r border-[#1E293B] overflow-y-auto bg-[#0B1220]">
            <div className="flex border-b border-[#1E293B]">
              {["sections", "page", "seo"].map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-xs font-medium uppercase tracking-wider ${tab === t ? "text-[#F97316] border-b-2 border-[#F97316]" : "text-[#64748B]"}`}>{t}</button>
              ))}
            </div>

            {tab === "sections" && (
              <div className="p-4">
                <AdminButton onClick={() => setShowBlockPicker(true)} className="w-full mb-4"><Plus size={16} /> Add Section</AdminButton>
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
            )}

            {tab === "page" && (
              <div className="p-4 space-y-4">
                <AdminInput label="Page Title" value={page.title} onChange={(v) => updatePage({ ...page, title: v })} />
                <AdminInput label="URL Slug" value={page.slug} onChange={(v) => updatePage({ ...page, slug: v })} help="Use 'home' for homepage" />
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
                <AdminInput label="Canonical URL" value={page.seo?.canonicalUrl} onChange={(v) => updatePage({ ...page, seo: { ...page.seo, canonicalUrl: v } })} />
                <AdminInput label="Social Title" value={page.seo?.socialTitle} onChange={(v) => updatePage({ ...page, seo: { ...page.seo, socialTitle: v } })} />
                <AdminTextarea label="Social Description" value={page.seo?.socialDescription} onChange={(v) => updatePage({ ...page, seo: { ...page.seo, socialDescription: v } })} rows={2} />
                <AdminInput label="Social Image URL" value={page.seo?.socialImage} onChange={(v) => updatePage({ ...page, seo: { ...page.seo, socialImage: v } })} />
                <label className="flex items-center gap-2 text-sm text-white">
                  <input type="checkbox" checked={page.seo?.index !== false} onChange={(e) => updatePage({ ...page, seo: { ...page.seo, index: e.target.checked } })} /> Allow indexing
                </label>
                <label className="flex items-center gap-2 text-sm text-white">
                  <input type="checkbox" checked={page.seo?.follow !== false} onChange={(e) => updatePage({ ...page, seo: { ...page.seo, follow: e.target.checked } })} /> Allow following links
                </label>
              </div>
            )}
          </aside>
        )}

        <div className={`flex-1 overflow-y-auto bg-black ${breakpoint === "mobile" ? "max-w-[375px] mx-auto border-x border-[#1E293B]" : breakpoint === "tablet" ? "max-w-[768px] mx-auto border-x border-[#1E293B]" : ""}`}>
          <PageRenderer page={page} branding={branding} forms={forms} collections={collections} />
        </div>

        {!previewMode && selectedBlockData && blockDef && (
          <aside className="w-80 shrink-0 border-l border-[#1E293B] overflow-y-auto bg-[#0B1220] p-4">
            <h3 className="text-sm font-bold text-white mb-1">{blockDef.label}</h3>
            <p className="text-xs text-[#64748B] mb-4">Edit block content and settings</p>
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
              <div className="mt-6 pt-6 border-t border-[#1E293B]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">Section Style</h4>
                <AdminInput label="Background Color" value={selectedSectionData.settings?.background?.color} onChange={(v) => updateSectionSettings(selectedSection, { background: { ...selectedSectionData.settings?.background, type: "color", color: v } })} />
                <AdminInput label="Padding Top" value={selectedSectionData.settings?.padding?.top} onChange={(v) => updateSectionSettings(selectedSection, { padding: { ...selectedSectionData.settings?.padding, top: v } })} className="mt-3" />
                <AdminInput label="Padding Bottom" value={selectedSectionData.settings?.padding?.bottom} onChange={(v) => updateSectionSettings(selectedSection, { padding: { ...selectedSectionData.settings?.padding, bottom: v } })} className="mt-3" />
                <AdminInput label="Custom CSS Class" value={selectedSectionData.settings?.customClass} onChange={(v) => updateSectionSettings(selectedSection, { customClass: v })} className="mt-3" />
              </div>
            )}
          </aside>
        )}
      </div>

      {showBlockPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-white mb-4">Add Section Block</h3>
            {Object.entries(blockCategories).map(([cat, blocks]) => (
              <div key={cat} className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">{cat}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {blocks.map((block) => (
                    <button key={block.type} onClick={() => addSection(block.type)} className="p-3 rounded-xl border border-[#1E293B] text-left hover:border-[#F97316]/50 transition-colors">
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
      className={`mb-2 rounded-xl border p-3 cursor-pointer transition-colors ${selected ? "border-[#F97316] bg-[#F97316]/5" : "border-[#1E293B] hover:border-[#334155]"}`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="text-[#64748B] hover:text-white cursor-grab" onClick={(e) => e.stopPropagation()}><GripVertical size={16} /></button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{def?.label || section.type}</p>
          {section.hidden && <p className="text-xs text-yellow-400">Hidden</p>}
        </div>
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); onToggleHidden(); }} className="p-1 text-[#64748B] hover:text-white">{section.hidden ? <Eye size={14} /> : <EyeOff size={14} />}</button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 text-[#64748B] hover:text-white"><Copy size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

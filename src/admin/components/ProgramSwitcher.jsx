import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe, Check, ExternalLink } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";

export default function ProgramSwitcher() {
  const { programs, programId, program, setProgramId, isAdminMode } = useCms();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isAdminMode) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-[#111827] border border-[#1E293B] hover:border-[#334155] transition-colors text-left"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: program?.color || "#64748B" }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{program?.name || "Select program"}</p>
          <p className="text-[10px] text-[#64748B] truncate">{program?.shortName || "Control center"}</p>
        </div>
        <ChevronDown size={16} className={`text-[#64748B] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-[#1E293B] bg-[#111827] shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1E293B]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Switch program</p>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {programs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setProgramId(p.id); setOpen(false); }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-white/5 transition-colors ${
                  p.id === programId ? "bg-[#F97316]/10" : ""
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || "#64748B" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  <p className="text-[10px] text-[#64748B] truncate">{p.description || p.type}</p>
                </div>
                {p.id === programId && <Check size={14} className="text-[#F97316] shrink-0" />}
              </button>
            ))}
          </div>
          {program?.liveUrl && (
            <a
              href={program.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 border-t border-[#1E293B] text-xs text-[#94A3B8] hover:text-white hover:bg-white/5"
            >
              <ExternalLink size={12} /> Open live site
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function ProgramBadge() {
  const { program, isAdminMode } = useCms();
  if (!isAdminMode || !program) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#1E293B] bg-[#111827] px-3 py-1 text-xs text-[#94A3B8]">
      <Globe size={12} />
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: program.color || "#64748B" }} />
      <span className="text-white font-medium">{program.name}</span>
    </div>
  );
}

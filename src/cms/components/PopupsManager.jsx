import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useCms } from "../context/CmsContext.jsx";
import { useLocation } from "react-router-dom";

export default function PopupsManager() {
  const { popups, settings } = useCms();
  const location = useLocation();
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    const now = new Date();
    const active = (popups || []).filter((popup) => {
      if (!popup.enabled) return false;
      if (popup.startDate && new Date(popup.startDate) > now) return false;
      if (popup.endDate && new Date(popup.endDate) < now) return false;
      if (popup.targetPages?.length > 0 && !popup.targetPages.includes(location.pathname)) return false;
      const dismissed = localStorage.getItem(`popup_dismissed_${popup.id}`);
      if (dismissed && popup.displayFrequency === "once") return false;
      return true;
    });
    setVisible(active.sort((a, b) => (b.priority || 0) - (a.priority || 0)));
  }, [popups, location.pathname]);

  const dismiss = (id, permanent = false) => {
    if (permanent) localStorage.setItem(`popup_dismissed_${id}`, "1");
    setVisible((prev) => prev.filter((p) => p.id !== id));
  };

  const cookieBanner = settings?.cookieBanner;
  const showCookie = cookieBanner?.enabled && !localStorage.getItem("cookie_consent");

  return (
    <>
      {visible.map((popup) => (
        popup.type === "bar" ? (
          <div key={popup.id} className="fixed top-0 left-0 right-0 z-[100] px-4 py-3 flex items-center justify-between gap-4" style={{ backgroundColor: popup.backgroundColor || "#F97316", color: popup.textColor || "#fff" }}>
            <p className="text-sm flex-1">{popup.content}</p>
            {popup.buttonLabel && popup.buttonHref && (
              <a href={popup.buttonHref} className="text-sm font-bold underline shrink-0">{popup.buttonLabel}</a>
            )}
            <button onClick={() => dismiss(popup.id, true)} aria-label="Dismiss" className="shrink-0"><X size={18} /></button>
          </div>
        ) : (
          <div key={popup.id} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <div className="relative max-w-lg w-full rounded-2xl bg-[#111827] border border-[#1E293B] p-8">
              <button onClick={() => dismiss(popup.id, popup.displayFrequency === "once")} className="absolute top-4 right-4 text-[#64748B] hover:text-white" aria-label="Close"><X size={20} /></button>
              {popup.image && <img src={popup.image} alt="" className="w-full rounded-xl mb-4" />}
              <p className="text-white">{popup.content}</p>
              {popup.buttonLabel && popup.buttonHref && (
                <a href={popup.buttonHref} className="inline-block mt-4 rounded-full px-6 py-2 text-sm font-bold text-white bg-[var(--cms-primary,#F97316)]">{popup.buttonLabel}</a>
              )}
            </div>
          </div>
        )
      ))}

      {showCookie && (
        <div className="fixed bottom-0 left-0 right-0 z-[99] bg-[#111827] border-t border-[#1E293B] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#94A3B8]">{cookieBanner.text}</p>
          <div className="flex gap-2">
            <button onClick={() => { localStorage.setItem("cookie_consent", "declined"); setVisible([]); }} className="px-4 py-2 text-sm text-[#94A3B8] border border-[#1E293B] rounded-full">{cookieBanner.declineLabel || "Decline"}</button>
            <button onClick={() => { localStorage.setItem("cookie_consent", "accepted"); }} className="px-4 py-2 text-sm font-bold text-white rounded-full bg-[var(--cms-primary,#F97316)]">{cookieBanner.acceptLabel || "Accept"}</button>
          </div>
        </div>
      )}
    </>
  );
}

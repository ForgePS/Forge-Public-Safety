export default function AdminPageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-white">{title}</h1>
        {description && <p className="text-sm text-[#64748B] mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminButton({ children, onClick, variant = "primary", disabled, type = "button" }) {
  const styles = {
    primary: "bg-[#F97316] hover:bg-[#ea580c] text-white",
    secondary: "bg-[#1E293B] hover:bg-[#334155] text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "text-[#94A3B8] hover:text-white hover:bg-white/5",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${styles[variant]}`}>
      {children}
    </button>
  );
}

export function AdminInput({ label, value, onChange, type = "text", placeholder, help, required, className = "" }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-white mb-1">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>}
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className="w-full rounded-xl bg-[#0B1220] border border-[#1E293B] px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#F97316]" />
      {help && <p className="text-xs text-[#64748B] mt-1">{help}</p>}
    </div>
  );
}

export function AdminTextarea({ label, value, onChange, rows = 4, help }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-white mb-1">{label}</label>}
      <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full rounded-xl bg-[#0B1220] border border-[#1E293B] px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#F97316]" />
      {help && <p className="text-xs text-[#64748B] mt-1">{help}</p>}
    </div>
  );
}

export function AdminSelect({ label, value, onChange, options }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-white mb-1">{label}</label>}
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl bg-[#0B1220] border border-[#1E293B] px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#F97316]">
        {options.map((opt) => <option key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</option>)}
      </select>
    </div>
  );
}

export function AdminCard({ title, children, actions }) {
  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-bold text-white">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function SaveBar({ onSave, saving, saved }) {
  return (
    <div className="sticky bottom-0 bg-[#0B1220]/95 backdrop-blur border-t border-[#1E293B] px-8 py-4 flex items-center justify-between">
      <p className="text-sm text-[#64748B]">{saved ? "All changes saved" : "You have unsaved changes"}</p>
      <AdminButton onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</AdminButton>
    </div>
  );
}

export function Toast({ message, type = "success", onClose }) {
  if (!message) return null;
  const colors = type === "error" ? "bg-red-500/15 border-red-500/30 text-red-300" : "bg-green-500/15 border-green-500/30 text-green-300";
  return (
    <div className={`fixed top-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm ${colors}`}>
      {message}
      {onClose && <button onClick={onClose} className="ml-3 opacity-70 hover:opacity-100">×</button>}
    </div>
  );
}

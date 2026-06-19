/** @param {{ widget: import('../lib/mockDisplayPayload.js').RmsWidget }} props */
export default function RmsWidgetSlide({ widget }) {
  return (
    <div className="flex h-full flex-col bg-[#0f172a] text-white">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#c8102e] px-10 py-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">ForgePS Dashboard</p>
          <h1 className="text-3xl font-bold">{widget.title}</h1>
        </div>
        <img src="/afta-logo.png" alt="" className="h-14 w-14 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      </header>
      <div className="flex flex-1 flex-col justify-center gap-4 px-12 py-8">
        {widget.items.length === 0 ? (
          <p className="text-2xl text-slate-400">No items</p>
        ) : (
          widget.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-8 py-6"
            >
              <p className="text-2xl font-semibold">{item.label}</p>
              {item.detail ? <p className="text-xl text-slate-300">{item.detail}</p> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

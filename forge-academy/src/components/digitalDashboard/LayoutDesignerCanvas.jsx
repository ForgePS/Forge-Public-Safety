import { useEffect, useRef, useState } from "react";
import { CirclePlus, Trash2 } from "lucide-react";
import {
  clampLayoutZone,
  createLayoutZoneId,
  LAYOUT_GRID_COLS,
  LAYOUT_GRID_ROWS,
  layoutZoneRowSpan,
  widgetTypeLabel,
  WIDGET_TYPES,
} from "../../lib/digitalDashboard.js";

/**
 * @param {{
 *   zones: Array<{ id: string, widgetType: string, x: number, y: number, w: number, h: number }>,
 *   onChange: (zones: Array<{ id: string, widgetType: string, x: number, y: number, w: number, h: number }>) => void,
 *   canEdit?: boolean,
 * }} props
 */
export default function LayoutDesignerCanvas({ zones = [], onChange, canEdit = true }) {
  const canvasRef = useRef(null);
  const [selectedId, setSelectedId] = useState(zones[0]?.id || "");
  const dragRef = useRef(null);
  const zonesRef = useRef(zones);

  zonesRef.current = zones;

  useEffect(() => {
    if (selectedId && zones.some((zone) => zone.id === selectedId)) return;
    setSelectedId(zones[0]?.id || "");
  }, [zones, selectedId]);

  const selectedZone = zones.find((zone) => zone.id === selectedId) || null;

  function setZones(nextZones) {
    onChange(nextZones.map((zone) => clampLayoutZone(zone)));
  }

  function patchZone(zoneId, patch) {
    const next = zonesRef.current.map((zone) => (zone.id === zoneId ? clampLayoutZone({ ...zone, ...patch }) : zone));
    zonesRef.current = next;
    onChange(next);
  }

  function addZone() {
    const zone = clampLayoutZone({
      id: createLayoutZoneId(),
      widgetType: "announcements",
      x: 0,
      y: 0,
      w: 4,
      h: 4,
    });
    setZones([...zones, zone]);
    setSelectedId(zone.id);
  }

  function removeZone(zoneId) {
    const next = zones.filter((zone) => zone.id !== zoneId);
    setZones(next);
    setSelectedId(next[0]?.id || "");
  }

  /** @param {number} clientX @param {number} clientY */
  function pointerToGrid(clientX, clientY) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = Math.floor(((clientX - rect.left) / rect.width) * LAYOUT_GRID_COLS);
    const y = Math.floor(((clientY - rect.top) / rect.height) * LAYOUT_GRID_ROWS);
    return {
      x: Math.max(0, Math.min(LAYOUT_GRID_COLS - 1, x)),
      y: Math.max(0, Math.min(LAYOUT_GRID_ROWS - 1, y)),
    };
  }

  /** @param {PointerEvent} event @param {string} zoneId @param {"move"|"resize"} mode */
  function startPointer(event, zoneId, mode) {
    if (!canEdit) return;
    event.preventDefault();
    event.stopPropagation();
    const zone = zones.find((item) => item.id === zoneId);
    if (!zone) return;
    setSelectedId(zoneId);
    dragRef.current = {
      zoneId,
      mode,
      pointerId: event.pointerId,
      origin: { ...zone },
      startCell: pointerToGrid(event.clientX, event.clientY),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  useEffect(() => {
    function onPointerMove(event) {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const cell = pointerToGrid(event.clientX, event.clientY);
      const origin = drag.origin;

      if (drag.mode === "move") {
        const dx = cell.x - drag.startCell.x;
        const dy = cell.y - drag.startCell.y;
        patchZone(drag.zoneId, {
          x: origin.x + dx,
          y: origin.y + dy,
        });
        return;
      }

      const nextW = Math.max(1, cell.x - origin.x + 1);
      const nextRowSpan = Math.max(1, cell.y - origin.y + 1);
      patchZone(drag.zoneId, {
        w: nextW,
        h: nextRowSpan * 2,
      });
    }

    function onPointerUp(event) {
      if (dragRef.current?.pointerId === event.pointerId) {
        dragRef.current = null;
      }
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
          Visual layout canvas · {LAYOUT_GRID_COLS}×{LAYOUT_GRID_ROWS} grid
        </p>
        {canEdit ? (
          <button type="button" className="app-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs" onClick={addZone}>
            <CirclePlus className="h-4 w-4" />
            Add zone
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div
          ref={canvasRef}
          className="relative aspect-video overflow-hidden rounded-[12px] border border-[var(--color-afta-border)] bg-[var(--color-afta-navy)] p-2"
        >
          <div
            className="pointer-events-none absolute inset-2 grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${LAYOUT_GRID_COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${LAYOUT_GRID_ROWS}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: LAYOUT_GRID_COLS * LAYOUT_GRID_ROWS }).map((_, index) => (
              <div key={index} className="rounded border border-white/5 bg-white/[0.02]" />
            ))}
          </div>

          <div
            className="absolute inset-2 grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${LAYOUT_GRID_COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${LAYOUT_GRID_ROWS}, minmax(0, 1fr))`,
            }}
          >
            {zones.map((zone) => {
              const selected = zone.id === selectedId;
              return (
                <div
                  key={zone.id}
                  className={`relative flex min-h-0 flex-col overflow-hidden rounded-[8px] border text-white ${
                    selected ? "border-[var(--color-afta-red)] ring-2 ring-[var(--color-afta-red)]/40" : "border-white/20"
                  } ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
                  style={{
                    gridColumn: `${zone.x + 1} / span ${zone.w}`,
                    gridRow: `${zone.y + 1} / span ${layoutZoneRowSpan(zone.h)}`,
                    background: "linear-gradient(135deg, rgba(200,16,46,0.85), rgba(15,23,42,0.95))",
                  }}
                  onPointerDown={(event) => startPointer(event, zone.id, "move")}
                  onClick={() => setSelectedId(zone.id)}
                >
                  <div className="flex items-center justify-between gap-1 px-2 py-1">
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wide">
                      {widgetTypeLabel(zone.widgetType)}
                    </span>
                    <span className="text-[9px] text-white/60">
                      {zone.w}×{layoutZoneRowSpan(zone.h)}
                    </span>
                  </div>
                  {canEdit ? (
                    <div
                      className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize rounded-tl bg-white/30"
                      onPointerDown={(event) => startPointer(event, zone.id, "resize")}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[12px] border border-[var(--color-afta-border)] bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Selected zone</p>
          {selectedZone ? (
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="app-label">Widget</span>
                <select
                  className="app-input"
                  disabled={!canEdit}
                  value={selectedZone.widgetType}
                  onChange={(event) => patchZone(selectedZone.id, { widgetType: event.target.value })}
                >
                  {WIDGET_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="block">
                  <span className="app-label">X</span>
                  <input
                    type="number"
                    min="0"
                    max={LAYOUT_GRID_COLS - 1}
                    className="app-input"
                    disabled={!canEdit}
                    value={selectedZone.x}
                    onChange={(event) => patchZone(selectedZone.id, { x: Number(event.target.value) || 0 })}
                  />
                </label>
                <label className="block">
                  <span className="app-label">Y</span>
                  <input
                    type="number"
                    min="0"
                    max={LAYOUT_GRID_ROWS - 1}
                    className="app-input"
                    disabled={!canEdit}
                    value={selectedZone.y}
                    onChange={(event) => patchZone(selectedZone.id, { y: Number(event.target.value) || 0 })}
                  />
                </label>
                <label className="block">
                  <span className="app-label">Width</span>
                  <input
                    type="number"
                    min="1"
                    max={LAYOUT_GRID_COLS}
                    className="app-input"
                    disabled={!canEdit}
                    value={selectedZone.w}
                    onChange={(event) => patchZone(selectedZone.id, { w: Number(event.target.value) || 1 })}
                  />
                </label>
                <label className="block">
                  <span className="app-label">Height</span>
                  <input
                    type="number"
                    min="2"
                    max="12"
                    step="2"
                    className="app-input"
                    disabled={!canEdit}
                    value={selectedZone.h}
                    onChange={(event) => patchZone(selectedZone.id, { h: Number(event.target.value) || 2 })}
                  />
                </label>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  className="app-btn-secondary inline-flex w-full items-center justify-center gap-1 px-3 py-1.5 text-xs text-red-600"
                  onClick={() => removeZone(selectedZone.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove zone
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs text-[var(--color-afta-muted)]">Select a zone on the canvas or add a new one.</p>
          )}
        </aside>
      </div>

      <p className="text-[11px] text-[var(--color-afta-subtle)]">
        Drag zones to reposition. Drag the corner handle to resize. Height uses half-row units on the player (height 4 = 2 rows).
      </p>
    </div>
  );
}

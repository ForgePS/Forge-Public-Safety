import { useEffect, useMemo, useState } from "react";
import {
  buildScheduleCardLayout,
  buildSheetDisplayModel,
  googleSheetsWidgetUrl,
} from "../../lib/googleSheetsEmbed.js";
import { fetchPublishedGoogleSheetRows } from "../../lib/googleSheetsPlayer.js";
import { signageCardLabelPx, signageCardValuePx } from "../../lib/displaySignage.js";

const AFTA_RED = "#c8102e";

/**
 * @param {{
 *   url: string,
 *   title?: string,
 *   compact?: boolean,
 * }} props
 */
export default function PublishedSheetSlideView({ url, title = "Schedule", compact = false }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const nextRows = await fetchPublishedGoogleSheetRows(url);
        if (!active) return;
        setRows(nextRows);
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load sheet.");
        setRows(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [url]);

  const model = useMemo(
    () => buildSheetDisplayModel(rows || [], title),
    [rows, title],
  );

  const cardLayout = useMemo(
    () => (model.mode === "schedule" ? buildScheduleCardLayout(model) : null),
    [model],
  );

  if (loading) {
    return (
      <SlideShell title={title} subtitle="Class schedule">
        <div className="flex h-full items-center justify-center text-[22px] font-semibold text-black/50">
          Fetching latest sheet data…
        </div>
      </SlideShell>
    );
  }

  if (error || model.mode === "empty") {
    return (
      <SlideShell title={title} subtitle="Class schedule" lastUpdated={lastUpdated}>
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 border-[#c8102e]/20 bg-white shadow-lg">
          <p className="shrink-0 border-b border-black/10 px-4 py-2 text-[16px] text-black/60">
            Live sheet preview {error ? `(CSV unavailable: ${error})` : ""}
          </p>
          <div className="min-h-0 flex-1 overflow-hidden bg-white">
            <iframe
              title={title}
              src={googleSheetsWidgetUrl(url)}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </SlideShell>
    );
  }

  if (model.mode === "schedule" && cardLayout) {
    return (
      <SlideShell title={model.title} subtitle="Class schedule" lastUpdated={lastUpdated}>
        <ScheduleCardBoard layout={cardLayout} compact={compact} />
      </SlideShell>
    );
  }

  return (
    <SlideShell title={model.title} subtitle="Published sheet" lastUpdated={lastUpdated}>
      <GenericCardBoard model={model} compact={compact} />
    </SlideShell>
  );
}

/**
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   lastUpdated?: Date | null,
 *   children: import("react").ReactNode,
 * }} props
 */
function SlideShell({ title, subtitle, lastUpdated, children }) {
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#f3f4f6] text-black">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(-45deg, ${AFTA_RED}, ${AFTA_RED} 2px, transparent 2px, transparent 14px)`,
        }}
      />

      <header
        className="relative z-10 h-[118px] shrink-0 px-8 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${AFTA_RED} 0%, #8b0a1f 55%, #1a1a1a 100%)` }}
      >
        <div className="flex h-full items-center gap-6">
          <div className="flex w-[360px] items-center gap-3">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-white p-2 shadow-md">
              <img src="/afta-logo.png" alt="Arkansas Fire Training Academy" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 text-white">
              <p className="truncate text-[18px] font-semibold">{dateLabel}</p>
              {subtitle ? (
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-[52px] font-extrabold uppercase leading-none tracking-wide text-white drop-shadow-sm">
              {title}
            </h1>
          </div>

          <div className="w-[280px] shrink-0 text-right text-[16px] text-white">
            <p className="inline-flex items-center justify-end gap-2 font-semibold">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Live sheet connected
            </p>
            {updatedLabel ? <p className="mt-1 text-white/75">Updated {updatedLabel}</p> : null}
          </div>
        </div>
      </header>

      <div className="relative z-10 flex h-[962px] min-h-0 flex-col overflow-hidden p-5">
        {children}
      </div>
    </div>
  );
}

/** @param {{ layout: ReturnType<typeof buildScheduleCardLayout>, compact?: boolean }} props */
function ScheduleCardBoard({ layout }) {
  const { dayColumns } = layout;
  const maxCards = Math.max(...dayColumns.map((column) => column.cards.length), 1);
  const labelPx = signageCardLabelPx(maxCards);
  const valuePx = signageCardValuePx(maxCards);

  return (
    <div className="grid h-full min-h-0 grid-cols-5 gap-4">
      {dayColumns.map((column) => (
        <section
          key={column.key}
          className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-2 shadow-lg ${
            column.isToday
              ? "border-[#c8102e] bg-white ring-2 ring-[#c8102e]/25"
              : "border-black/10 bg-white/95"
          }`}
        >
          <div
            className={`flex h-[72px] shrink-0 flex-col items-center justify-center px-2 ${
              column.isToday ? "bg-[#c8102e]" : "bg-[#1a1a1a]"
            }`}
          >
            <p className="text-[28px] font-extrabold uppercase tracking-wide text-white">
              {column.label}
            </p>
            {column.isToday ? (
              <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-white/90">
                Today
              </p>
            ) : null}
          </div>

          <div
            className="grid min-h-0 flex-1 gap-2 overflow-hidden p-2"
            style={{ gridTemplateRows: `repeat(${Math.max(column.cards.length, 1)}, minmax(0, 1fr))` }}
          >
            {column.cards.map((card) => (
              <ScheduleCard
                key={card.key}
                card={card}
                highlight={column.isToday}
                labelPx={labelPx}
                valuePx={valuePx}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * @param {{
 *   card: { key: string, label: string, value: string, vacant: boolean },
 *   highlight?: boolean,
 *   labelPx: number,
 *   valuePx: number,
 * }} props
 */
function ScheduleCard({ card, highlight = false, labelPx, valuePx }) {
  return (
    <article
      className={`flex h-full min-h-0 items-center justify-between gap-4 overflow-hidden rounded-full border-2 px-5 py-3 ${
        card.vacant
          ? "border-dashed border-[#c8102e]/35 bg-[#fafafa]"
          : highlight
            ? "border-[#c8102e]/40 bg-[#c8102e]/5 shadow-sm"
            : "border-[#c8102e]/20 bg-white shadow-sm"
      }`}
    >
      <p
        className="shrink-0 truncate font-extrabold uppercase tracking-wide"
        style={{ color: AFTA_RED, fontSize: `${labelPx}px`, lineHeight: 1.2 }}
      >
        {card.label}
      </p>
      {card.vacant ? (
        <p
          className="min-w-0 truncate text-right font-extrabold uppercase text-[#c8102e]"
          style={{ fontSize: `${valuePx}px`, lineHeight: 1.2 }}
        >
          OPEN
        </p>
      ) : (
        <p
          className="min-w-0 truncate text-right font-bold leading-tight text-black"
          style={{ fontSize: `${valuePx}px` }}
        >
          {card.value}
        </p>
      )}
    </article>
  );
}

/** @param {{ model: { headers: string[], bodyRows: string[][] }, compact?: boolean }} props */
function GenericCardBoard({ model }) {
  const headers = model.headers.length ? model.headers : model.bodyRows[0] || ["Column 1"];
  const bodyRows = model.headers.length ? model.bodyRows : model.bodyRows.slice(1);
  const maxCards = Math.max(...bodyRows.map(() => headers.length - 1), 1);
  const labelPx = signageCardLabelPx(maxCards);
  const valuePx = signageCardValuePx(maxCards);

  return (
    <div
      className="grid h-full min-h-0 gap-4 overflow-hidden"
      style={{ gridTemplateRows: `repeat(${Math.max(bodyRows.length, 1)}, minmax(0, 1fr))` }}
    >
      {bodyRows.map((row, rowIndex) => (
        <section
          key={`section-${rowIndex}`}
          className="flex min-h-0 flex-col overflow-hidden rounded-2xl border-2 border-black/10 bg-white shadow-lg"
        >
          <div className="flex h-[52px] shrink-0 items-center bg-[#1a1a1a] px-4">
            <p className="truncate text-[20px] font-extrabold uppercase tracking-wide text-white">
              {row[0] || `Row ${rowIndex + 1}`}
            </p>
          </div>
          <div
            className="grid min-h-0 flex-1 gap-2 overflow-hidden p-3"
            style={{ gridTemplateColumns: `repeat(${Math.max(headers.length - 1, 1)}, minmax(0, 1fr))` }}
          >
            {headers.slice(1).map((header, colIndex) => {
              const value = row[colIndex + 1] || "";
              const vacant = !value.trim();
              return (
                <ScheduleCard
                  key={`${rowIndex}-${colIndex}`}
                  labelPx={labelPx}
                  valuePx={valuePx}
                  card={{
                    key: `${rowIndex}-${colIndex}`,
                    label: header || `Column ${colIndex + 2}`,
                    value,
                    vacant,
                  }}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

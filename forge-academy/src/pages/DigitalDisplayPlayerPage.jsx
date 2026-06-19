import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import DiningWeekSlideView from "../components/digitalDashboard/DiningWeekSlideView.jsx";
import DisplaySignageViewport from "../components/digitalDashboard/DisplaySignageViewport.jsx";
import PublishedSheetSlideView from "../components/digitalDashboard/PublishedSheetSlideView.jsx";
import { fetchDigitalDisplayPayload } from "../lib/digitalDashboardPlayer.js";
import { HEARTBEAT_INTERVAL_SECONDS, resolveDiningMenuForPlayer } from "../lib/digitalDashboard.js";
import { resolveMediaEmbedUrl } from "../lib/googleSheetsEmbed.js";

function buildMenusById(diningMenus = []) {
  return Object.fromEntries(
    diningMenus.filter((menu) => menu?.id).map((menu) => [menu.id, menu]),
  );
}

function enrichDisplayPayload(payload) {
  if (!payload) return payload;
  const menusById = buildMenusById(payload.diningMenus || []);
  const displayMenuId = payload.display?.diningMenuId || "";

  function enrichDining({ dining, menuSnapshot, diningMenuId }) {
    return resolveDiningMenuForPlayer({
      dining,
      menuSnapshot,
      diningMenuId: diningMenuId || displayMenuId,
      menusById,
    });
  }

  return {
    ...payload,
    menusById,
    dining: enrichDining({ dining: payload.dining, diningMenuId: displayMenuId }),
    items: (payload.items ?? []).map((item) => {
      if (item.widgetType !== "dining" && item.type !== "dining") return item;
      return {
        ...item,
        dining: enrichDining({
          dining: item.dining,
          menuSnapshot: item.diningMenuSnapshot,
          diningMenuId: item.diningMenuId,
        }),
      };
    }),
    layout: payload.layout
      ? {
          ...payload.layout,
          zones: (payload.layout.zones ?? []).map((zone) =>
            zone.widgetType === "dining"
              ? {
                  ...zone,
                  data: enrichDining({
                    dining: zone.data,
                    menuSnapshot: zone.data?.diningMenuSnapshot,
                    diningMenuId: zone.diningMenuId,
                  }),
                }
              : zone,
          ),
        }
      : payload.layout,
  };
}

function WidgetZone({ zone }) {
  const data = zone.data || {};
  const label = zone.widgetType?.replace(/_/g, " ") || "Widget";

  if (zone.widgetType === "dining" && data) {
    return (
      <div className="h-full min-h-[200px] overflow-hidden">
        <DiningWeekSlideView dining={data} title="Dining Services" />
      </div>
    );
  }

  if (zone.widgetType === "clock" && data.time) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#0f172a] p-4 text-white">
        <p className="text-4xl font-bold">{data.time}</p>
        <p className="mt-2 text-sm text-slate-300">{data.date}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center bg-[#1e293b] p-4 text-white">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-100">{data.summary || "Live widget"}</p>
    </div>
  );
}

function LayoutBoard({ layout }) {
  if (!layout?.zones?.length) return null;

  return (
    <div
      className="grid h-full gap-2 bg-black p-2"
      style={{
        gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
        gridTemplateRows: "repeat(6, minmax(0, 1fr))",
      }}
    >
      {layout.zones.map((zone) => (
        <div
          key={zone.id}
          className="overflow-hidden rounded-lg border border-white/10"
          style={{
            gridColumn: `${(zone.x || 0) + 1} / span ${Math.min(12, zone.w || 4)}`,
            gridRow: `${(zone.y || 0) + 1} / span ${Math.max(1, Math.round((zone.h || 4) / 2))}`,
          }}
        >
          <WidgetZone zone={zone} />
        </div>
      ))}
    </div>
  );
}

function SlideContent({ item, dining, menusById = {} }) {
  if (!item) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-2xl text-white/70">
        No content assigned
      </div>
    );
  }

  const sheetUrl = resolveMediaEmbedUrl(item);
  if (sheetUrl) {
    return (
      <div className="h-full w-full overflow-hidden">
        <PublishedSheetSlideView url={sheetUrl} title={item.title || "Class Schedule"} />
      </div>
    );
  }

  if (item.widgetType === "dining" || item.type === "dining") {
    return (
      <div className="h-full w-full overflow-hidden">
        <DiningWeekSlideView
          dining={item.dining || dining}
          menuSnapshot={item.diningMenuSnapshot}
          diningMenuId={item.diningMenuId}
          menusById={menusById}
          title={item.title || "Dining Services"}
        />
      </div>
    );
  }

  if (item.type === "image" && item.url) {
    return <img src={item.url} alt={item.title || "Display slide"} className="h-full w-full object-contain bg-black" />;
  }

  if (item.type === "video" && item.url) {
    return (
      <video key={item.id} src={item.url} className="h-full w-full object-contain bg-black" autoPlay muted playsInline loop />
    );
  }

  if ((item.type === "html" || item.type === "office" || item.type === "pdf" || item.url) && item.url) {
    return (
      <iframe
        title={item.title || "Display content"}
        src={item.url}
        className="h-full w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin"
      />
    );
  }

  const text = item.content || item.title || "Forge Academy";
  const isWeather = item.type === "weather";

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-12 text-center ${
        isWeather ? "text-sky-100" : "text-white"
      }`}
    >
      {item.title ? (
        <p className="mb-6 text-sm font-semibold uppercase tracking-[0.3em] text-white/50">{item.title}</p>
      ) : null}
      <p className={`max-w-5xl whitespace-pre-wrap font-semibold leading-tight ${isWeather ? "text-4xl" : "text-5xl"}`}>
        {text}
      </p>
    </div>
  );
}

function SlideFrame({ children, transition, visible }) {
  const fade = transition === "fade";
  return (
    <div
      className={`h-full w-full overflow-hidden ${fade ? "transition-opacity duration-700 ease-in-out" : ""} ${fade && !visible ? "opacity-0" : "opacity-100"}`}
    >
      {children}
    </div>
  );
}

function EmergencyOverlay({ alert }) {
  if (!alert) return null;
  const scrolling = alert.mode === "scroll";

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-red-700 text-white">
      <div className="border-b border-red-500 px-6 py-4">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-100">Emergency Alert</p>
        <h1 className="mt-2 text-3xl font-bold">{alert.title}</h1>
      </div>
      <div className={`flex flex-1 items-center px-6 ${scrolling ? "overflow-hidden" : "justify-center text-center"}`}>
        {scrolling ? (
          <p className="animate-pulse whitespace-nowrap text-2xl font-semibold">{alert.message}</p>
        ) : (
          <p className="max-w-5xl text-3xl font-semibold leading-tight">{alert.message}</p>
        )}
      </div>
    </div>
  );
}

export default function DigitalDisplayPlayerPage() {
  const { displayId = "", publicKey = "" } = useParams();
  const [searchParams] = useSearchParams();
  const virtualSession = searchParams.get("virtual") === "1";
  const [payload, setPayload] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slideVisible, setSlideVisible] = useState(true);
  const refreshTimerRef = useRef(null);

  const items = useMemo(() => payload?.items ?? [], [payload]);
  const playlist = payload?.playlist;
  const display = payload?.display;
  const layout = payload?.layout;
  const dining = payload?.dining;
  const menusById = payload?.menusById || {};
  const emergencyAlert = payload?.emergencyAlert;
  const refreshMs = Math.max(
    15000,
    (Number(payload?.playerConfig?.refreshIntervalSeconds) || HEARTBEAT_INTERVAL_SECONDS) * 1000,
  );
  const currentItem = items[slideIndex] ?? null;
  const durationMs = Math.max(3, Number(currentItem?.durationSec) || 10) * 1000;
  const useLayout = Boolean(layout?.zones?.length) && !items.length && !emergencyAlert;
  const transition = playlist?.transition || "fade";

  const loadPayload = useCallback(async () => {
    if (!displayId || !publicKey) {
      setError("Invalid display link.");
      setLoading(false);
      return;
    }

    try {
      const next = await fetchDigitalDisplayPayload(displayId, publicKey, { virtualSession });
      if (next?.remoteCommand === "restart") {
        window.location.reload();
        return;
      }
      setPayload(enrichDisplayPayload(next));
      setError(null);
      if (next?.remoteCommand === "refresh" || next?.remoteCommand === "update_software") {
        setSlideIndex(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load display.");
    } finally {
      setLoading(false);
    }
  }, [displayId, publicKey, virtualSession]);

  useEffect(() => {
    loadPayload();
    if (refreshTimerRef.current) window.clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = window.setInterval(loadPayload, refreshMs);
    return () => {
      if (refreshTimerRef.current) window.clearInterval(refreshTimerRef.current);
    };
  }, [loadPayload, refreshMs]);

  useEffect(() => {
    let wakeLock = null;
    async function keepScreenAwake() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Signage sticks may deny wake lock outside kiosk mode.
      }
    }
    keepScreenAwake();
    return () => {
      wakeLock?.release?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (useLayout || !items.length) return undefined;
    const timer = window.setInterval(() => {
      if (transition === "fade") {
        setSlideVisible(false);
        window.setTimeout(() => {
          setSlideIndex((index) => {
            const next = index + 1;
            if (next >= items.length) return playlist?.loop === false ? index : 0;
            return next;
          });
          setSlideVisible(true);
        }, 350);
        return;
      }
      setSlideIndex((index) => {
        const next = index + 1;
        if (next >= items.length) return playlist?.loop === false ? index : 0;
        return next;
      });
    }, durationMs);
    return () => window.clearInterval(timer);
  }, [useLayout, items.length, durationMs, playlist?.loop, transition]);

  if (loading) {
    return (
      <DisplaySignageViewport>
        <div className="grid h-full w-full place-items-center bg-black text-white">
          <p className="text-lg">Loading display…</p>
        </div>
      </DisplaySignageViewport>
    );
  }

  if (error) {
    return (
      <DisplaySignageViewport>
        <div className="grid h-full w-full place-items-center bg-black px-6 text-center text-white">
          <p className="text-lg text-red-300">{error}</p>
        </div>
      </DisplaySignageViewport>
    );
  }

  return (
    <DisplaySignageViewport>
      <div className="relative h-full w-full overflow-hidden">
        {useLayout ? (
          <LayoutBoard layout={layout} />
        ) : (
          <SlideFrame transition={transition} visible={slideVisible}>
            <div className="h-full w-full overflow-hidden">
              <SlideContent item={currentItem} dining={dining} menusById={menusById} />
            </div>
          </SlideFrame>
        )}
        <EmergencyOverlay alert={emergencyAlert} />
        {!useLayout && items.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-white/60">
            <div className="text-center">
              <p className="text-2xl font-semibold">{display?.name || "Forge Display"}</p>
              <p className="mt-2 text-sm">No playlist content assigned</p>
            </div>
          </div>
        ) : null}
      </div>
    </DisplaySignageViewport>
  );
}

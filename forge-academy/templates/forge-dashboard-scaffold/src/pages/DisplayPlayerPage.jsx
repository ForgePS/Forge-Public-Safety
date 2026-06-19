import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DisplaySignageViewport from "../components/DisplaySignageViewport.jsx";
import RmsWidgetSlide from "../components/RmsWidgetSlide.jsx";
import { fetchDisplayPayload } from "../lib/mockDisplayPayload.js";

const SLIDE_SECONDS = 12;

export default function DisplayPlayerPage() {
  const { displayId, publicKey } = useParams();
  const [payload, setPayload] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    fetchDisplayPayload(displayId, publicKey)
      .then((data) => {
        if (active) setPayload(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load display.");
      });
    return () => {
      active = false;
    };
  }, [displayId, publicKey]);

  useEffect(() => {
    if (!payload?.widgets?.length) return;
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % payload.widgets.length);
    }, SLIDE_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [payload]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center p-8 text-center">
        <p className="text-red-700">{error}</p>
        <Link to="/" className="mt-4 text-sm font-semibold text-[#c8102e]">
          Back to admin
        </Link>
      </div>
    );
  }

  if (!payload) {
    return <div className="grid min-h-screen place-items-center bg-black text-white">Loading display…</div>;
  }

  const widget = payload.widgets[slideIndex];

  return (
    <DisplaySignageViewport>
      <div className="relative h-full w-full">
        <RmsWidgetSlide widget={widget} />
        <div className="absolute bottom-4 right-6 rounded-lg bg-black/60 px-4 py-2 text-sm text-white/90">
          {payload.display.departmentLabel} · {payload.display.name} · slide {slideIndex + 1}/{payload.widgets.length}
        </div>
      </div>
    </DisplaySignageViewport>
  );
}

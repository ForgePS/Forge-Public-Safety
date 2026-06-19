import { useEffect, useState } from "react";
import { SIGNAGE_HEIGHT, SIGNAGE_WIDTH } from "../../lib/displaySignage.js";

/**
 * Scales a fixed 1920×1080 signage canvas to fit the browser window without scrollbars.
 * @param {{ children: import("react").ReactNode }} props
 */
export default function DisplaySignageViewport({ children }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      setScale(
        Math.min(window.innerWidth / SIGNAGE_WIDTH, window.innerHeight / SIGNAGE_HEIGHT),
      );
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div
        className="relative overflow-hidden bg-black"
        style={{
          width: SIGNAGE_WIDTH,
          height: SIGNAGE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  CERTIFICATE_LAYOUT_HEIGHT,
  CERTIFICATE_LAYOUT_WIDTH,
} from "../../lib/certificateTemplateFields.js";

/**
 * Renders certificate content at a fixed design size and scales to fit the available width.
 * Keeps field positions and font sizes consistent between template preview, print, and PDF.
 *
 * @param {{ children: import('react').ReactNode, className?: string }} props
 */
export default function CertificateScaledCanvas({ children, className = "" }) {
  const shellRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;

    const updateScale = () => {
      const width = node.clientWidth || CERTIFICATE_LAYOUT_WIDTH;
      setScale(width / CERTIFICATE_LAYOUT_WIDTH);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(node);
    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className={className}
      style={{
        width: "100%",
        maxWidth: `${CERTIFICATE_LAYOUT_WIDTH}px`,
        height: `${CERTIFICATE_LAYOUT_HEIGHT * scale}px`,
      }}
    >
      <div
        className="relative origin-top-left"
        style={{
          width: `${CERTIFICATE_LAYOUT_WIDTH}px`,
          height: `${CERTIFICATE_LAYOUT_HEIGHT}px`,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef } from "react";

/**
 * @param {{
 *   value: string,
 *   editable?: boolean,
 *   onChange?: (value: string) => void,
 *   style?: import('react').CSSProperties,
 *   className?: string,
 *   ariaLabel?: string,
 * }} props
 */
export default function CertificateEditableText({
  value,
  editable = false,
  onChange,
  style,
  className = "",
  ariaLabel,
}) {
  const textareaRef = useRef(null);

  const resize = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (editable) resize();
  }, [editable, value, style, resize]);

  const displayClassName = `whitespace-pre-wrap break-words leading-tight ${className}`.trim();
  const displayStyle = {
    ...style,
    boxSizing: "border-box",
    height: "auto",
    minHeight: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  if (!editable) {
    return (
      <p className={displayClassName} style={displayStyle}>
        {value}
      </p>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      rows={1}
      aria-label={ariaLabel}
      onChange={(event) => {
        onChange?.(event.target.value);
        resize();
      }}
      onInput={resize}
      className={`block w-full resize-none overflow-hidden border border-dashed border-[#c8102e]/50 bg-white/70 px-1 outline-none focus:border-[#c8102e] focus:bg-white/90 print:border-none print:bg-transparent ${displayClassName}`}
      style={{
        ...displayStyle,
        width: "100%",
        fieldSizing: "content",
      }}
    />
  );
}

/**
 * @param {{ status: string, label?: string, className?: string }} props
 */
export default function StatusBadge({ status, label, className = "" }) {
  const normalized = String(status).toLowerCase().replace(/_/g, "-");
  const displayLabel = label ?? status.replace(/_/g, " ");
  return (
    <span className={`status-badge status-badge--${normalized} ${className}`}>
      {displayLabel}
    </span>
  );
}

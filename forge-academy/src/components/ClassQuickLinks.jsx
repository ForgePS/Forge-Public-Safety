import { Link } from "react-router-dom";

/**
 * @param {{ classId: string, showHousing?: boolean, variant?: 'primary' | 'secondary' }} props
 */
export default function ClassQuickLinks({ classId, showHousing = false, variant = "secondary" }) {
  const linkClass =
    variant === "primary"
      ? "rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
      : "app-btn-secondary px-4 py-2 text-xs";

  return (
    <div className="flex flex-wrap gap-2">
      <Link to={`/admin/scheduling/${classId}/roster`} className={linkClass}>
        Roster
      </Link>
      <Link to={`/admin/scheduling/${classId}/skills`} className="app-btn-secondary px-4 py-2 text-xs">
        Skills
      </Link>
      <Link to={`/admin/scheduling/${classId}/tests`} className="app-btn-secondary px-4 py-2 text-xs">
        Tests
      </Link>
      {showHousing ? (
        <Link to={`/admin/housing/${classId}`} className="app-btn-secondary px-4 py-2 text-xs">
          Housing
        </Link>
      ) : null}
      <Link to={`/admin/scheduling/${classId}`} className="app-btn-secondary px-4 py-2 text-xs">
        Edit session
      </Link>
    </div>
  );
}

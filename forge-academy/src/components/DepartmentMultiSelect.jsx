import { useMemo, useState } from "react";
import { Search } from "lucide-react";

/**
 * @param {{
 *   departments: Array<{ id: string, name: string, fdid?: string }>,
 *   value: string[],
 *   onChange: (ids: string[]) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function DepartmentMultiSelect({ departments, value, onChange, disabled = false }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return departments;
    return departments.filter(
      (department) =>
        department.name.toLowerCase().includes(term) ||
        String(department.fdid ?? "").toLowerCase().includes(term),
    );
  }, [departments, search]);

  function toggleDepartment(departmentId) {
    if (disabled) return;
    if (value.includes(departmentId)) {
      onChange(value.filter((id) => id !== departmentId));
      return;
    }
    onChange([...value, departmentId]);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search departments…"
          disabled={disabled}
          className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50 disabled:opacity-60"
        />
      </div>

      {value.length > 0 ? (
        <p className="text-xs text-[var(--color-afta-muted)]">
          {value.length} department{value.length === 1 ? "" : "s"} selected
        </p>
      ) : null}

      <div className="max-h-56 space-y-1 overflow-y-auto rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-sm text-[var(--color-afta-muted)]">No departments match your search.</p>
        ) : (
          filtered.map((department) => {
            const checked = value.includes(department.id);
            return (
              <label
                key={department.id}
                className={`flex cursor-pointer items-start gap-3 rounded-[8px] px-2 py-2 text-sm transition ${
                  checked ? "bg-[#c8102e]/5" : "hover:bg-slate-50"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleDepartment(department.id)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-[var(--color-afta-text)]">{department.name}</span>
                  {department.fdid ? (
                    <span className="block text-xs text-[var(--color-afta-muted)]">FDID {department.fdid}</span>
                  ) : null}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

import {
  createEmptyDigitalDashboardPermissions,
  createFullDigitalDashboardPermissions,
  DIGITAL_DASHBOARD_SECTIONS,
  patchDigitalDashboardPermission,
} from "../../lib/digitalDashboardPermissions.js";

/**
 * @param {{
 *   value: import("../../lib/digitalDashboardPermissions.js").DigitalDashboardPermissionMap,
 *   onChange: (next: import("../../lib/digitalDashboardPermissions.js").DigitalDashboardPermissionMap) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function DigitalDashboardPermissionsEditor({ value, onChange, disabled = false }) {
  function setAll(mode) {
    onChange(mode === "full" ? createFullDigitalDashboardPermissions() : createEmptyDigitalDashboardPermissions());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          className="app-btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
          onClick={() => setAll("full")}
        >
          Grant all sections
        </button>
        <button
          type="button"
          disabled={disabled}
          className="app-btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
          onClick={() => setAll("none")}
        >
          Clear all sections
        </button>
      </div>

      <div className="overflow-x-auto rounded-[12px] border border-[var(--color-afta-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
            <tr>
              <th className="px-4 py-2">Section</th>
              <th className="px-4 py-2 text-center">View</th>
              <th className="px-4 py-2 text-center">Edit</th>
            </tr>
          </thead>
          <tbody>
            {DIGITAL_DASHBOARD_SECTIONS.map((section) => {
              const row = value[section.id] ?? { view: false, edit: false };
              return (
                <tr key={section.id} className="border-t border-[var(--color-afta-border)]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--color-afta-text)]">{section.label}</p>
                    <p className="text-xs text-[var(--color-afta-muted)]">{section.description}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={row.view}
                      onChange={(event) =>
                        onChange(patchDigitalDashboardPermission(value, section.id, "view", event.target.checked))
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {section.supportsEdit ? (
                      <input
                        type="checkbox"
                        disabled={disabled || !row.view}
                        checked={row.edit}
                        onChange={(event) =>
                          onChange(patchDigitalDashboardPermission(value, section.id, "edit", event.target.checked))
                        }
                      />
                    ) : (
                      <span className="text-xs text-[var(--color-afta-subtle)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

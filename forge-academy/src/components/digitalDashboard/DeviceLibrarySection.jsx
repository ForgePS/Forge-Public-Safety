import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CirclePlus,
  Cpu,
  List,
  MonitorPlay,
  MonitorSmartphone,
  MoreVertical,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Siren,
  Trash2,
  Tv,
} from "lucide-react";
import {
  displayTypeLabel,
  formatLastSync,
  PLAYER_SOFTWARE_VERSION,
  summarizeDeviceHealth,
} from "../../lib/digitalDashboard.js";
import DigitalDashboardLibraryShell, {
  LibraryFilterPill,
  LibraryGroupTag,
  LibraryStatusBadge,
} from "./DigitalDashboardLibraryShell.jsx";
import { SignageStickProvisioningGuide } from "./DigitalDashboardShared.jsx";

function deviceAgeLabel(display) {
  const stamp = display.createdAt || display.lastSyncAt;
  if (!stamp) return "—";
  const days = Math.max(0, Math.floor((Date.now() - new Date(stamp).getTime()) / (1000 * 60 * 60 * 24)));
  return `${days} day${days === 1 ? "" : "s"}`;
}

/**
 * @param {{
 *   displays?: Array<Record<string, unknown>>,
 *   groups?: Array<{ id: string, name: string }>,
 *   groupsById?: Record<string, { name?: string }>,
 *   playlists?: Array<{ id: string, name: string }>,
 *   alerts?: Array<{ active?: boolean }>,
 *   canEdit?: boolean,
 *   showProvisioning?: boolean,
 *   showRemote?: boolean,
 *   onAdd?: () => void,
 *   onEdit?: (display: Record<string, unknown>) => void,
 *   onPreview?: (display: Record<string, unknown>) => void,
 *   onDelete?: (id: string) => void,
 *   onRemoteRefresh?: (id: string) => void,
 *   onRemoteRestart?: (id: string) => void,
 *   onRemoteAssignPlaylist?: (id: string, playlistId: string) => void,
 *   onRemoteUpdateSoftware?: (id: string) => void,
 *   onQuickEmergencyAlert?: (id: string) => void,
 * }} props
 */
export default function DeviceLibrarySection({
  displays = [],
  groups = [],
  groupsById = {},
  playlists = [],
  alerts = [],
  canEdit = false,
  showProvisioning = false,
  showRemote = false,
  onAdd,
  onEdit,
  onPreview,
  onDelete,
  onRemoteRefresh,
  onRemoteRestart,
  onRemoteAssignPlaylist,
  onRemoteUpdateSoftware,
  onQuickEmergencyAlert,
}) {
  const devices = useMemo(() => summarizeDeviceHealth(displays), [displays]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [assignModal, setAssignModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return devices.filter((device) => {
      if (statusFilter === "online" && device.heartbeatStatus !== "online") return false;
      if (statusFilter === "offline" && device.heartbeatStatus === "online") return false;
      if (typeFilter !== "all" && device.displayType !== typeFilter) return false;
      if (!needle) return true;
      return ["name", "location", "station", "assetId", "deviceId", "macAddress"].some((field) =>
        String(device[field] ?? "").toLowerCase().includes(needle),
      );
    });
  }, [devices, query, statusFilter, typeFilter]);

  const onlineCount = devices.filter((item) => item.heartbeatStatus === "online").length;

  async function runRemote(action, displayId, extra) {
    if (!canEdit) return;
    setMenuOpen(null);
    if (action === "refresh") await onRemoteRefresh?.(displayId);
    if (action === "restart") await onRemoteRestart?.(displayId);
    if (action === "update") await onRemoteUpdateSoftware?.(displayId, PLAYER_SOFTWARE_VERSION);
    if (action === "emergency") await onQuickEmergencyAlert?.(displayId);
    if (action === "assign") setAssignModal({ displayId, playlistId: extra?.playlistId || "" });
  }

  return (
    <div className="space-y-5">
      {showProvisioning ? <SignageStickProvisioningGuide displays={displays} /> : null}

      <DigitalDashboardLibraryShell
        title="Device Library"
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search devices"
        totalItems={filtered.length}
        filters={
          <>
            <LibraryFilterPill label="Type" active={typeFilter !== "all"} onClick={() => setTypeFilter(typeFilter === "all" ? "information" : "all")} />
            <LibraryFilterPill
              label="Status"
              active={statusFilter !== "all"}
              count={statusFilter === "online" ? onlineCount : undefined}
              onClick={() => setStatusFilter(statusFilter === "all" ? "online" : "all")}
            />
            <LibraryFilterPill label="Groups" />
          </>
        }
        actions={
          <>
            {showRemote ? (
              <button type="button" className="app-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs">
                <List className="h-4 w-4" />
                Groups
              </button>
            ) : null}
            {showRemote ? (
              <button type="button" className="app-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--color-afta-red)]">
                <Siren className="h-4 w-4" />
                Set alerts
              </button>
            ) : null}
            {canEdit && onAdd ? (
              <button type="button" className="app-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs" onClick={onAdd}>
                <CirclePlus className="h-4 w-4" />
                Add device
              </button>
            ) : null}
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-afta-border)] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
              <tr>
                <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all" disabled /></th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Groups</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Device age</th>
                <th className="px-4 py-3">Current app</th>
                <th className="px-4 py-3">Last check in</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((device) => {
                  const group = groupsById[device.groupId] || groups.find((item) => item.id === device.groupId);
                  const active = device.heartbeatStatus === "online";
                  return (
                    <tr key={device.id} className="border-t border-[var(--color-afta-border)] hover:bg-slate-50/80">
                      <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${device.name}`} disabled /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-[var(--color-afta-red)]">
                            <Tv className="h-4 w-4" />
                          </span>
                          <div>
                            <strong className="block text-sm text-[var(--color-afta-text)]">{device.name}</strong>
                            <span className="text-xs text-[var(--color-afta-muted)]">{device.deviceId || device.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-[var(--color-afta-text)]">{device.location || device.station || "—"}</div>
                        <div className="text-[var(--color-afta-muted)]">{displayTypeLabel(device.displayType)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {group?.name ? <LibraryGroupTag>{group.name}</LibraryGroupTag> : <span className="text-xs text-[var(--color-afta-muted)]">Default</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-afta-muted)]">{(device.tags || [])[0] || "N/A"}</td>
                      <td className="px-4 py-3 text-xs">{deviceAgeLabel(device)}</td>
                      <td className="px-4 py-3 text-xs font-mono">{device.softwareVersion || PLAYER_SOFTWARE_VERSION}</td>
                      <td className="px-4 py-3 text-xs">{formatLastSync(device.heartbeatAt || device.lastSyncAt)}</td>
                      <td className="px-4 py-3">
                        <LibraryStatusBadge active={active} label={active ? "Active" : "Inactive"} />
                      </td>
                      <td className="relative px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {onPreview ? (
                            <button type="button" className="app-btn-secondary p-2" title="Preview" onClick={() => onPreview(device)}>
                              <Play className="h-4 w-4" />
                            </button>
                          ) : null}
                          {canEdit && onEdit ? (
                            <button type="button" className="app-btn-secondary p-2" title="Edit" onClick={() => onEdit(device)}>
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="app-btn-secondary p-2"
                            onClick={() => setMenuOpen(menuOpen === device.id ? null : device.id)}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                        {menuOpen === device.id ? (
                          <div className="absolute right-4 top-12 z-10 min-w-[180px] rounded-[10px] border border-[var(--color-afta-border)] bg-white py-1 shadow-lg">
                            {showRemote && canEdit ? (
                              <>
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50" onClick={() => runRemote("refresh", device.id)}>
                                  <RefreshCw className="h-3.5 w-3.5" /> Refresh content
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50" onClick={() => runRemote("restart", device.id)}>
                                  <RotateCcw className="h-3.5 w-3.5" /> Restart player
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50" onClick={() => runRemote("assign", device.id, { playlistId: device.playlistId })}>
                                  <MonitorSmartphone className="h-3.5 w-3.5" /> Assign playlist
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50" onClick={() => runRemote("update", device.id)}>
                                  <Cpu className="h-3.5 w-3.5" /> Update software
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" onClick={() => runRemote("emergency", device.id)}>
                                  <AlertTriangle className="h-3.5 w-3.5" /> Emergency override
                                </button>
                              </>
                            ) : null}
                            {canEdit && onDelete ? (
                              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" onClick={() => { setMenuOpen(null); onDelete(device.id); }}>
                                <Trash2 className="h-3.5 w-3.5" /> Delete device
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <MonitorPlay className="mx-auto h-10 w-10 text-[var(--color-afta-subtle)]" />
                    <p className="mt-3 text-sm font-semibold text-[var(--color-afta-text)]">No devices registered</p>
                    <p className="mt-1 text-xs text-[var(--color-afta-muted)]">Add Amazon Signage Stick players or web displays to the device library.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DigitalDashboardLibraryShell>

      {assignModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAssignModal(null)}>
          <div className="app-panel w-full max-w-md p-5" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-sm font-semibold">Assign playlist</h3>
            <select
              className="app-input mt-3"
              value={assignModal.playlistId}
              onChange={(event) => setAssignModal((current) => ({ ...current, playlistId: event.target.value }))}
            >
              <option value="">Select playlist</option>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={() => setAssignModal(null)}>Cancel</button>
              <button
                type="button"
                className="app-btn-primary px-4 py-2 text-xs"
                onClick={() => {
                  onRemoteAssignPlaylist?.(assignModal.displayId, assignModal.playlistId);
                  setAssignModal(null);
                }}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

# RMS Integration — Forge Fleet Maintenance Module

Version: `1.0` (draft)

Forge Fleet is designed as a **standalone product** that integrates into Forge RMS via APIs and shared identifiers — not shared Firestore (per Forge architecture).

## Shared Identifiers

| Fleet Field | RMS Field | Purpose |
|-------------|-----------|---------|
| `rmsDepartmentId` | `departmentId` | Link department records |
| `rmsStationId` | `stationId` | Link station records |
| `rmsApparatusId` | `apparatusId` | Link apparatus/unit records |
| `rmsPersonId` | `personId` | Link personnel (assignees, performers) |
| `fdid` | `fdid` | State fire department ID |

## Status Mapping

| Fleet Status | RMS Status |
|--------------|------------|
| `in_service` | `available` |
| `out_of_service` | `out` |
| `maintenance` | `maintenance` |
| `reserve` | `reserve` |
| `retired` | `retired` |

## Webhook Events (Fleet → RMS)

### `POST /v1/webhooks/fleet-maintenance`

Auth: `X-Integration-Secret: <secret>`

| Event | Trigger |
|-------|---------|
| `apparatus.status_changed` | Apparatus status updated |
| `work_order.created` | New work order opened |
| `work_order.completed` | Work order marked complete |
| `maintenance_record.submitted` | Checkoff/inspection submitted |
| `schedule.overdue` | Schedule passes due date |

**Payload:**

```json
{
  "event": "apparatus.status_changed",
  "timestamp": "2026-07-07T12:00:00Z",
  "rmsDepartmentId": "rms-dept-springfield",
  "data": {
    "rmsApparatusId": "rms-apparatus-l2",
    "unitNumber": "L-2",
    "previousStatus": "in_service",
    "newStatus": "maintenance"
  }
}
```

## Fleet Sync Export (Fleet → RMS)

Available in Settings → Export Fleet Sync JSON.

```json
{
  "version": "1.0",
  "generatedAt": "ISO-8601",
  "source": "forge-fleet",
  "departments": [],
  "stations": [],
  "apparatus": [],
  "equipment": [],
  "schedules": [],
  "openWorkOrders": [],
  "recentRecords": []
}
```

## RMS → Fleet (Future)

### `GET /v1/fleet/apparatus/{rmsApparatusId}`

RMS reads apparatus maintenance status from Fleet.

### `POST /v1/fleet/sync`

RMS pushes department/station/apparatus master data to Fleet.

## Embedding into RMS

When integrating into Forge RMS:

1. **Copy** `forge-fleet/src/lib/` data layer into RMS `src/lib/fleet/`
2. **Copy** pages into RMS `src/pages/fleet/` with route prefix `/fleet/`
3. **Add** Firestore collections to RMS `firestore.rules`
4. **Enable** via RMS system settings module toggle
5. **Wire** webhooks using `src/lib/rmsIntegration.js`
6. **Reuse** `@forgeps/ai-builder` ModuleDefinition for template compatibility

The ModuleDefinition schema is already shared between products via `packages/forge-ai-builder`.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_FLEET_STORAGE` | `local` or `firebase` |
| `VITE_RMS_API_BASE_URL` | RMS API base for webhooks |
| `VITE_RMS_INTEGRATION_SECRET` | Webhook auth secret |

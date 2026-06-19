# ForgePS Dashboard — Integration

How Dashboard connects to **Forge RMS** (primary) and **Forge Academy** (optional).

## Rules

1. **RMS is the primary feed** — incidents, units, personnel status, department alerts, KPIs.
2. **No cross-project Firestore reads** — call RMS (and optionally Academy) HTTP APIs only.
3. **Authenticate server-to-server** — API keys or service accounts per environment; rotate via secrets manager.
4. **Displays are read-only clients** — players fetch published payloads; they never write operational data.

## Shared identifiers

Use the same IDs across products when linking content to an organization:

| ID | Source | Dashboard usage |
|----|--------|-----------------|
| `rmsDepartmentId` | RMS | Scope widgets & playlists to a department |
| `fdid` | RMS / Academy | Human-readable FDID on displays |
| `displayId` | Dashboard | Player URL segment |
| `forgePersonId` | RMS *(planned)* | Named alerts, unit assignments |

Academy uses `departmentId` / `studentId` internally — map through integration tables when showing Academy widgets on an RMS-scoped display.

## RMS → Dashboard (primary — build first)

### Planned read APIs (RMS exposes, Dashboard consumes)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/v1/departments/{rmsDepartmentId}/dashboard-feed` | Aggregated widget payload for one department |
| `GET` | `/v1/alerts/active?departmentId=` | Active ops alerts ticker |
| `GET` | `/v1/units/status?departmentId=` | Unit availability board |
| `GET` | `/v1/incidents/recent?departmentId=&limit=` | Recent incident summary cards |

**Auth:** `Authorization: Bearer <dashboard-service-token>`

**Response shape (example):**

```json
{
  "departmentId": "rms-dept-123",
  "fdid": "0452",
  "generatedAt": "2026-06-19T12:00:00Z",
  "widgets": [
    { "type": "alerts", "items": [] },
    { "type": "units", "items": [] }
  ]
}
```

Dashboard caches feed snapshots in its own Firestore for player reliability; refresh on interval or RMS webhook.

### Planned webhooks (RMS pushes, Dashboard ingests)

| Event | Action |
|-------|--------|
| `alert.created` | Invalidate cache, optionally push to connected players |
| `incident.closed` | Refresh incident widget |
| `unit.status_changed` | Refresh unit board |

```http
POST /webhooks/rms
X-Integration-Secret: <secret>
Content-Type: application/json
```

## Academy → Dashboard (optional — later)

Only when a department TV should show **training** content (e.g. cadets at a regional campus):

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/v1/public/displays/{departmentId}/training-summary` | Today's classes, open sessions *(read-only)* |

Academy implements this; Dashboard consumes with a separate API key. **Do not** duplicate Academy campus signage (dining, AFTA sheets) in Dashboard unless explicitly required.

## Dashboard player API (this repo exposes)

Mirror Academy's player contract:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/display/:displayId/:publicKey` | Browser player (SPA route) |
| `GET` | `/api/v1/display-payload?displayId=&key=` | JSON payload for stick/TV |

Payload includes layout, playlist items, cached RMS widget data, and refresh timestamps.

## Environment secrets

| Secret | Used by |
|--------|---------|
| `RMS_API_BASE_URL` | Dashboard functions |
| `RMS_DASHBOARD_API_KEY` | Dashboard → RMS |
| `ACADEMY_API_BASE_URL` | Optional widgets |
| `ACADEMY_DASHBOARD_API_KEY` | Dashboard → Academy |
| `WEBHOOK_INTEGRATION_SECRET` | RMS → Dashboard webhooks |

Never commit secrets. Store in Firebase Functions config or GitHub Actions secrets.

## Implementation order

1. Dashboard player + admin (layouts, displays) with **static/mock** RMS widgets  
2. RMS `dashboard-feed` read API + Dashboard cache job  
3. RMS webhooks for alert refresh  
4. Optional Academy training-summary widget  
5. Shared signage player package (`@forgeps/signage-player`) only if both codebases need identical layout engine  

## Academy reference

Forge Academy documents the same boundaries from its side:

- `ForgePS/Forge-Academy` → `forge-academy/docs/ARCHITECTURE.md`
- `ForgePS/Forge-Academy` → `forge-academy/docs/INTEGRATION.md`

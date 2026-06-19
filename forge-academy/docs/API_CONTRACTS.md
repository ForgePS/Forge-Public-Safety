# API contracts (planned)

Cross-product HTTP contracts. **Not implemented yet** — use as the agreement between teams before writing integration code.

Version: `0.1` (draft)

## Authentication

| Pattern | When |
|---------|------|
| `Authorization: Bearer <token>` | Service-to-service reads |
| `X-Integration-Secret: <secret>` | Webhooks |

Tokens are per integration direction (Dashboard→RMS, RMS→Academy, etc.), stored in environment secrets.

---

## RMS → Dashboard

### `GET /v1/departments/{rmsDepartmentId}/dashboard-feed`

Aggregated widget data for one department display.

**Response `200`:**

```json
{
  "departmentId": "string",
  "fdid": "string",
  "generatedAt": "ISO-8601",
  "widgets": [
    { "type": "alerts", "title": "string", "items": [{ "id": "string", "text": "string", "severity": "info|warn|critical" }] },
    { "type": "units", "items": [{ "id": "string", "name": "string", "status": "available|busy|out" }] }
  ]
}
```

---

## RMS → Academy

### `GET /v1/people/{rmsPersonId}`

Verify personnel record for registration eligibility.

**Response `200`:**

```json
{
  "rmsPersonId": "string",
  "firstName": "string",
  "lastName": "string",
  "rmsDepartmentId": "string",
  "fdid": "string",
  "active": true
}
```

### `POST /v1/webhooks/training-completed` (Academy receives)

RMS or external system notifies Academy of completion *(or Academy sends to RMS — pick one system of record per event type)*.

```json
{
  "studentId": "string",
  "courseId": "string",
  "completedDate": "YYYY-MM-DD",
  "certificateId": "string|null"
}
```

---

## Academy → RMS

### `POST /v1/webhooks/training-completed` (RMS receives)

Academy notifies RMS when a student completes a course.

```json
{
  "studentId": "string",
  "rmsPersonId": "string|null",
  "courseName": "string",
  "courseNumber": "string",
  "completedDate": "YYYY-MM-DD",
  "certificateSerial": "string|null"
}
```

---

## Academy → Dashboard (optional)

### `GET /v1/public/training-summary`

Read-only feed for optional training widgets on org displays.

**Query:** `departmentId` or `fdid`

**Response `200`:**

```json
{
  "fdid": "string",
  "generatedAt": "ISO-8601",
  "sessions": [
    { "courseName": "string", "startDate": "YYYY-MM-DD", "location": "string" }
  ]
}
```

---

## Academy campus player (implemented)

### Callable: `getDigitalDisplayPayloadCallable`

**Input:** `{ displayId, publicKey, virtualSession? }`  
**Output:** Layout, playlist items, dining menus, media snapshots (see `functions/lib/digitalDashboardPlayer.js`).

Public route: `/display/:displayId/:publicKey`

---

## Changelog

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-06-19 | Initial draft for RMS ↔ Dashboard ↔ Academy planning |

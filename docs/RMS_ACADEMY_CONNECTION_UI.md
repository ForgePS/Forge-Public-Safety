# RMS repo: Forge Academy Connection UI

Contract for **Forge RMS** Settings → Forge Academy Connection (Phase 1).

Hub OpenAPI: [`../integration-hub/openapi.yaml`](../integration-hub/openapi.yaml)

## Workflow

1. Department admin opens **Settings → Forge Academy Connection**.
2. Selects **Connect to Forge Academy**.
3. UI shows department fields that will be shared (name, FDID, `rmsDepartmentId`, roster scopes).
4. On authorize, RMS calls Hub:
   - `POST /api/integrations/v1/departments` with profile
   - `POST /api/integrations/v1/departments/{forgeDepartmentId}/connect` with `{ authorizedBy, notes, permissions }`
5. Hub assigns / persists `forgeDepartmentId` and sets `status: active`.
6. Before creating or updating people, RMS calls `POST /api/integrations/v1/identity/resolve` (or pushes via `POST .../personnel`, which resolves first) and stores the returned `forgePersonId` on the RMS person. Do not mint local personIds; do not use Auth UID.
7. Admin chooses permission stubs: register, approve, view invoices, PO, transcripts, certificates, payments.
8. **Disconnect** calls `POST .../disconnect` — sync stops; identity map and historical Academy records remain.

## Auth

Send `Authorization: Bearer <rms-service-token>` matching Hub `HUB_RMS_SERVICE_TOKEN` / Secret Manager.

## Sync health widget

Poll `GET /api/integrations/v1/sync/status` for open failures, duplicate reviews, and FEMA SID corrections. Offer **Resync** via `POST /api/integrations/v1/sync/resync`. Resolve identity cases via `/identity/duplicates/{id}/resolve` and FEMA correction approve/reject endpoints.

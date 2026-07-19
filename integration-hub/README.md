# Forge Integration Hub

Centralized sync and **Forge Person Identity** service between **Forge Academy** and **Forge RMS**.

Academy and RMS must not call each other’s Firestore. All roster, connection, completion, and person-identity traffic goes through this hub.

## Person Identity

- Canonical resolve: `POST /api/integrations/v1/identity/resolve`
- `personId` / `forgePersonId` = Firestore auto-generated `hubIdentities` document id (legacy `fp_*` ids remain valid)
- Never use Firebase Auth UID as personId
- Verified unique FEMA SID → reuse existing personId; otherwise create or queue duplicate review
- Merge, verification, FEMA SID correction, and audit APIs under `/identity/*`

See [openapi.yaml](./openapi.yaml) and [docs/API_CONTRACTS.md](../docs/API_CONTRACTS.md).

## API

Base path: `/api/integrations/v1`

See [openapi.yaml](./openapi.yaml).

## Auth

- `Authorization: Bearer <service-token>` (preferred)
- `X-Integration-Secret` (compat shim)

Configure via env or Secret Manager (`HUB_USE_SECRET_MANAGER=true`).

## Run locally

```bash
cd integration-hub
npm install
set GOOGLE_CLOUD_PROJECT=forge-academy-95f84
set HUB_PIPELINE_MODE=inline
set HUB_INTEGRATION_SECRET=dev-secret
npm run dev
```

## Deploy (Cloud Run)

```bash
gcloud run deploy forge-integration-hub --source . --region us-central1 --project <hub-or-academy-project>
```

## Nightly reconcile

```bash
npm run reconcile
```

Schedule with Cloud Scheduler → HTTP `POST /api/integrations/v1/reconcile/run` or the reconcile job container.

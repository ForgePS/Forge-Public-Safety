# Forge Fleet — Equipment & Apparatus Maintenance Module

Standalone maintenance management for fire/EMS fleet operations. Built to integrate with **Forge RMS** when ready.

## Features

- **Apparatus Registry** — Full CRUD for engines, ladders, rescue units, ambulances, etc.
- **Equipment Inventory** — Tools, PPE, SCBA, medical supplies with par levels
- **Departments & Stations** — Organizational structure with RMS-compatible IDs
- **Maintenance Templates** — Fully editable forms (checkoff, inspection, inventory, custom) using the `@forgeps/ai-builder` ModuleDefinition schema
- **Maintenance Schedules** — Recurring schedules with overdue tracking
- **Work Orders** — Corrective/preventive maintenance with priority, assignment, and cost tracking
- **Maintenance Records** — Submit, view, and approve completed checkoffs/inspections
- **Dashboard** — Fleet status overview, overdue alerts, open work orders
- **Audit Log** — Activity tracking
- **RMS Integration** — Export/sync payloads and webhook stubs for Forge RMS

## Quick Start (Demo Mode)

```bash
cd forge-fleet
npm install
npm run dev
```

Open http://localhost:5173 — sign in with any credentials. Sample Springfield FD data loads automatically.

Storage mode defaults to **local** (browser localStorage). No Firebase required for demo.

## Production (Firebase)

1. Copy `.env.example` to `.env`
2. Set `VITE_FLEET_STORAGE=firebase`
3. Configure `VITE_FIREBASE_*` values
4. Deploy `firestore.rules` to your Firebase project

```bash
npm run build
```

## Architecture

```
forge-fleet/
├── src/lib/           # Data layer (dual storage: local + Firestore)
├── src/components/    # UI (ModuleDefinitionEditor, ModuleFormRenderer, etc.)
├── src/pages/         # Full CRUD pages for all entities
└── docs/              # RMS integration contracts
```

Uses the same patterns as Forge Academy:
- React 19 + Vite 7 + Tailwind 4
- `@forgeps/ai-builder` for ModuleDefinition schema
- Separate Firebase project (RMS integration via APIs, not shared Firestore)

## RMS Integration

See [docs/RMS_INTEGRATION.md](./docs/RMS_INTEGRATION.md) for:
- Shared identifier mapping (`rmsDepartmentId`, `rmsApparatusId`, `rmsPersonId`)
- Webhook event contracts
- Fleet sync JSON export format
- Steps to embed into Forge RMS

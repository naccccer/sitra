# Sitra ERP Roadmap

## Phase 0 - Architecture Baseline (Done)
- Modular monolith boundaries (`kernel <- modules`) locked.
- Single-tenant strategy locked.
- Module contracts and architecture rulebook established.

## Phase 1 - Modular Extraction (Done)
- Frontend modules extracted: `sales`, `master-data`, `users-access`, `production`, `inventory`.
- Backend endpoint adapters moved to `api/modules/*` with thin compatibility adapters in `api/*.php`.
- Boundary guardrail added (`npm run check:boundaries`).

## Phase 2 - Security and Access Hardening (Done)
- Role model expanded (`admin`, `manager`, `sales`, `production`, `inventory`).
- Capability-driven UI navigation enforced.
- Login/logout audit events added.
- Admin credential recovery command added (`npm run auth:reset-admin`).

## Phase 3 - Production/Inventory Data Foundation (Done)
- New schema entities:
  - `order_lines`
  - `production_work_orders`
  - `production_work_order_events`
  - `inventory_items`
  - `inventory_stock_reservations`
  - `inventory_stock_ledger`
- Labeling-critical fields included:
  - `requires_drilling`
  - `order_row_key` (`{orderNumber}-{row}`)
  - `public_template_url` + QR payload columns

## Phase 4 - Release Contract Implementation (In Progress)
- Implemented:
  - `GET|POST /api/production.php`
  - Line-level release -> upsert `order_lines` + create/reuse `production_work_orders`
  - Release event + audit registration
- Next:
  - Connect Sales UI action to release endpoint
  - Add explicit release audit in Sales module event timeline

## Phase 5 - Inventory Reservation Integration (In Progress)
- Implemented:
  - On release, generate/update `inventory_stock_reservations`.
  - Register stock ledger movements (`reserve` / `release` on replay deltas).
  - Read endpoint for reservations/ledger: `GET /api/inventory.php`.
  - Consume flow from production work orders (`PATCH /api/production.php` with `consumeQty`).
- Next:
  - Enable strict shortage blocking mode in production release UI when stock policy is enforced.
  - Add station-level consume presets and scan-first UX.

## Phase 6 - Shop-Floor Labeling Flow (Done)
- Implemented:
  - `GET|POST /api/production_labels.php` for preview/print actions.
  - Print counters on both `production_work_orders` and `order_lines`.
  - Quick reprint lookup by `order_row_key`.
  - Scan-first UI transition (`orderRowKey` -> stage/station patch).
  - Scanner profile presets (`Enter`, fast USB, camera) with auto-submit/debounce.
  - Print-template presets wired in production UI and attached to print actions.
  - Station preset master data with role-filtered mapping (`stationPresets` from production GET).
  - Backend guardrail: patch with forbidden `stationKey` returns `403`.


## Phase x - Operational Hardening (Future)
- Add focused API tests for release/status flows.
- Initial smoke script added: `npm run smoke:production` (login/bootstrap/production/labels).
- Add migration scripts for legacy databases.
- Add dashboard metrics for queue aging and bottlenecks.

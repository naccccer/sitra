# Production Module

## Responsibility
- Convert released sales order lines into executable work orders.
- Track production stages and pattern assets.
- Support scan-first station transitions by `order_row_key`.
- Support scanner profile presets (enter-submit and auto-submit modes).

## Owns
- Work orders at order-line granularity.
- Production stage transitions/history.
- Pattern file metadata ownership.

## Public Services
- `work_order_create_from_release`
- `work_order_stage_set`
- `pattern_file_attach`
- `label_preview_print`
- `station_presets_for_role`
- API adapter:
  - `GET|POST|PATCH /api/production.php`
  - `GET|POST /api/production_labels.php`

## Data Ownership
- Owns production work order tables and pattern metadata tables.
- Owns line-level execution projection fields needed by shop-floor labels:
  - `order_row_key`
  - `requires_drilling`
  - `public_template_url`/QR payload link

## Interaction Rules
- Input source is release contract from sales.
- Must not mutate sales financial/order core data directly.
- On release, invokes inventory reservation contract to reserve stock for released lines.
- On station progress, can trigger inventory consume contract for reserved quantities.
- Label print/reprint must resolve by `workOrderId` or `orderRowKey` only.
- Station transitions with `stationKey` must pass role-based station preset mapping.

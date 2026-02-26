# Production Module

## Responsibility
- Convert released sales order lines into executable work orders.
- Track production stages and pattern assets.

## Owns
- Work orders at order-line granularity.
- Production stage transitions/history.
- Pattern file metadata ownership.

## Public Services
- `work_order_create_from_release`
- `work_order_stage_set`
- `pattern_file_attach`
- API adapter:
  - `GET|POST /api/production.php`

## Data Ownership
- Owns production work order tables and pattern metadata tables.
- Owns line-level execution projection fields needed by shop-floor labels:
  - `order_row_key`
  - `requires_drilling`
  - `public_template_url`/QR payload link

## Interaction Rules
- Input source is release contract from sales.
- Must not mutate sales financial/order core data directly.

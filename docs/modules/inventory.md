# Inventory Module

## Responsibility
- Stock accounting and reservation lifecycle for production demand.

## Owns
- Stock ledger.
- Stock movements.
- Reservations tied to released production demand.

## Public Services
- `reserve_for_release`
- `stock_move`
- `consume_for_work_order`
- API adapter:
  - `GET /api/inventory.php`

## Data Ownership
- Owns inventory item, movement, and reservation tables.

## Interaction Rules
- Reservation is created at production release time.
- Must not be updated by direct writes from sales/production modules.
- Production invokes reservation via inventory release contract (kernel-mediated integration).

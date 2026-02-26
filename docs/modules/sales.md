# Sales Module

## Responsibility
- Order lifecycle and customer-facing order intake.
- Invoice/payment context in phase 1.

## Owns
- Orders aggregate.
- Order items domain view.
- Customer CRM-lite entity scope.
- External order status lifecycle.

## Public Services
- `order_create`
- `order_update`
- `order_status_set`
- `release_order`

## Data Ownership
- Owns `orders` and future normalized sales tables (`order_items`, `order_payments`, `order_status_history`).
- Must keep backward compatibility with current order payload during migration.

## Interaction Rules
- Explicit release action triggers production and inventory flows.
- Must not write production or inventory tables directly.


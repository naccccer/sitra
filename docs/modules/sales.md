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

## Data Ownership
- Owns `orders` and future normalized sales tables (`order_items`, `order_payments`, `order_status_history`).
- Must keep backward compatibility with current order payload during migration.

## Interaction Rules
- Sales owns order lifecycle and does not depend on removed operational domains.

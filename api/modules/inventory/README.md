# Inventory Backend Module

Backend handlers for inventory domain.

Endpoints:
- `inventory_v2_products.php`
- `inventory_v2_warehouses.php`
- `inventory_v2_locations.php`
- `inventory_v2_lots.php`
- `inventory_v2_operations.php`
- `inventory_v2_reservations.php`

Rules:
- Always enforce auth/permission/csrf on mutating methods.
- Use prepared statements for all SQL.
- Keep stock mutation only in shared Inventory V2 posting helpers.

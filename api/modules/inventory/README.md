# Inventory Backend Module

Backend handlers for inventory domain.

Endpoints:
- `inventory_warehouses.php`
- `inventory_items.php`
- `inventory_documents.php`
- `inventory_requests.php`
- `inventory_counts.php`
- `inventory_reports.php`
- `inventory_v2_products.php`
- `inventory_v2_warehouses.php`
- `inventory_v2_locations.php`
- `inventory_v2_lots.php`

Rules:
- Always enforce auth/permission/csrf on mutating methods.
- Use prepared statements for all SQL.
- Keep stock mutation only in shared inventory posting helpers.

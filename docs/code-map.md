# Code Map

| Feature | Canonical Frontend Module | Canonical Backend Module | DB Tables | Endpoint Entrypoints |
|---|---|---|---|---|
| Bootstrap + Session + Capabilities | `src/kernel`, `src/hooks/useBootstrap.js` | `api/modules/kernel` | `users`, `system_settings`, `module_registry`, `orders` | `GET /api/bootstrap.php` |
| Sales Orders Lifecycle | `src/modules/sales` | `api/modules/sales` | `orders`, `order_request_idempotency` | `GET|POST|PUT|PATCH|DELETE /api/orders.php` |
| Customers Directory + Projects | `src/modules/customers` | `api/modules/customers` | `customers`, `customer_projects`, `customer_project_contacts` | `GET|POST|PUT|PATCH /api/customers.php`, `GET|POST|PUT|PATCH /api/customer_projects.php`, `GET|POST|PUT|PATCH /api/customer_project_contacts.php` |
| Inventory V2 Operations | `src/modules/inventory` | `api/modules/inventory` | `inventory_v2_products`, `inventory_v2_variants`, `inventory_v2_warehouses`, `inventory_v2_locations`, `inventory_v2_lots`, `inventory_v2_quants`, `inventory_v2_operation_headers`, `inventory_v2_operation_lines`, `inventory_v2_stock_ledger`, `inventory_v2_reservations` | `GET|POST|PUT|PATCH /api/inventory_v2_products.php`, `GET|POST|PUT|PATCH /api/inventory_v2_warehouses.php`, `GET|POST|PUT|PATCH /api/inventory_v2_locations.php`, `GET|POST|PUT|PATCH /api/inventory_v2_lots.php`, `GET|POST|PUT|PATCH /api/inventory_v2_operations.php`, `GET|POST|PATCH /api/inventory_v2_reservations.php` |
| Catalog Management | `src/modules/master-data` | `api/modules/master_data` | `system_settings` (`catalog`) | `GET|POST /api/catalog.php` |
| Business Profile | `src/pages/ProfilePage.jsx` + kernel settings shell | `api/modules/master_data` | `system_settings` (`profile`) | `GET|POST /api/profile.php` |
| Users and Permissions | `src/modules/users-access` | `api/modules/users_access` | `users`, `system_settings` (`role_permissions`) | `GET|POST|PUT|PATCH /api/users.php`, `GET|POST /api/role_permissions.php` |
| Module Registry (Owner) | `src/kernel/pages/SystemSettingsPage.jsx` | `api/modules/kernel` | `module_registry` | `GET|PATCH /api/module_registry.php` |
| Audit Logs | `src/kernel/pages/AuditLogsPage.jsx` | `api/modules/kernel` | `audit_logs` | `GET /api/audit_logs.php` |
| Auth | `src/components/auth/LoginView.jsx` | `api/modules/users_access` | `users` | `POST /api/login.php`, `POST /api/logout.php` |
| Uploads | Sales + Admin profile components | top-level upload endpoints | filesystem (`api/uploads/`) | `POST /api/upload.php`, `POST /api/upload_logo.php` |

## Canonical Edit Paths

- Frontend business changes: `src/modules/<module>/*`
- Shared frontend runtime/shell: `src/kernel/*`, `src/services/*`, `src/hooks/*`
- Backend business handlers: `api/modules/<module>/*`
- Endpoint wrappers: `api/*.php` (thin adapters only)

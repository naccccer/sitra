# Backend Modules

Business-domain module implementations live under this directory.

Rules:
- Each module owns its data and write operations.
- Cross-module interactions happen through contracts/services, not direct table access.
- Endpoint adapters in `api/*.php` stay thin for backward compatibility.

Current adapter mapping:
- `api/orders.php` -> `api/modules/sales/orders.php`
- `api/catalog.php` -> `api/modules/master_data/catalog.php`
- `api/profile.php` -> `api/modules/master_data/profile.php`
- `api/users.php` -> `api/modules/users_access/users.php`
- `api/customers.php` -> `api/modules/customers/customers.php`
- `api/customer_projects.php` -> `api/modules/customers/customer_projects.php`
- `api/customer_project_contacts.php` -> `api/modules/customers/customer_project_contacts.php`
- `api/inventory_warehouses.php` -> `api/modules/inventory/inventory_warehouses.php`
- `api/inventory_items.php` -> `api/modules/inventory/inventory_items.php`
- `api/inventory_documents.php` -> `api/modules/inventory/inventory_documents.php`
- `api/inventory_requests.php` -> `api/modules/inventory/inventory_requests.php`
- `api/inventory_counts.php` -> `api/modules/inventory/inventory_counts.php`
- `api/inventory_reports.php` -> `api/modules/inventory/inventory_reports.php`
- `api/login.php` -> `api/modules/users_access/login.php`
- `api/logout.php` -> `api/modules/users_access/logout.php`
- `api/bootstrap.php` -> `api/modules/kernel/bootstrap.php`
- `api/module_registry.php` -> `api/modules/kernel/module_registry.php`

Internal split pattern (applied where logic is large):
- `orders.php` delegates to `orders_handlers.php` and `orders_shared.php`
- `users.php` delegates to `users_handlers.php` and `users_shared.php`

Inactive scaffolds:
- `api/modules/production/` (reserved, not active)

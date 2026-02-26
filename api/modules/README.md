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
- `api/login.php` -> `api/modules/users_access/login.php`
- `api/logout.php` -> `api/modules/users_access/logout.php`
- `api/bootstrap.php` -> `api/modules/kernel/bootstrap.php`
- `api/production.php` -> `api/modules/production/work_orders.php`

Internal split pattern (applied where logic is large):
- `orders.php` delegates to `orders_handlers.php` and `orders_shared.php`
- `users.php` delegates to `users_handlers.php` and `users_shared.php`
- `work_orders.php` delegates to `work_orders_handlers.php` and `work_orders_shared.php`

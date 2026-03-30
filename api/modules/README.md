# Backend Modules

Business-domain module implementations live under this directory.

Rules:
- Each module owns its data and write operations.
- Cross-module interactions happen through contracts/services, not direct table access.
- Endpoint adapters in `api/*.php` stay thin for backward compatibility.

Active backend modules:
- `accounting`
- `customers`
- `human_resources`
- `inventory`
- `kernel`
- `master_data`
- `sales`
- `users_access`

Current adapter mapping includes:
- `api/bootstrap.php` -> `api/modules/kernel/bootstrap.php`
- `api/module_registry.php` -> `api/modules/kernel/module_registry.php`
- `api/audit_logs.php` -> `api/modules/kernel/audit_logs.php`
- `api/orders.php` -> `api/modules/sales/orders.php`
- `api/catalog.php` -> `api/modules/master_data/catalog.php`
- `api/profile.php` -> `api/modules/master_data/profile.php`
- `api/customers.php` -> `api/modules/customers/customers.php`
- `api/customer_projects.php` -> `api/modules/customers/customer_projects.php`
- `api/customer_project_contacts.php` -> `api/modules/customers/customer_project_contacts.php`
- `api/hr_employees.php` -> `api/modules/human_resources/hr_employees.php`
- `api/hr_documents.php` -> `api/modules/human_resources/hr_documents.php`
- `api/inventory_v2_products.php` -> `api/modules/inventory/inventory_v2_products.php`
- `api/inventory_v2_warehouses.php` -> `api/modules/inventory/inventory_v2_warehouses.php`
- `api/inventory_v2_locations.php` -> `api/modules/inventory/inventory_v2_locations.php`
- `api/inventory_v2_lots.php` -> `api/modules/inventory/inventory_v2_lots.php`
- `api/inventory_v2_operations.php` -> `api/modules/inventory/inventory_v2_operations.php`
- `api/inventory_v2_reservations.php` -> `api/modules/inventory/inventory_v2_reservations.php`
- `api/inventory_v2_replenishment.php` -> `api/modules/inventory/inventory_v2_replenishment.php`
- `api/inventory_v2_reports.php` -> `api/modules/inventory/inventory_v2_reports.php`
- `api/users.php` -> `api/modules/users_access/users.php`
- `api/role_permissions.php` -> `api/modules/users_access/role_permissions.php`
- `api/login.php` -> `api/modules/users_access/login.php`
- `api/logout.php` -> `api/modules/users_access/logout.php`
- `api/acc_accounts.php` -> `api/modules/accounting/acc_accounts.php`
- `api/acc_fiscal_years.php` -> `api/modules/accounting/acc_fiscal_years.php`
- `api/acc_payroll.php` -> `api/modules/accounting/acc_payroll.php`
- `api/acc_payroll_file.php` -> `api/modules/accounting/acc_payroll_file.php`
- `api/acc_payroll_import.php` -> `api/modules/accounting/acc_payroll_import.php`
- `api/acc_reports.php` -> `api/modules/accounting/acc_reports.php`
- `api/acc_sales_bridge.php` -> `api/modules/accounting/acc_sales_bridge.php`
- `api/acc_settings.php` -> `api/modules/accounting/acc_settings.php`
- `api/acc_vouchers.php` -> `api/modules/accounting/acc_vouchers.php`

Inactive scaffolds:
- `api/modules/production/`

# Sitra ERP Module Contracts

## Purpose
This file defines **stable cross-module contracts** at a compact level.

- Architecture invariants live in `ARCHITECTURE.md`.
- Active ownership and entrypoints live in `docs/code-map.md`.
- Request/response payload authority is machine-readable schemas under `contracts/schemas/*.json`.
- Generated frontend typedefs live in `src/types/api-contracts.generated.js`.

## Global Compatibility Rules
- No direct cross-module table access.
- Cross-module interactions use public contracts/services only.
- Breaking contract changes require version bumps and same-change doc/schema updates.
- Contract-facing backend/schema changes must update this file and related schemas together.

## Contract Registry (Stable IDs)

### Kernel
- `kernel.auth_context.v1`
- `kernel.permission_check.v1`
- `kernel.audit_log.v1`
- `kernel.module_registry.v1`

### Master Data
- `master_data.catalog_get.v1`
- `master_data.catalog_save.v1`
- `master_data.profile_get.v1`
- `master_data.profile_save.v1`
- `master_data.operation_icon_upload.v1`

### Sales
- `sales.order_create.v1`
- `sales.order_update.v1`
- `sales.order_status_set.v1`

### Customers
- `customers.customer_list.v1`
- `customers.customer_directory.v1`
- `customers.customer_create.v1`
- `customers.customer_update.v1`
- `customers.project_list.v1`
- `customers.project_create_update.v1`
- `customers.project_contact_list_write.v1`

### Inventory
- `inventory.v2_products_master.v1`
- `inventory.v2_warehouses_master.v1`
- `inventory.v2_locations_master.v1`
- `inventory.v2_lots_master.v1`
- `inventory.v2_operations.v1`
- `inventory.v2_reservations.v1`
- `inventory.v2_replenishment.v1`
- `inventory.v2_reports.v1`

### Human Resources
- `human_resources.employee_list_write.v1`
- `human_resources.employee_documents.v1`

### Accounting
- `accounting.payroll_workspace.v1`
- `accounting.payroll_import.v1`
- `accounting.settings.v1`
- `accounting.accounts.v1`
- `accounting.vouchers.v1`
- `accounting.fiscal_years.v1`
- `accounting.reports.v1`
- `accounting.sales_bridge.v1`

### Users Access
- `users_access.users_list_write.v1`
- `users_access.role_permissions.v1`

## Locked Runtime Enums (Compatibility)
These values are externally relied on and must remain stable unless versioned migration is planned:

- Sales order status: `pending`, `processing`, `delivered`, `archived`
- Roles: `admin`, `manager`, `sales`
- Inventory operation lifecycle: `draft`, `submitted`, `approved`, `posted`, `cancelled`
- Inventory reservation lifecycle: `active`, `fulfilled`, `released`

## Endpoint Contract Anchors
Public wrappers remain contract anchors and must stay compatible:

- `/api/bootstrap.php`
- `/api/orders.php`
- `/api/customers.php`
- `/api/customer_projects.php`
- `/api/customer_project_contacts.php`
- `/api/hr_employees.php`
- `/api/inventory_v2_products.php`
- `/api/inventory_v2_warehouses.php`
- `/api/inventory_v2_locations.php`
- `/api/inventory_v2_lots.php`
- `/api/inventory_v2_operations.php`
- `/api/inventory_v2_reservations.php`
- `/api/inventory_v2_replenishment.php`
- `/api/inventory_v2_reports.php`
- `/api/acc_payroll.php`
- `/api/acc_payroll_import.php`
- `/api/acc_settings.php`
- `/api/catalog.php`
- `/api/profile.php`
- `/api/users.php`
- `/api/role_permissions.php`
- `/api/module_registry.php`
- `/api/login.php`, `/api/logout.php`

## Change Checklist
When adding or changing a contract:
1. Update module handler/service in owning module.
2. Update JSON schema(s) in `contracts/schemas`.
3. Regenerate/refresh frontend contract types if needed.
4. Update this contract registry and any affected endpoint index notes.
5. Run the appropriate validation mode (`verify:fast` or `verify:safe`).

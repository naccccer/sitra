# Code Map

This file describes the current repo shape. It is the source of truth for active module ownership and canonical edit paths. `docs/ROADMAP.md` is future-looking only.

## Module Status

| Area | Status |
|---|---|
| `sales` | active |
| `customers` | active |
| `inventory` | active |
| `human-resources` | active |
| `accounting` | active |
| `master-data` | active |
| `users-access` | active |
| `kernel` | active shared runtime |
| `production` | inactive scaffold |

## Feature Ownership

| Feature | Canonical Frontend Module | Canonical Backend Module | DB Tables | Endpoint Entrypoints |
|---|---|---|---|---|
| Bootstrap + Session + Capabilities | `src/kernel`, `src/hooks/useBootstrap.js` | `api/modules/kernel` | `users`, `system_settings`, `module_registry`, `orders` | `GET /api/bootstrap.php` |
| Sales Orders Lifecycle | `src/modules/sales` | `api/modules/sales` | `orders`, `order_request_idempotency`, `order_financials`, `order_payments` | `GET|POST|PUT|PATCH|DELETE /api/orders.php` |
| Customers Directory + Projects | `src/modules/customers` | `api/modules/customers` | `customers`, `customer_projects`, `customer_project_contacts` | `GET|POST|PUT|PATCH /api/customers.php`, `GET|POST|PUT|PATCH /api/customer_projects.php`, `GET|POST|PUT|PATCH /api/customer_project_contacts.php` |
| Inventory V2 Operations | `src/modules/inventory` | `api/modules/inventory` | `inventory_v2_products`, `inventory_v2_variants`, `inventory_v2_warehouses`, `inventory_v2_locations`, `inventory_v2_lots`, `inventory_v2_quants`, `inventory_v2_operation_headers`, `inventory_v2_operation_lines`, `inventory_v2_stock_ledger`, `inventory_v2_reservations` | `GET|POST|PUT|PATCH /api/inventory_v2_products.php`, `GET|POST|PUT|PATCH /api/inventory_v2_warehouses.php`, `GET|POST|PUT|PATCH /api/inventory_v2_locations.php`, `GET|POST|PUT|PATCH /api/inventory_v2_lots.php`, `GET|POST|PUT|PATCH /api/inventory_v2_operations.php`, `GET|POST|PATCH /api/inventory_v2_reservations.php`, `GET|POST|PUT|PATCH /api/inventory_v2_replenishment.php`, `GET /api/inventory_v2_reports.php` |
| Human Resources Directory + Documents | `src/modules/human-resources` | `api/modules/human_resources` | `hr_employees` | `GET|POST|PUT|PATCH|DELETE /api/hr_employees.php`, `GET|POST|DELETE /api/hr_documents.php` |
| Accounting Payroll + Ledgers | `src/modules/accounting` | `api/modules/accounting` | `acc_payroll_periods`, `acc_payslips`, `acc_payslip_items`, `acc_payslip_payments`, `acc_payslip_documents`, `acc_vouchers`, `acc_voucher_lines`, `acc_accounts`, `acc_fiscal_years`, `system_settings` | `GET|POST|PUT|PATCH|DELETE /api/acc_payroll.php`, `POST /api/acc_payroll_import.php`, `POST /api/acc_payroll_file.php`, `GET|POST /api/acc_settings.php?key=accounting.payroll.settings`, `GET|POST|PUT|PATCH /api/acc_accounts.php`, `GET|POST|PUT|PATCH /api/acc_vouchers.php`, `GET|POST|PUT|PATCH /api/acc_fiscal_years.php`, `GET /api/acc_reports.php`, `GET|POST /api/acc_sales_bridge.php` |
| Catalog Management | `src/modules/master-data/pages/PricingPage.jsx` + `src/modules/master-data/components/AdminSettingsView.jsx` | `api/modules/master_data` | `system_settings` (`catalog`) | `GET|POST /api/catalog.php` |
| Business Profile | `src/modules/master-data/pages/ProfilePage.jsx` + `src/modules/master-data/pages/MasterDataPage.jsx` | `api/modules/master_data` | `system_settings` (`profile`) | `GET|POST /api/profile.php` |
| Users and Permissions | `src/modules/users-access` | `api/modules/users_access` | `users`, `system_settings` (`role_permissions`) | `GET|POST|PUT|PATCH /api/users.php`, `GET|POST /api/role_permissions.php` |
| Module Registry (Owner) | `src/kernel/pages/SystemSettingsPage.jsx` | `api/modules/kernel` | `module_registry` | `GET|PATCH /api/module_registry.php` |
| Audit Logs | `src/kernel/pages/AuditLogsPage.jsx` | `api/modules/kernel` | `audit_logs` | `GET /api/audit_logs.php` |
| Auth | `src/components/auth/LoginView.jsx` | `api/modules/users_access` | `users` | `POST /api/login.php`, `POST /api/logout.php` |
| Uploads | Sales + admin profile components | top-level upload endpoints | filesystem (`api/uploads/`) | `POST /api/upload.php`, `POST /api/upload_logo.php` |

## Canonical Edit Paths
- Frontend business changes: `src/modules/<module>/*`
- Shared frontend runtime/shell: `src/kernel/*`, `src/services/*`, `src/hooks/*`, `src/components/*`
- Backend business handlers: `api/modules/<module>/*`
- Thin endpoint wrappers: `api/*.php`
- Backend shared helpers for module internals: `api/modules/<module>/*_helpers.php`, `api/common/*`

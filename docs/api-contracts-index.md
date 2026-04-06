# API Contracts Index

Compact navigation index for runtime API contracts.

## Authoritative Sources
- Architecture/security invariants: `ARCHITECTURE.md`
- Contract registry and stable IDs: `MODULE_CONTRACTS.md`
- Machine-readable request/response schemas: `contracts/schemas/*.json`
- Generated frontend types: `src/types/api-contracts.generated.js`
- Concrete payload fixtures: `examples/*.json`

## Endpoint Families
- Bootstrap/auth/session:
  - `GET /api/bootstrap.php`
  - `POST /api/login.php`
  - `POST /api/logout.php`
- Sales:
  - `GET|POST|PUT|PATCH|DELETE /api/orders.php`
- Customers:
  - `GET|POST|PUT|PATCH /api/customers.php`
  - `GET|POST|PUT|PATCH /api/customer_projects.php`
  - `GET|POST|PUT|PATCH /api/customer_project_contacts.php`
- Human resources:
  - `GET|POST|PUT|PATCH|DELETE /api/hr_employees.php`
- Inventory V2:
  - `GET|POST|PUT|PATCH /api/inventory_v2_products.php`
  - `GET|POST|PUT|PATCH /api/inventory_v2_warehouses.php`
  - `GET|POST|PUT|PATCH /api/inventory_v2_locations.php`
  - `GET|POST|PUT|PATCH /api/inventory_v2_lots.php`
  - `GET|POST|PUT|PATCH /api/inventory_v2_operations.php`
  - `GET|POST|PATCH /api/inventory_v2_reservations.php`
  - `GET|POST|PUT|PATCH /api/inventory_v2_replenishment.php`
  - `GET /api/inventory_v2_reports.php`
  - Notes:
    - The current UI groups inventory into four workspaces: `کالاها`, `عملیات`, `موجودی و گزارش‌ها`, `تنظیمات`.
    - `inventory_v2_operations.php` supports `production_consume` and `production_output`; legacy-compatible `production_move` remains accepted but is hidden from the main UI.
    - `inventory_v2_reservations.php` remains a contract anchor, but manual reservation management is currently treated as an internal/support workflow rather than a general-user screen.
- Accounting:
  - `GET|POST|PUT|PATCH|DELETE /api/acc_payroll.php`
  - `POST /api/acc_payroll_import.php`
  - `GET|POST /api/acc_settings.php?key=accounting.payroll.settings`
  - `GET|POST|PUT|PATCH /api/acc_accounts.php`
  - `GET|POST|PUT|PATCH /api/acc_vouchers.php`
  - `GET|POST|PUT|PATCH /api/acc_fiscal_years.php`
  - `GET /api/acc_reports.php`
  - `GET|POST /api/acc_sales_bridge.php`
- Master data/profile:
  - `GET|POST /api/catalog.php`
  - Notes:
    - `catalog` includes pricing metadata such as `factoryLimits` and ordered `jumboRules` for billable-area and jumbo-stage calculations.
  - `GET|POST /api/profile.php`
  - `POST /api/master_data_operation_icon_upload.php`
- Users and control plane:
  - `GET|POST|PUT|PATCH /api/users.php`
  - `GET|POST /api/role_permissions.php`
  - `GET|PATCH /api/module_registry.php`
  - `GET /api/audit_logs.php`
- Uploads:
  - `POST /api/upload.php`
  - `POST /api/upload_logo.php`

## Contract Discipline
- Auth and CSRF are mandatory on mutating protected endpoints.
- Keep endpoint wrappers thin; module handlers own business rules.
- If endpoint behavior changes, update schemas + contract docs in the same change.

# API Contracts Index

This index links endpoint behavior, request/response examples, permissions, and machine-readable schemas.

## Core Contract Sources

- Human-readable contracts: `MODULE_CONTRACTS.md`
- Architecture rules: `ARCHITECTURE.md`
- JSON Schemas: `contracts/schemas/*.json`
- Generated frontend types: `src/types/api-contracts.generated.js`
- Concrete examples: `examples/*.json`

## Endpoint Matrix

| Endpoint | Auth | CSRF | Permission | Schema / Examples |
|---|---|---|---|---|
| `GET /api/bootstrap.php` | optional | no | n/a | `examples/bootstrap.response.json` |
| `GET|POST|PUT|PATCH|DELETE /api/orders.php` | role-dependent | yes on write | sales permissions | `contracts/schemas/orders.*.schema.json`, `examples/orders.*.json` |
| `GET|POST|PUT|PATCH /api/customers.php` | protected | yes on write | `customers.read` / `customers.write` | customers contracts in `MODULE_CONTRACTS.md` |
| `GET|POST|PUT|PATCH /api/customer_projects.php` | protected | yes on write | `customers.read` / `customers.write` | customers contracts in `MODULE_CONTRACTS.md` |
| `GET|POST|PUT|PATCH /api/customer_project_contacts.php` | protected | yes on write | `customers.read` / `customers.write` | customers contracts in `MODULE_CONTRACTS.md` |
| `GET|POST|PUT|PATCH /api/hr_employees.php` | protected (`admin`/`manager`) | yes on write | `human_resources.employees.read` / `human_resources.employees.write` | human resources contracts in `MODULE_CONTRACTS.md` |
| `GET|POST|PUT|PATCH /api/inventory_v2_products.php` | protected (`admin`/`manager`) | yes on write | `inventory.v2_products.read/write` | `contracts/schemas/inventory.v2.products.upsert.request.schema.json` |
| `GET|POST|PUT|PATCH /api/inventory_v2_warehouses.php` | protected (`admin`/`manager`) | yes on write | `inventory.v2_warehouses.read/write` | `contracts/schemas/inventory.v2.warehouses.upsert.request.schema.json` |
| `GET|POST|PUT|PATCH /api/inventory_v2_locations.php` | protected (`admin`/`manager`) | yes on write | `inventory.v2_locations.read/write` | `contracts/schemas/inventory.v2.locations.upsert.request.schema.json` |
| `GET|POST|PUT|PATCH /api/inventory_v2_lots.php` | protected (`admin`/`manager`) | yes on write | `inventory.v2_lots.read/write` | `contracts/schemas/inventory.v2.lots.upsert.request.schema.json` |
| `GET|POST|PUT|PATCH /api/inventory_v2_operations.php` | protected (`admin`/`manager`) | yes on write | `inventory.v2_operations.read/write` | `contracts/schemas/inventory.v2.operations.create.request.schema.json`, `contracts/schemas/inventory.v2.operations.action.request.schema.json` |
| `GET|POST|PATCH /api/inventory_v2_reservations.php` | protected (`admin`/`manager`/`sales`) | yes on write | `inventory.v2_operations.read/write` | `contracts/schemas/inventory.v2.reservations.create.request.schema.json` |
| `GET|POST|PUT|PATCH|DELETE /api/acc_payroll.php` | protected (`admin`/`manager`) | yes on write | `accounting.payroll.read` / `accounting.payroll.write` / `accounting.payroll.approve` / `accounting.payroll.issue` / `accounting.payroll.payments` / `accounting.payroll.record_payment` | `contracts/schemas/accounting.payroll.create.request.schema.json`, `contracts/schemas/accounting.payroll.update.request.schema.json`, `contracts/schemas/accounting.payroll.action.request.schema.json` (includes `finalize_period` and `reopen_period`), `contracts/schemas/accounting.payroll.workspace.response.schema.json` (workflow read model), `contracts/schemas/accounting.payroll.action.bulk.response.schema.json` |
| `GET|POST /api/acc_settings.php?key=accounting.payroll.settings` | protected (`admin`/`manager`) | yes on POST | `accounting.payroll.settings` | accounting settings contract in `MODULE_CONTRACTS.md` |
| `POST /api/acc_payroll_import.php` | protected (`admin`/`manager`) | yes | `accounting.payroll.write` / `accounting.payroll.import` | `contracts/schemas/accounting.payroll.import.request.schema.json`, `contracts/schemas/accounting.payroll.import.preview.response.schema.json` |
| `GET|POST /api/catalog.php` | GET public, POST protected | POST yes | `master_data.catalog.write` | `contracts/schemas/catalog.save.request.schema.json`, `examples/catalog.save.request.json` |
| `GET|POST /api/profile.php` | read/write protected in runtime | POST yes | `profile.read` / `profile.write` | profile shape in bootstrap + API docs |
| `POST /api/master_data_operation_icon_upload.php` | protected | yes | `master_data.catalog.write` | operation icon upload response shape from runtime |
| `GET|POST|PUT|PATCH /api/users.php` | protected | yes on write | `users_access.users.read/write` | users-access contract in `MODULE_CONTRACTS.md` |
| `GET|POST /api/role_permissions.php` | protected | POST yes | `users_access.users.read/write` | users-access contract in `MODULE_CONTRACTS.md` |
| `GET|PATCH /api/module_registry.php` | owner-only | PATCH yes | owner guard + kernel contract | kernel contract in `MODULE_CONTRACTS.md` |
| `GET /api/audit_logs.php` | protected | no | `kernel.audit.read` | kernel contract in `MODULE_CONTRACTS.md` |
| `POST /api/login.php` | public | yes | n/a | auth contract in bootstrap/login responses |
| `POST /api/logout.php` | session | yes | n/a | auth contract in bootstrap/logout behavior |
| `POST /api/upload.php` | protected | yes | order/profile write context | upload response shape from runtime |
| `POST /api/upload_logo.php` | protected | yes | `profile.write` | upload response shape from runtime |

## Contract Maintenance Notes

- 2026-03-12: Refactored internal PHP helper structure (`api/common/*`, `api/modules/users_access/*`) with no public endpoint, permission, or schema shape changes.

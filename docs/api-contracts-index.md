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
| `GET /api/inventory_warehouses.php` | protected | no | `inventory.warehouses.read` | inventory contracts in `MODULE_CONTRACTS.md` |
| `GET|POST|PUT|PATCH /api/inventory_items.php` | protected | yes on write | `inventory.items.read/write` | `contracts/schemas/inventory.items.upsert.request.schema.json` |
| `GET|POST|PATCH /api/inventory_documents.php` | protected | yes on write | `inventory.documents.read/write` | `contracts/schemas/inventory.documents.create.request.schema.json` |
| `GET|POST|PATCH /api/inventory_requests.php` | protected | yes on write | `inventory.requests.*` | `contracts/schemas/inventory.requests.create.request.schema.json`, `contracts/schemas/inventory.requests.patch.request.schema.json` |
| `GET|POST|PATCH /api/inventory_counts.php` | protected | yes on write | `inventory.counts.*` | `contracts/schemas/inventory.counts.command.request.schema.json` |
| `GET /api/inventory_reports.php` | protected | no | `inventory.reports.read` | report query shape in `MODULE_CONTRACTS.md` |
| `GET|POST|PUT|PATCH /api/inventory_v2_products.php` | protected (`admin`/`manager`) | yes on write | `inventory.v2_products.read/write` | `contracts/schemas/inventory.v2.products.upsert.request.schema.json` |
| `GET|POST|PUT|PATCH /api/inventory_v2_warehouses.php` | protected (`admin`/`manager`) | yes on write | `inventory.v2_warehouses.read/write` | `contracts/schemas/inventory.v2.warehouses.upsert.request.schema.json` |
| `GET|POST|PUT|PATCH /api/inventory_v2_locations.php` | protected (`admin`/`manager`) | yes on write | `inventory.v2_locations.read/write` | `contracts/schemas/inventory.v2.locations.upsert.request.schema.json` |
| `GET|POST|PUT|PATCH /api/inventory_v2_lots.php` | protected (`admin`/`manager`) | yes on write | `inventory.v2_lots.read/write` | `contracts/schemas/inventory.v2.lots.upsert.request.schema.json` |
| `GET|POST /api/catalog.php` | GET public, POST protected | POST yes | `master_data.catalog.write` | `contracts/schemas/catalog.save.request.schema.json`, `examples/catalog.save.request.json` |
| `GET|POST /api/profile.php` | read/write protected in runtime | POST yes | `profile.read` / `profile.write` | profile shape in bootstrap + API docs |
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

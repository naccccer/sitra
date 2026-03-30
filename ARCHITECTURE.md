# Sitra ERP Architecture Rulebook

## 1) Purpose and Authority
- This file is the source of truth for non-negotiable architecture decisions.
- Supporting authority hierarchy:
  - `MODULE_CONTRACTS.md` for public contract shape and compatibility.
  - `docs/code-map.md` for the current active module map and ownership.
  - `docs/ROADMAP.md` for future work only.
- All changes must comply with these rules unless this file is updated first.

## 2) Non-Negotiable Decisions
- Architecture style: **Modular Monolith**.
- Tenant model: **Single-tenant deployment per customer**.
- Dependency direction: **Kernel <- Modules** only.
- Cross-module communication: **contracts/services only**.
- Migration strategy: **Incremental Strangler**.
- Backward compatibility: existing frontend contract remains functional during migration.

## 3) System Topology

### 3.1 Kernel (Shared Core)
- Owns auth/session, CSRF, response conventions, audit logging, permission primitives, module registry.
- Must not contain business logic from domain modules.
- JSON API responses are emitted with `no-store` cache headers so list views do not keep stale rows after mutations or direct database changes.

### 3.2 Business Modules
- `master-data`
  - Catalog and pricing reference data.
  - Business profile settings.
- `sales`
  - Orders, order items payload, invoice/payment context.
- `customers`
  - Customer registry, customer projects, and project contacts.
- `human-resources`
  - Employee directory and other HR-owned reference data.
- `accounting`
  - Payroll workspace, accounting settings, and accounting-owned ledger/account tables.
  - May consume HR and sales data only through contracts, read models, or compatibility adapters.
- `inventory`
  - Inventory V2 foundation masters (products, warehouses, locations, lots) and V2 stock model tables.
  - Operation lifecycle (receipt/delivery/transfer/adjustment), posting engine, immutable stock ledger, no-negative stock enforcement.
  - Reservation subsystem (reserve/release/fulfill), production operation types (`production_consume`, `production_output`), delivery-fulfills-reservation integration.
- `users-access`
  - Users, role assignment, activation/deactivation.

### 3.3 Reserved Scaffolds
- `production`
  - Reserved for future scope.
  - Must remain inactive until contracts, routes, and migration plan are documented.

## 4) Hard Dependency Rules
- Allowed:
  - Module -> Kernel
  - Frontend module -> frontend kernel/shared
  - API adapter -> module service
- Forbidden:
  - Module -> module internal imports
  - Module -> other module private tables
  - Cross-module UI imports of private internals

## 5) Data Ownership
- Each table has exactly one owning module.
- Only the owner module writes to its tables.
- Cross-module reads/writes must go through contracts.

## 6) Workflow and State Constraints
- Sales external order status is limited to:
  - `pending`
  - `processing`
  - `delivered`
  - `archived`
- Inventory V2 operation status lifecycle:
  - `draft` -> `submitted` -> `approved` -> `posted`
  - Any non-posted status -> `cancelled`
  - Only `approved` operations may be posted; posting is irreversible.
  - Stock mutations and ledger writes occur exclusively at post time.
- Inventory V2 reservation lifecycle:
  - `active` -> `fulfilled` | `released`
  - Creating a reservation increments `quantity_reserved` in quants.
  - Delivery posting fulfills matching active reservations and releases reserved quantity.

## 7) API Contract Rules
- Core endpoints remain operational:
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
- `bootstrap` extensions must be additive.
- `bootstrap.session` identity fields include `username`, `fullName`, `jobTitle`, and `role`.
- All mutating operations enforce CSRF and auth.
- Frontend requests keep `credentials: include`.

## 8) Security and Access Control
- Authorization is server-side.
- Valid roles are exactly: `admin`, `manager`, `sales`.
- `admin` is reserved for System Owner/Support.
- Owner-only control plane:
  - `module_registry` is restricted to owner (`admin` + `APP_OWNER_UID`).

## 9) Frontend Constraints
- Frontend structure converges to:
  - `src/kernel/*`
  - `src/modules/<module-name>/*`
- Shared UI belongs to neutral shared/kernel layers.
- RTL and Persian UX compatibility are mandatory.

## 10) Backend Constraints
- Backend structure converges to:
  - `api/modules/kernel/*`
  - `api/modules/<module-name>/*`
  - thin endpoint adapters in `api/*.php`

## 11) Quality Gates
- Encoding check: `npm run check:encoding`
- Naming check: `npm run check:naming`
- File-size budget check: `npm run check:file-size`
- Boundary check: `npm run check:boundaries`
- Lint: `npm run lint`
- Build: `npm run build`
- Manual smoke checks for affected scope.

## 12) Contract Artifacts
- Human-readable module contracts live in `MODULE_CONTRACTS.md`.
- Machine-readable API schemas live in `contracts/schemas/*.json`.
- Frontend generated contract typedefs live in `src/types/api-contracts.generated.js`.

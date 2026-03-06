# Sitra ERP Architecture Rulebook

## 1) Purpose and Authority
- This file is the source of truth for architecture decisions.
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

### 3.2 Business Modules
- `master-data`
  - Catalog and pricing reference data.
  - Business profile settings.
- `sales`
  - Orders, order items payload, invoice/payment context.
- `users-access`
  - Users, role assignment, activation/deactivation.

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
- Only owner module writes to its tables.
- Cross-module reads/writes must go through contracts.

## 6) Workflow and State Constraints
- Sales external order status is limited to:
  - `pending`
  - `processing`
  - `delivered`
  - `archived`

## 7) API Contract Rules
- Core endpoints remain operational:
  - `/api/bootstrap.php`
  - `/api/orders.php`
  - `/api/catalog.php`
  - `/api/profile.php`
  - `/api/users.php`
  - `/api/role_permissions.php`
  - `/api/module_registry.php`
  - `/api/login.php`, `/api/logout.php`
- `bootstrap` extensions must be additive.
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
  - `api/kernel/*`
  - `api/modules/<module-name>/*`
  - Thin endpoint adapters in `api/*.php`

## 11) Quality Gates
- Encoding check: `npm run check:encoding`
- Lint: `npm run lint`
- Build: `npm run build`
- Manual smoke checks for affected scope.

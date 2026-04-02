# Sitra ERP Architecture Rulebook

## 1) Authority
This file is the non-negotiable architecture source of truth.

Supporting hierarchy:
- `MODULE_CONTRACTS.md` (public contracts/compatibility)
- `docs/code-map.md` (current ownership and paths)
- `docs/ROADMAP.md` (future-only)

## 2) Core Decisions
- Architecture: **Modular Monolith**
- Tenant model: **single-tenant per customer**
- Dependency direction: **Kernel <- Modules**
- Cross-module interaction: **contracts/services only**
- Migration style: **incremental strangler**
- Backward compatibility: existing frontend contracts stay operational during migration

## 3) Topology
### Kernel (shared core)
Owns auth/session, CSRF, response conventions, permissions, audit logging, module registry.
Must not own business-domain logic.

### Active business modules
- `master-data`: catalog/profile settings
- `sales`: orders and order financial lifecycle
- `customers`: customers/projects/contacts
- `human-resources`: employee directory
- `accounting`: payroll/settings/ledgers (consumes other modules only via contracts/read models)
- `inventory`: V2 masters + operations + ledger + reservations
- `users-access`: users/roles/activation

### Reserved scaffold
- `production`: inactive until contracts/routes/migration are explicitly defined

## 4) Hard Dependency Rules
Allowed:
- Module -> Kernel
- Frontend module -> frontend kernel/shared
- API wrapper -> module service

Forbidden:
- Module -> other module internals
- Module -> other module private tables
- Cross-module UI imports of private internals

## 5) Data Ownership
- Each table has exactly one owner module.
- Only the owner writes to owned tables.
- Cross-module reads/writes go through contracts.

## 6) Locked Workflow/State Constraints
- Sales order status: `pending`, `processing`, `delivered`, `archived`
- Inventory operation lifecycle: `draft -> submitted -> approved -> posted`, non-posted may become `cancelled`
- Only `approved` operations may be posted; posting is irreversible
- Inventory reservation lifecycle: `active -> fulfilled | released`

## 7) API/Runtime Contract Invariants
- Core endpoint wrappers remain operational (bootstrap, orders, customers, HR, inventory v2, accounting, catalog/profile, users/permissions, module registry, auth).
- `bootstrap` additions must be additive.
- `bootstrap.session` identity includes: `username`, `fullName`, `jobTitle`, `role`.
- Mutations enforce auth + CSRF.
- Frontend requests use `credentials: include`.

## 8) Security and Access
- Authorization is server-side.
- Valid roles are exactly: `admin`, `manager`, `sales`.
- `admin` reserved for owner/support.
- `module_registry` is owner-only (`admin` + `APP_OWNER_UID`).

## 9) Structural Constraints
- Frontend target structure: `src/kernel/*`, `src/modules/<module>/*`
- Backend target structure: `api/modules/kernel/*`, `api/modules/<module>/*`, thin wrappers in `api/*.php`
- RTL and Persian UX compatibility are mandatory.

## 10) Quality Gates
- `npm run check:encoding`
- `npm run check:naming`
- `npm run check:file-size`
- `npm run check:boundaries`
- `npm run lint`
- `npm run build`
- manual smoke checks for affected scope

## 11) Contract Artifacts
- Human-readable: `MODULE_CONTRACTS.md`
- Schemas: `contracts/schemas/*.json`
- Generated frontend contract typedefs: `src/types/api-contracts.generated.js`

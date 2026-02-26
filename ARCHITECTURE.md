# Sitra ERP Architecture Rulebook

## 1) Purpose and Authority
- This document is the single source of truth for system architecture decisions in Sitra ERP.
- All future code changes must comply with these rules unless this file is explicitly updated first.
- Priority order for conflicts:
  1. `ARCHITECTURE.md`
  2. Repository-level agent rules (`AGENTS.md`)
  3. Local implementation preferences

## 2) Non-Negotiable Architecture Decisions
- Architecture style: **Modular Monolith**.
- Tenant model: **Single-Tenant deployment per customer**.
- Hosting direction: **On-prem multi-customer via separate deployments/databases**, not shared multi-tenant DB.
- Dependency direction: **Kernel <- Modules** only.
- Module-to-module interaction: **Service/API contracts only** (and explicit events when introduced), never direct table access.
- Industry extensibility: **Config-Driven templates** with guarded JSON DSL.
- Type safety path: strict JS contracts now + **strict JSDoc**; gradual TypeScript migration for new/refactored modules.
- Order tracking granularity in production: **Order Line Level**.
- ID strategy: internal numeric IDs (`BIGINT`) + public human-readable codes.
- Migration strategy: **Incremental Strangler** (no big-bang rewrite).
- Backward compatibility: existing frontend contract must remain functional during migration.

## 3) System Topology

### 3.1 Kernel (Shared Core)
- Owns:
  - Session auth and CSRF policy.
  - Request/response standards.
  - Permission enforcement primitives.
  - Audit logging primitives.
  - Module registry and capability exposure.
- Must not contain business logic for any specific module.

### 3.2 Business Modules
- `master-data`
  - Catalog and pricing reference data.
  - Shared operational definitions consumed by modules.
- `sales`
  - Orders, order items, customer-facing order intake, invoice/payment context.
  - Customer entity (CRM-lite scope).
- `production`
  - Work orders generated from released sales order lines.
  - Pattern file ownership and production stage tracking.
- `inventory`
  - Stock ledger, stock movements, reservations linked to released production demand.
- `users-access`
  - Users, role assignment, account activation/deactivation.

## 4) Hard Dependency and Import Rules
- Allowed:
  - Module -> Kernel
  - Frontend module -> Frontend kernel/shared
  - API endpoint adapter -> Module service
- Forbidden:
  - Module -> Module direct import of internal code.
  - Module -> Other module tables (direct SQL read/write).
  - UI component in one module importing private internals from another module.
- Cross-module communication must use:
  - Public module service contract, or
  - Explicitly documented integration event/command contract.

## 5) Data Ownership Laws

### 5.1 Ownership
- Each table has exactly one owning module.
- Only owner module writes to its tables.
- Non-owner modules access owner data through contract/API, not direct SQL.

### 5.2 Sales Data
- Keep `orders` stable for compatibility.
- Introduce normalized `order_items` while preserving historical/snapshot JSON representation for print/history compatibility.
- Payments remain in Sales in phase 1.

### 5.3 Production Data
- Work units are at **order line** level.
- Production module owns pattern file metadata and production stage history.

### 5.4 Inventory Data
- Inventory owns stock ledger, movement records, and reservation records.
- Reservation happens when order is explicitly released to production.

### 5.5 Templates
- Templates are stored in DB as active runtime config.
- Templates must support versioned export/import artifacts.

## 6) Workflow and State Constraints
- Sales external order status remains constrained to:
  - `pending`
  - `processing`
  - `delivered`
  - `archived`
- Status ownership is per module:
  - Each module may maintain internal stage/status models.
  - Sales exposes an aggregated view without owning all internal module states.
- Release rule:
  - Sales -> Production handoff requires explicit release action.
  - No implicit auto-release at order creation.
- Inventory reservation timing:
  - At production release, not at initial order creation.

## 7) API Contract Rules
- Existing endpoints remain operational during migration:
  - `/api/bootstrap.php`
  - `/api/orders.php`
  - `/api/catalog.php`
  - `/api/profile.php`
  - `/api/users.php`
  - `/api/login.php`, `/api/logout.php`
- New module endpoints are additive and must not break existing consumers.
- `bootstrap` may be extended only additively (`capabilities`, `permissions`, `modules`), not by removing current fields.
- All mutating operations must enforce CSRF and auth rules in backend.
- Frontend requests must keep `credentials: include`.

## 8) Security and Access Control Rules
- Authorization is enforced server-side only; UI checks are convenience, not security.
- Role model target includes: `admin`, `manager`, `sales`, `production`, `inventory`.
- During migration, legacy roles remain valid and must map to effective permissions.
- Critical actions requiring audit log:
  - Order status changes and destructive order actions.
  - Catalog/pricing changes.
  - User and role changes.
  - Authentication session boundary events (login/logout failures/success where applicable).

## 9) Template and Rules Engine Constraints
- Template system is config-driven, not code-fork driven.
- Rules are expressed via guarded JSON DSL (whitelisted operations, validated schema).
- Template execution must be deterministic and side-effect controlled.
- No arbitrary code execution from template payloads.

## 10) Frontend Architecture Constraints
- Frontend structure must converge to:
  - `src/kernel/*`
  - `src/modules/<module-name>/*`
- Global app shell may orchestrate module routes, but module state and logic stay within module boundaries.
- Shared UI belongs to neutral shared/kernel layers only.
- `dir="rtl"` and Persian UX compatibility are mandatory.

## 11) Backend Architecture Constraints
- Backend structure must converge to:
  - `api/kernel/*`
  - `api/modules/<module-name>/*`
  - Thin endpoint adapters in `api/*.php` for backward compatibility.
- Shared helper growth in monolithic `_common.php` is transitional; new shared primitives belong in kernel modules.

## 12) JSDoc and Type Contract Strictness
- For JavaScript files, strict JSDoc is mandatory for:
  - Public module services.
  - DTO/contract objects crossing module boundaries.
  - Non-trivial pure business functions.
- Required JSDoc coverage:
  - `@typedef` (or equivalent object contract docs) for payloads.
  - `@param`, `@returns`, and error behavior for public functions.
  - Domain invariants and units where ambiguity exists (money, dimensions, counts).
- New/refactored modules may be authored in TypeScript incrementally, but must keep boundary contracts explicit either way.

## 13) Quality Gates (Mandatory Before Finishing Work)
- Encoding check:
  - `npm run check:encoding`
- Lint:
  - `npm run lint`
- Build:
  - `npm run build`
- Manual smoke checks for affected scope:
  - Customer order submission.
  - Staff login and order visibility.
  - Status update and archive/unarchive flow.
  - Settings persistence through bootstrap.

## 14) Change Control Checklist
- Before implementing any feature:
  - Identify target module owner.
  - Confirm no forbidden dependency edge is introduced.
  - Confirm data ownership remains single-owner.
  - Confirm API compatibility impact.
  - Add/update contract docs and JSDoc/TS types.
  - Add/update audit points if action is critical.
- If any rule above must be violated:
  - Update `ARCHITECTURE.md` first with explicit rationale and migration plan.

## 15) Explicit Anti-Patterns (Do Not Introduce)
- Direct SQL reads/writes into another module's private tables.
- Global god-state carrying all business domains without module boundaries.
- Template logic implemented via hard forks per industry.
- Business-critical rules hidden only in UI with no backend enforcement.
- New large cross-domain files that merge multiple module responsibilities.


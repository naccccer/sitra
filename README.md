# Sitra ERP

Sitra is an RTL-first ERP focused on order intake and sales operations.

## Start Here (Human + AI)

Read in this order:

1. `ARCHITECTURE.md` (hard architectural rules)
2. `MODULE_CONTRACTS.md` (cross-module contracts)
3. `docs/code-map.md` (feature-to-code ownership map)
4. `AGENTS.md` and `docs/ai-playbook.md` (implementation guardrails)

Canonical edit paths:

- Frontend business logic: `src/modules/<module>/*`
- Shared frontend runtime: `src/kernel/*`, `src/services/*`, `src/hooks/*`
- Backend business handlers: `api/modules/<module>/*`
- Thin API wrappers: `api/*.php`

Module boundaries:

- Allowed: Module -> Kernel/shared
- Forbidden: Module -> other module internals
- Enforced by: `npm run check:boundaries`

## Architecture Authority

`ARCHITECTURE.md` is the source of truth for architecture rules.

Key locked decisions:
- Modular Monolith.
- Single-tenant deployment per customer.
- Dependency direction: `Kernel <- Modules`.
- Contract-first module boundaries (no direct cross-module table access).
- Config-driven templates.

## Current Product Scope

- Sales: order intake, lifecycle, invoice/payment context.
- Master Data: catalog/pricing and business profile.
- Users & Access: users, roles, permission matrix.
- Kernel/Auth: session, CSRF, audit, module registry.

## Tech Stack

- Frontend: React 19, Vite 7, Tailwind CSS 4, Lucide Icons.
- Backend: Plain PHP endpoints in `api/`.
- Database: MySQL/MariaDB.
- Auth: Cookie-based session auth with CSRF protection.

## Repository Layout

- `src/` frontend app (modules, kernel, shared components, services, hooks).
- `api/` PHP HTTP endpoints and shared helpers.
- `config/` environment and DB bootstrap.
- `database/schema.sql` baseline DB schema.
- `database/fixtures/minimal_fixture.sql` reproducible minimal dataset.
- `contracts/schemas/` machine-readable API contract schemas.
- `examples/` canonical request/response payload examples.

## Local Setup

1. Install dependencies:
```bash
npm ci --prefer-offline --no-audit --no-fund
# or: npm run deps:install
```

2. Create local environment file:
```bash
copy .env.example .env.local
```

3. Create database and import schema:
- Import `database/schema.sql` in MySQL/MariaDB.

4. Serve backend through Apache/PHP (XAMPP layout is expected for this repo).

5. Start frontend:
```bash
npm run dev
```

6. Optional: reset to minimal reproducible dataset:
```bash
npm run db:reset-minimal
```

## Local Login

- Seed credentials after importing `database/schema.sql`:
  - `username: admin`
  - `password: admin123`
- Reset admin credentials if needed:
```bash
npm run auth:reset-admin
```

## Runtime Notes

- Frontend bootstraps from `GET /api/bootstrap.php`.
- Requests use `credentials: include`.
- Module registry control plane is Owner-only (`admin` + `APP_OWNER_UID`).
- Catalog is persisted in `system_settings` with key `catalog`.
- Orders are stored in `orders` with JSON payload (`items_json`).
- Valid order statuses are exactly: `pending`, `processing`, `delivered`, `archived`.

## Main API Endpoints

- `GET /api/bootstrap.php`
- `GET|POST|PUT|PATCH|DELETE /api/orders.php`
- `GET|POST /api/catalog.php`
- `GET|POST /api/profile.php`
- `GET|POST|PUT|PATCH /api/users.php`
- `GET|POST /api/role_permissions.php`
- `GET|PATCH /api/module_registry.php`
- `GET /api/audit_logs.php`
- `POST /api/login.php`
- `POST /api/logout.php`
- `POST /api/upload.php`
- `POST /api/upload_logo.php`

## Validation and Tests

For small scoped changes:
```bash
npm run verify:fast
```

For cross-module/backend contract changes:
```bash
npm run verify:safe
```

Direct test commands:

```bash
npm run test
npm run test:coverage
npm run test:php
npm run test:all
```

## Additional Docs

- `docs/api-contracts-index.md`
- `docs/naming-conventions.md`
- `docs/ai-playbook.md`
- `docs/adr/README.md`
- `docs/golden-paths.md`
- `docs/api-usage.md`

## Manual Smoke Checks

- Customer can create an order.
- Staff can log in and view orders.
- Staff can update status and archive/unarchive orders.
- Admin/settings persist and reload through bootstrap.
- Users/roles only show `admin`, `manager`, `sales`.

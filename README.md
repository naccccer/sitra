# Sitra ERP

Sitra is an RTL-first ERP focused on order intake and sales operations.

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

- `src/` frontend app (pages, components, routes, services, hooks, utils).
- `api/` PHP HTTP endpoints and shared helpers.
- `config/` environment and DB bootstrap.
- `database/schema.sql` baseline DB schema.
- `database/destructive-domain-cleanup.sql` one-time destructive cleanup script.
- `public/icons/operations/` operation icon assets.

## Local Setup

1. Install dependencies:
```bash
npm install
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
- Valid order statuses are exactly:
  - `pending`
  - `processing`
  - `delivered`
  - `archived`

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

## Validation

For small scoped changes:
```bash
npm run verify:fast
```

For cross-module/backend contract changes:
```bash
npm run verify:safe
```

## Manual Smoke Checks

- Customer can create an order.
- Staff can log in and view orders.
- Staff can update status and archive/unarchive orders.
- Admin/settings persist and reload through bootstrap.
- Users/roles only show `admin`, `manager`, `sales`.

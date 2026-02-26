# Sitra ERP

Sitra is an RTL-first ERP application currently focused on glass factory operations, with a modular foundation for future industry expansion.

## Architecture Authority

`ARCHITECTURE.md` is the strict architectural rulebook for this repository.

Key locked decisions:
- Modular Monolith.
- Single-tenant deployment per customer.
- Dependency direction: `Kernel <- Modules`.
- Module communication through contracts/APIs only (no direct cross-module table access).
- Config-driven industry templates.
- Strict JSDoc contracts with gradual TypeScript migration.
- Production tracking at order-line level.

If this README and `ARCHITECTURE.md` ever conflict, follow `ARCHITECTURE.md`.

## Current Product Scope

- Sales (active): order intake, order lifecycle, invoice/payment context.
- Production (active foundation): line-level work orders and release intake endpoint.
- Inventory (skeleton route exists, domain expansion in progress).
- Admin settings (catalog/profile/users).

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
- `public/icons/operations/` operation icon assets.
- `ARCHITECTURE.md` system context and architectural laws.
- `AGENTS.md` repository-specific coding agent guidance.

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
- Import `database/schema.sql` in MySQL/MariaDB (for example via phpMyAdmin).

4. Serve backend through Apache/PHP (XAMPP layout is expected for this repo).

5. Start frontend:
```bash
npm run dev
```

## Local Login

- Seed credentials after importing `database/schema.sql`:
  - `username: admin`
  - `password: admin123`
- If login credentials are unknown, reset admin quickly:
```bash
npm run auth:reset-admin
```
- Optional custom reset (username and password):
```bash
php scripts/reset-admin-password.php admin mynewpass123
```

## Runtime Notes

- Frontend bootstraps from `GET /api/bootstrap.php`.
- Requests use `credentials: include`.
- Catalog is persisted in `system_settings` with key `catalog`.
- Orders are stored in `orders` with JSON payload (`items_json`) and compatibility helpers for legacy shape.
- Production release creates line-level rows in `order_lines` and `production_work_orders`.
- Valid order statuses are exactly:
  - `pending`
  - `processing`
  - `delivered`
  - `archived`

## Main API Endpoints

- `GET /api/bootstrap.php`
- `GET|POST|PUT|PATCH|DELETE /api/orders.php`
- `GET|POST /api/production.php`
- `GET|POST /api/catalog.php`
- `GET|POST /api/profile.php`
- `GET|POST|PUT|PATCH /api/users.php`
- `POST /api/login.php`
- `POST /api/logout.php`
- `POST /api/upload.php`
- `POST /api/upload_logo.php`

## Development Rules (Short Form)

- Keep diffs focused and minimal.
- Preserve RTL behavior and Persian text safety (UTF-8, LF).
- Reuse shared backend helpers where applicable.
- Use prepared SQL statements for user input.
- Keep API compatibility during modular migration.
- Do not introduce cross-module coupling that violates architecture boundaries.

## Required Checks Before Finishing Changes

```bash
npm run check:encoding
npm run check:boundaries
npm run lint
npm run build
```

## Manual Smoke Checks (Minimum)

- Customer can create an order.
- Staff can log in and view orders.
- Staff can update status and archive/unarchive orders.
- Admin/settings persist and reload through bootstrap.

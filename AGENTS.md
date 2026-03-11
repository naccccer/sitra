# AGENTS.md

Guidance for coding agents working in this repository.

## Scope
- This project is a React + Vite frontend with a PHP API backend and MySQL storage.
- The app is RTL-first and uses Persian content in many UI labels.

## Tech Stack
- Frontend: React 19, Vite 7, Tailwind CSS 4, Lucide icons.
- Backend: Plain PHP endpoints under `api/` with shared helpers in `api/_common.php`.
- Database: MySQL/MariaDB (schema in `database/schema.sql`).
- Env loading: `config/env.php` (reads `.env`, `.env.local`, and `config/` variants).

## Directory Map
- `src/`: React app UI, hooks, helpers, API client.
- `src/modules/`: Business modules — `sales`, `master-data`, `users-access`. Each has `components/`, `pages/`, `hooks/`, `services/`, `index.js`.
- `src/kernel/`: Shared auth, audit, module registry UI components. Modules may import from kernel, never the reverse.
- `src/components/`: Shared UI components used across modules.
- `src/services/`: Global HTTP client (`api.js`), offline queue (`salesOfflineQueue.js`), bootstrap cache.
- `src/hooks/`: Shared hooks (not module-specific).
- `api/modules/`: PHP module handlers — `kernel/`, `sales/`, `master_data/`, `users_access/`.
- `api/_common.php`: All shared PHP helpers. Required by every endpoint.
- `config/`: env/db bootstrap.
- `database/schema.sql`: baseline tables (`users`, `system_settings`, `orders`, `module_registry`, `audit_logs`, `order_request_idempotency`).
- `public/icons/operations/`: operation icons referenced by catalog settings.

## Local Setup
1. Install dependencies:
```bash
npm ci --prefer-offline --no-audit --no-fund
# or: npm run deps:install
```
2. Create local env:
```bash
copy .env.example .env.local
```
3. Ensure MySQL database exists and import:
```bash
database/schema.sql
```
4. Serve backend through Apache/PHP (XAMPP path layout is expected for this repo).
5. Start frontend:
```bash
npm run dev
```

## Validation Modes

Use `verify:fast` for small, isolated JS changes. Use `verify:safe` for anything touching PHP, schema, API contracts, or cross-module logic.

- Fast mode (JS-only, localized changes):
```bash
npm run verify:fast
```
- Safe mode (PHP / schema / API contract / cross-module / release-facing changes):
```bash
npm run verify:safe
```
- If the user explicitly asks for full checks, always run safe mode even for small changes.

**When in doubt, run safe mode.**

## File Size Budget

- **No file should exceed 300 lines.** If a file you're editing grows beyond 300 lines, split it.
- PHP: extract a new file in `api/common/` and `require_once` it from `_common.php`.
- JS/JSX: extract a hook (`src/hooks/`) or service (`src/services/`) and import it.
- This budget applies to NEW files and to any file you significantly modify.

## Path Aliases (Vite)

Use these aliases for new code. Do **not** rewrite existing relative imports — only use aliases in new files or new lines:

| Alias | Resolves to |
|-------|-------------|
| `@/` | `src/` |
| `@kernel/` | `src/kernel/` |
| `@components/` | `src/components/` |
| `@services/` | `src/services/` |
| `@hooks/` | `src/hooks/` |

Module-scoped aliases (`@sales/`, `@master-data/`, `@users-access/`) are **intentionally absent** — the ESLint boundary rules enforce module isolation via file paths; adding module aliases would bypass those checks.

## How to Add a New API Endpoint

1. Create `api/modules/<module>/my_endpoint.php` — copy the structure of an existing handler.
2. At the top of the file, always:
   ```php
   require_once __DIR__ . '/../../_common.php';
   require_once __DIR__ . '/../../config/db.php';
   app_install_exception_handler();
   app_start_session();
   app_send_cors_headers();
   app_handle_preflight(['GET', 'POST']);
   app_require_method(['GET', 'POST']);
   ```
3. Add auth guard immediately after: `$user = app_require_auth(['admin', 'manager']);`
4. Add permission guard: `app_require_permission('module.resource.action', $pdo);`
5. Create a public thin wrapper at `api/my_endpoint.php`:
   ```php
   <?php require_once __DIR__ . '/modules/<module>/my_endpoint.php';
   ```
6. Update `ARCHITECTURE.md` and `MODULE_CONTRACTS.md` with the new endpoint.
7. Run `npm run verify:safe`.

**Rules:**
- Use prepared statements for ALL SQL — no string interpolation with user input.
- Return JSON via `app_json($payload, $statusCode)`.
- Log mutations via `app_audit_log(...)`.
- Never skip `app_require_csrf()` on state-changing methods (POST, PUT, PATCH, DELETE).

## How to Add a New React Component

1. Determine scope:
   - Module-specific → `src/modules/<module>/components/`
   - Shared across modules → `src/components/shared/`
   - Admin UI → `src/components/admin/`
   - Customer-facing → `src/components/customer/`
2. Use `@components/` or relative imports. Never import from another module's `components/` directory.
3. RTL checklist:
   - Use `dir="rtl"` only on root containers — children inherit it automatically.
   - Tailwind directional utilities: use `start/end` instead of `left/right` (e.g., `ps-4`, `me-2`).
   - Text alignment: prefer `text-start` and `text-end` over `text-left` / `text-right`.
   - Icons: flip directional icons with `scale-x-[-1]` for RTL where needed.
4. Use Vazirmatn font class (already globally applied).
5. Run `npm run verify:fast` after component changes.

## Key Runtime Behavior
- Frontend bootstraps from `GET /api/bootstrap.php`.
- Session auth is cookie-based (`credentials: include` on fetches).
- Catalog is stored as JSON in `system_settings.setting_key = 'catalog'`.
- Orders are stored in `orders` with JSON payload in `items_json` (legacy `items` compatibility is preserved in helpers).
- Valid order statuses are exactly:
  - `pending`
  - `processing`
  - `delivered`
  - `archived`
- CSRF token is fetched via bootstrap and stored in `src/services/api.js`. It is automatically injected on POST/PUT/PATCH/DELETE.

## API Contract Notes
- `GET /api/bootstrap.php`: public for catalog; includes orders only when authenticated.
- `GET /api/orders.php`: requires `admin` or `manager`.
- `POST /api/orders.php`: currently open for customer order submission.
- `PUT /api/orders.php`: requires `admin` or `manager`.
- `PATCH /api/orders.php`: requires `admin` or `manager`.
- `GET /api/catalog.php`: public.
- `POST /api/catalog.php`: requires `admin` or `manager`.
- `POST /api/login.php`: establishes session.
- `POST /api/logout.php`: destroys session.
- `POST /api/upload.php`: validates size/type and writes to `api/uploads/`. Field name: `patternFile`.
- `POST /api/upload_logo.php`: Field name: `logoFile`.

## Backend Editing Rules
- Reuse common helpers in `api/_common.php`:
  - `app_handle_preflight` — OPTIONS response
  - `app_require_method` — 405 guard
  - `app_json` — JSON response with CORS headers
  - `app_require_auth` — 401/403 guard
  - `app_require_csrf` — CSRF token validation
  - `app_require_permission` — RBAC permission guard
  - `app_orders_select_fields` — safe column list for SELECT
  - `app_orders_items_column` — detects correct items column name
  - `app_audit_log` — audit trail
- Use prepared statements for SQL writes/reads with user input.
- Keep CORS/session behavior intact for browser requests with credentials.
- If schema assumptions change, update both runtime compatibility logic and `database/schema.sql`.

## Frontend Editing Rules
- Keep RTL layout behavior (`dir="rtl"`) and Vazirmatn typography support.
- Prefer using `src/services/api.js` for API calls via module-local service facades (e.g., `src/modules/sales/services/salesApi.js`). Do NOT import `src/services/api.js` directly inside module components — use the module's own service layer.
- When changing order or catalog shapes, update both:
  - frontend state/form logic
  - backend serialization/deserialization
- Preserve print-related classes and behavior used by invoice views (`print-hide`, `printable-area`).

## Module Boundary Rules (Enforced by ESLint)
- A file inside `src/modules/sales/` CANNOT import from `src/modules/master-data/` or `src/modules/users-access/`.
- All modules CAN import from `src/kernel/`, `src/components/`, `src/services/`, `src/hooks/`, `src/utils/`.
- Each module exposes a public contract via its `index.js` — use that for any cross-module needs routed through kernel.
- Do NOT import `src/services/api` directly inside module components — use the module-local service facade.
- Violations are caught by `npm run check:boundaries` and `npm run lint`.

## Common AI Pitfalls
- **Cross-module imports**: Always check module boundaries before adding an import. When in doubt, route through kernel.
- **Missing CSRF on mutations**: Every PHP handler that accepts POST/PUT/PATCH/DELETE must call `app_require_csrf()` before processing the body.
- **Missing auth guard**: Every protected PHP handler must call `app_require_auth()` as the first thing after session/CORS setup.
- **Raw SQL with user input**: Never do `WHERE id = '$id'`. Always use `?` placeholders with prepared statements.
- **Wrong order status**: Only `pending`, `processing`, `delivered`, `archived` are valid. Do not invent new statuses.
- **Breaking RTL**: Do not use hardcoded `left`/`right` CSS for layout — use logical properties or Tailwind `start/end` variants.
- **Large files**: Do not let any file grow past 300 lines. Split proactively.

## Encoding and Text Safety
- Repository expects UTF-8 and LF line endings (`.editorconfig`).
- Do not introduce mojibake or mixed encodings.
- Run `npm run check:encoding` after text-heavy edits.

## Testing Guidance
- The repo has a lightweight automated test suite:
  - Frontend/unit: `tests/unit/*` via Vitest (`npm run test`).
  - Backend/PHP: `tests/php/*` via custom runner (`npm run test:php`).
- Run `npm run test:all` for full local confidence when touching contracts or backend logic.
- Minimum manual smoke checks after relevant changes:
  - Customer can create an order.
  - Staff can log in and view orders.
  - Staff can update status and archive/unarchive orders.
  - Admin/settings save persists and reloads via bootstrap.

## Change Philosophy
- Keep diffs focused and minimal.
- Avoid broad refactors unless requested.
- Do not add dependencies unless necessary for the requested task.

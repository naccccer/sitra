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
- `api/`: HTTP endpoints (`bootstrap.php`, `orders.php`, `catalog.php`, `login.php`, `logout.php`, `upload.php`).
- `config/`: env/db bootstrap.
- `database/schema.sql`: baseline tables (`users`, `system_settings`, `orders`).
- `public/icons/operations/`: operation icons referenced by catalog settings.

## Local Setup
1. Install dependencies:
```bash
npm install
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

## Required Commands Before Finishing
- Encoding guard:
```bash
npm run check:encoding
```
- Lint:
```bash
npm run lint
```
- Build:
```bash
npm run build
```

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
- `POST /api/upload.php`: validates size/type and writes to `api/uploads/`.

## Backend Editing Rules
- Reuse common helpers in `api/_common.php`:
  - `app_handle_preflight`
  - `app_require_method`
  - `app_json`
  - `app_require_auth`
  - `app_orders_select_fields`
  - `app_orders_items_column`
- Use prepared statements for SQL writes/reads with user input.
- Keep CORS/session behavior intact for browser requests with credentials.
- If schema assumptions change, update both runtime compatibility logic and `database/schema.sql`.

## Frontend Editing Rules
- Keep RTL layout behavior (`dir="rtl"`) and Vazirmatn typography support.
- Prefer using `src/services/api.js` for API calls; keep `credentials: include`.
- When changing order or catalog shapes, update both:
  - frontend state/form logic
  - backend serialization/deserialization
- Preserve print-related classes and behavior used by invoice views (`print-hide`, `printable-area`).

## Encoding and Text Safety
- Repository expects UTF-8 and LF line endings (`.editorconfig`).
- Do not introduce mojibake or mixed encodings.
- Run `npm run check:encoding` after text-heavy edits.

## Testing Guidance
- There is no formal test suite in this repo today.
- Minimum manual smoke checks after relevant changes:
  - Customer can create an order.
  - Staff can log in and view orders.
  - Staff can update status and archive/unarchive orders.
  - Admin/settings save persists and reloads via bootstrap.

## Change Philosophy
- Keep diffs focused and minimal.
- Avoid broad refactors unless requested.
- Do not add dependencies unless necessary for the requested task.

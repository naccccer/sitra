# CLAUDE.md

Guidance for AI assistants (Claude Code and similar) working in this repository.

## Project Overview

**Sitra** is a full-stack web application for **glass manufacturing order management**. It provides:
- A customer-facing order submission form
- Staff/admin dashboards for managing orders, users, catalog, and company settings
- RTL-first UI with Persian localization
- Print-ready invoice generation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, React Router 7, Lucide icons |
| Backend | Plain PHP (no framework), PDO for database access |
| Database | MySQL / MariaDB |
| Build | Vite with `@vitejs/plugin-react` and `@tailwindcss/vite` |
| Linting | ESLint 9 with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` |

## Directory Structure

```
sitra/
├── src/                         # React frontend
│   ├── pages/                   # Route-level page components
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── OrderCreatePage.jsx  # Public order submission
│   │   ├── OrderDetailPage.jsx
│   │   ├── OrdersPage.jsx       # Admin/manager order list
│   │   ├── AdminPage.jsx        # Admin settings + catalog
│   │   ├── ProfilePage.jsx
│   │   ├── UsersPage.jsx        # Admin-only user management
│   │   ├── InventoryPage.jsx
│   │   └── ProductionPage.jsx
│   ├── components/              # Reusable UI components
│   │   ├── MainLayout.jsx       # App shell (sidebar, header)
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── LoginView.jsx
│   │   ├── AdminOrdersView.jsx
│   │   ├── AdminSettingsView.jsx
│   │   ├── AdminUsersSettingsTab.jsx
│   │   ├── AdminProfileSettingsTab.jsx
│   │   ├── PatternFilesModal.jsx
│   │   ├── OrderForm.jsx        # Customer order form
│   │   ├── SettingsModal.jsx
│   │   ├── PrintInvoice.jsx     # Print-optimized invoice
│   │   ├── StructureDetails.jsx
│   │   └── PriceInput.jsx       # Normalized digit input
│   ├── services/
│   │   └── api.js               # HTTP client (15+ API methods, credentials: include)
│   ├── hooks/
│   │   └── usePricingCalculator.js  # Pricing logic hook
│   ├── utils/
│   │   ├── helpers.js
│   │   ├── invoice.js
│   │   └── profile.js
│   ├── data/
│   │   └── mockData.js          # Default catalog (glass types, pricing, operations)
│   ├── routes/
│   │   └── AppRoutes.jsx        # Route definitions with protected routes
│   └── main.jsx
├── api/                         # PHP backend endpoints
│   ├── _common.php              # Shared helpers and middleware
│   ├── bootstrap.php            # Initial data load (catalog, profile, session, orders)
│   ├── login.php
│   ├── logout.php
│   ├── check_session.php
│   ├── orders.php               # Order CRUD
│   ├── catalog.php              # Catalog config management
│   ├── profile.php              # Company profile persistence
│   ├── users.php                # User management (admin only)
│   ├── upload.php               # Pattern file uploads → api/uploads/
│   └── upload_logo.php          # Company logo uploads
├── config/
│   ├── env.php                  # .env loader (checks multiple paths)
│   └── db.php                   # PDO connection with multi-host fallback
├── database/
│   └── schema.sql               # Baseline tables: users, system_settings, orders
├── public/
│   └── icons/operations/        # SVG operation icons referenced by catalog
├── scripts/
│   └── check-encoding.js        # UTF-8/mojibake validator (runs before build/lint)
├── vite.config.js
├── tailwind.config.js
├── eslint.config.js
├── .env.example
├── .editorconfig
├── .htaccess                    # Apache rewrite rules for SPA routing
└── AGENTS.md
```

## Local Development Setup

1. **Install frontend dependencies:**
   ```bash
   npm install
   ```

2. **Create local env file:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your local database credentials and API path.

3. **Import the database schema:**
   ```sql
   -- In MySQL/MariaDB:
   SOURCE database/schema.sql;
   ```
   Default admin credentials after import: `admin` / `password` (bcrypt-upgraded on first login).

4. **Serve the PHP backend** via Apache/PHP (XAMPP layout expected). The `api/` directory must be reachable at the path set in `VITE_DEV_API_TARGET`.

5. **Start the frontend dev server:**
   ```bash
   npm run dev
   ```
   Runs on `http://127.0.0.1:5173` and proxies `/api/*` to `VITE_DEV_API_TARGET`.

## Key Environment Variables

Defined in `.env.local` (or `.env`, `config/.env`, etc. — see `config/env.php` for full search order):

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_DEV_API_TARGET` | `http://127.0.0.1:8000` | Vite dev proxy target for `/api` |
| `VITE_APP_BASE` | `/` | App base path for router and assets |
| `VITE_API_TIMEOUT_MS` | `10000` | Fetch timeout in milliseconds |
| `DB_HOST` | — | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_NAME` | — | Database name |
| `DB_USER` | — | Database user |
| `DB_PASS` | — | Database password |
| `DB_CHARSET` | `utf8mb4` | Connection charset |
| `APP_DEBUG` | `false` | Enable verbose PHP error output |

## Available npm Scripts

```bash
npm run dev             # Start Vite dev server with HMR
npm run build           # Encoding check → production build
npm run lint            # Encoding check → ESLint
npm run check:encoding  # UTF-8/mojibake validator only
npm run preview         # Preview the production build locally
```

## Required Checks Before Finishing Any Task

Run all three and ensure they pass with no errors:

```bash
npm run check:encoding
npm run lint
npm run build
```

## API Contract

### Auth model
- Session-based, cookie-backed. All frontend requests use `credentials: 'include'`.
- Roles: `admin` (full access) and `manager` (orders + catalog, no user management).

### Endpoints

| Method | Endpoint | Auth required | Notes |
|--------|----------|---------------|-------|
| `GET` | `/api/bootstrap.php` | Optional | Returns catalog + profile always; orders + session only when authenticated |
| `POST` | `/api/login.php` | None | Establishes session |
| `POST` | `/api/logout.php` | None | Destroys session |
| `GET` | `/api/check_session.php` | None | Returns current session state |
| `GET` | `/api/orders.php` | admin/manager | Fetch all orders |
| `POST` | `/api/orders.php` | None (public) | Customer order submission |
| `PUT` | `/api/orders.php` | admin/manager | Full order update |
| `PATCH` | `/api/orders.php` | admin/manager | Partial update (e.g., status change) |
| `DELETE` | `/api/orders.php` | admin/manager | Delete order |
| `GET` | `/api/catalog.php` | None (public) | Fetch catalog config |
| `POST` | `/api/catalog.php` | admin/manager | Save catalog config |
| `GET` | `/api/profile.php` | Optional | Fetch company profile |
| `POST` | `/api/profile.php` | admin/manager | Save company profile |
| `GET` | `/api/users.php` | admin | List users |
| `POST` | `/api/users.php` | admin | Create user |
| `PUT` | `/api/users.php` | admin | Update user |
| `PATCH` | `/api/users.php` | admin | Toggle user activation |
| `POST` | `/api/upload.php` | Authenticated | Upload pattern file → `api/uploads/` |
| `POST` | `/api/upload_logo.php` | Authenticated | Upload company logo |

### Order statuses
Valid values (enforced in backend and frontend):
- `pending`
- `processing`
- `delivered`
- `archived`

### Data shapes
- Catalog is stored as JSON in `system_settings` under `setting_key = 'catalog'`.
- Orders store line items in `items_json` column (longtext). Legacy `items` column compatibility is maintained via `app_orders_items_column()` in `_common.php`.

## Database Schema

```sql
users            -- id, username (unique), password (bcrypt), role (admin|manager), is_active
system_settings  -- setting_key (PK), setting_value (longtext JSON), updated_at
orders           -- id, order_code, customer_name, phone, order_date, total (bigint),
                 --   status, items_json, order_meta_json, created_at, updated_at
                 -- Indexes: idx_orders_status, idx_orders_created_at
```

## Backend Coding Rules

- **Always** call common helpers from `api/_common.php`:
  - `app_handle_preflight()` — CORS preflight
  - `app_require_method($method)` — validates HTTP method
  - `app_json($data, $code)` — sends JSON response
  - `app_require_auth($roles)` — checks session and role
  - `app_orders_select_fields()` — standard order column list
  - `app_orders_items_column()` — `items_json` / legacy `items` compatibility
- **Use prepared statements** for all SQL involving user input (PDO `prepare`/`execute`).
- **Do not break CORS or session behavior** — browsers send credentials; CORS headers must match the origin header exactly.
- **Update both** `database/schema.sql` and any runtime compatibility code when changing schema assumptions.
- **Passwords** are stored as bcrypt hashes; use `password_hash`/`password_verify`.

## Frontend Coding Rules

- **RTL layout:** the root element uses `dir="rtl"`. Do not remove this. Preserve Vazirmatn font classes.
- **API calls:** use `src/services/api.js`; keep `credentials: 'include'` on all fetch calls.
- **Order/catalog shape changes:** update both frontend state/form logic and backend serialization in the same change.
- **Invoice printing:** preserve print-related classes (`print-hide`, `printable-area`) and CSS media queries in `PrintInvoice.jsx`.
- **Number input:** `PriceInput.jsx` normalizes Persian/Arabic digits to ASCII — use it for all numeric inputs.
- **Icons:** operation icons are SVG files under `public/icons/operations/` and referenced by filename from catalog settings.

## Encoding and Text Safety

- All files must be **UTF-8**, **LF line endings**, **2-space indentation** (enforced by `.editorconfig`).
- The `check:encoding` script rejects mojibake and mixed encodings.
- Run `npm run check:encoding` after any edit that touches Persian text or string literals.

## Testing

There is no automated test suite. After changes, perform manual smoke tests:

- [ ] Customer can open the order form and submit an order
- [ ] Staff can log in and view the orders list
- [ ] Staff can change order status and archive/unarchive
- [ ] Admin settings (catalog, profile) save and reload correctly via bootstrap
- [ ] Invoice prints correctly (use browser print preview)

## Change Philosophy

- Keep diffs **focused and minimal** — only change what is needed.
- **No broad refactors** unless explicitly requested.
- **No new dependencies** unless the task clearly requires one.
- Prefer editing existing files over creating new ones.
- Do not add comments, docstrings, or type annotations to code you did not change.
- Do not add error handling for scenarios that cannot occur in normal use.

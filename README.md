# Sitra ERP

Sitra is an RTL-first modular ERP covering sales, customers, inventory, HR, accounting, master data, and access control workflows.

## Start Here
Read in this order:

1. `ARCHITECTURE.md`
2. `MODULE_CONTRACTS.md`
3. `docs/code-map.md`
4. `docs/guardrails.md`
5. `AGENTS.md`
6. `docs/ai-playbook.md`

`docs/ROADMAP.md` is forward-looking only. It is not the source of truth for the current module map.

## Current Active Modules
- `sales`
- `customers`
- `inventory`
- `human-resources`
- `accounting`
- `master-data`
- `users-access`
- `kernel` shared runtime

Inactive scaffolds:
- `production`

## Canonical Edit Paths
- Frontend business logic: `src/modules/<module>/*`
- Shared frontend runtime: `src/kernel/*`, `src/services/*`, `src/hooks/*`, `src/components/*`
- Backend business handlers: `api/modules/<module>/*`
- Thin API wrappers: `api/*.php`

## Local Setup
1. Install dependencies:
   ```bash
   npm ci --prefer-offline --no-audit --no-fund
   ```
2. Create local environment:
   ```bash
   copy .env.example .env.local
   ```
3. Import `database/schema.sql` into MySQL/MariaDB.
4. Serve the backend through Apache/PHP.
5. Start the frontend:
   ```bash
   npm run dev
   ```
6. Optional: reset to the minimal fixture:
   ```bash
   npm run db:reset-minimal
   ```

## Validation
- Scoped frontend changes: `npm run verify:fast`
- PHP, schema, contract, or cross-module changes: `npm run verify:safe`
- Full local test sweep:
  ```bash
  npm run test:all
  ```

## Runtime Notes
- Bootstrap entrypoint: `GET /api/bootstrap.php`
- Auth model: cookie-based session + CSRF
- Valid order statuses: `pending`, `processing`, `delivered`, `archived`
- Valid roles: `admin`, `manager`, `sales`

## Additional Docs
- `docs/modules/README.md`
- `docs/naming-conventions.md`
- `docs/api-contracts-index.md`
- `docs/golden-paths.md`
- `docs/api-usage.md`

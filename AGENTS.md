# AGENTS.md

Guidance for coding agents working in this repository.

## Purpose
- Keep AI output aligned with the current repo, not an older project snapshot.
- Preserve hard architectural and security guarantees while leaving room for justified, deeper implementation choices.

## Source of Truth Hierarchy
Read and obey docs in this order:

1. `ARCHITECTURE.md` - non-negotiable architecture, dependency, security, and ownership rules.
2. `MODULE_CONTRACTS.md` - public contracts and compatibility commitments.
3. `docs/code-map.md` - current module ownership, active/inactive status, and canonical edit paths.
4. `docs/guardrails.md` - guardrail severity, audit notes, and enforcement policy.
5. `README.md` and `docs/ai-playbook.md` - quick-start workflow and execution checklist.
6. `docs/ROADMAP.md` - future priorities only, never the source of current architecture truth.

If any lower-priority doc conflicts with a higher-priority doc or with the current code, follow the higher-priority doc and update the stale document in the same change.

## Current Repo Shape
- Frontend: React 19, Vite 7, Tailwind CSS 4, Lucide icons.
- Backend: plain PHP endpoints under `api/` with shared helpers in `api/_common.php`.
- Database: MySQL/MariaDB, baseline schema in `database/schema.sql`.
- Runtime pattern: cookie session auth, CSRF on mutations, RTL-first Persian UI.

Current active frontend modules:
- `accounting`
- `customers`
- `human-resources`
- `inventory`
- `master-data`
- `sales`
- `users-access`

Current active backend modules:
- `accounting`
- `customers`
- `human_resources`
- `inventory`
- `kernel`
- `master_data`
- `sales`
- `users_access`

Inactive scaffolds:
- `src/modules/production/`
- `api/modules/production/`

## Hard Guardrails
These are non-negotiable. Do not bypass them unless the user explicitly asks to change architecture/security rules and the governing docs are updated first.

- Respect the modular monolith boundary: module -> kernel/shared is allowed; module -> other module internals is forbidden.
- Do not add direct cross-module table access. Use contracts, read models, or module-owned facades.
- Keep auth, CSRF, session, CORS, and audit behavior intact.
- Use prepared statements for all SQL involving user input.
- Preserve locked runtime enums and roles:
  - order status: `pending`, `processing`, `delivered`, `archived`
  - roles: `admin`, `manager`, `sales`
- Keep endpoint adapters thin and module-owned logic inside the owning module.
- Preserve RTL behavior and Persian UX compatibility.

## Repository Defaults
These are the default way to work. Follow them unless there is a documented reason not to, and update docs/tooling if the repo standard changes.

- File-size budget is 300 lines for new or significantly changed `src/` and `api/` files.
  - Existing exceptions live in `scripts/file-size-allowlist.json`.
  - Prefer extracting hooks/services/helpers over stretching a file.
- Frontend module code should use module-local service facades.
  - Components/pages/hooks/utils inside a module must not import `src/services/api` directly.
  - Module service files may wrap shared API clients.
- Naming conventions are defined in `docs/naming-conventions.md` and enforced by `npm run check:naming`.
- Canonical edit paths:
  - frontend business logic: `src/modules/<module>/*`
  - shared frontend runtime: `src/kernel/*`, `src/services/*`, `src/hooks/*`, `src/components/*`
  - backend business logic: `api/modules/<module>/*`
  - thin public wrappers: `api/*.php`
- Contract-sensitive backend/schema changes should update docs in the same change.

## Temporary and Migration Rules
- Treat phase/runbook files as temporary implementation guidance, not architecture authority.
- `docs/ROADMAP.md` and temporary runbook files may describe phased work; they must not silently override `ARCHITECTURE.md` or `MODULE_CONTRACTS.md`.
- If a temporary migration rule becomes permanent, move it into the authoritative docs and remove the temporary-only wording.

## Stale or Conflicting Rules
- If a rule example references an outdated module list, outdated endpoint set, or superseded workflow, treat it as stale.
- Fix stale guidance in the same change when practical, especially in:
  - `AGENTS.md`
  - `README.md`
  - `docs/ai-playbook.md`
  - `docs/code-map.md`
  - `docs/modules/*.md`

## Validation Modes
- `npm run verify:fast`
  - Use for scoped frontend/JS changes.
- `npm run verify:safe`
  - Use for PHP, schema, contract, cross-module, permission, or release-facing changes.
- If unsure, run `npm run verify:safe`.

## API Endpoint Checklist
When adding or materially changing a protected endpoint:

1. Start from an existing module handler under `api/modules/<module>/`.
2. Keep the standard bootstrap:
   ```php
   require_once __DIR__ . '/../../_common.php';
   require_once __DIR__ . '/../../config/db.php';
   app_install_exception_handler();
   app_start_session();
   app_send_cors_headers();
   app_handle_preflight(['GET', 'POST']);
   app_require_method(['GET', 'POST']);
   ```
3. Add auth and permission guards immediately after bootstrap when the endpoint is protected.
4. Call `app_require_csrf()` on every state-changing request.
5. Return JSON through `app_json(...)`.
6. Log mutations with `app_audit_log(...)`.
7. Keep `api/<endpoint>.php` as a thin wrapper over the module handler.
8. Update contract docs when endpoint or schema behavior changes.

## Frontend Component Checklist
- Place module-specific UI in `src/modules/<module>/components/`.
- Use shared layers for shared UI, not another module's private files.
- Keep `dir="rtl"` at the appropriate container boundary.
- Prefer logical Tailwind utilities such as `start/end`, `ps-*`, `pe-*`, `text-start`, `text-end`.
- Preserve print-related classes such as `print-hide` and `printable-area` where relevant.

## Runtime Notes
- Frontend bootstraps from `GET /api/bootstrap.php`.
- Session auth is cookie-based and requests use credentials.
- Catalog lives in `system_settings` with key `catalog`.
- Orders live in `orders` and still preserve compatibility helpers around `items_json`.
- CSRF token is fetched during bootstrap and injected automatically by the API client on mutations.

## Documentation Update Stage
When current code and docs diverge, include a doc refresh step in the same task:

- Sync active/inactive module lists with actual folder structure and routes.
- Sync source-of-truth notes with current repo policy.
- Sync tooling docs with actual enforcement behavior.
- If you change backend contracts or schema assumptions, update the contract docs before considering the task complete.

## Change Philosophy
- Keep diffs focused and minimal.
- Avoid broad refactors unless requested.
- Do not add dependencies unless necessary.

# AGENTS.md

Guidance for coding agents in this repository.

## Read Order (Source of Truth)
1. `ARCHITECTURE.md` (non-negotiable architecture/security/boundaries)
2. `MODULE_CONTRACTS.md` (public contracts + compatibility)
3. `docs/code-map.md` (active module ownership + canonical edit paths)
4. `docs/guardrails.md` (guardrail severity + enforcement)
5. `README.md` and `docs/ai-playbook.md` (workflow)
6. `docs/ROADMAP.md` (active execution roadmap; never architecture truth)

If docs conflict, follow higher-priority docs and update stale docs in the same change.

## Current Runtime Shape
- Frontend: React + Vite + Tailwind, RTL-first Persian UX.
- Backend: PHP endpoints under `api/` with shared helpers in `api/_common.php`.
- DB: MySQL/MariaDB (`database/schema.sql`).
- Auth model: cookie sessions + CSRF for mutations.

Active frontend modules:
- `accounting`, `customers`, `human-resources`, `inventory`, `master-data`, `sales`, `users-access`

Active backend modules:
- `accounting`, `customers`, `human_resources`, `inventory`, `kernel`, `master_data`, `sales`, `users_access`

Inactive scaffold:
- `production` (`src/modules/production/`, `api/modules/production/`)

## Hard Guardrails (Do Not Break)
- Modular monolith boundaries only (no module -> other module internals).
- No direct cross-module table access.
- Keep auth/CSRF/session/CORS/audit behavior intact.
- Use prepared SQL for user input.
- Keep locked runtime values:
  - order status: `pending`, `processing`, `delivered`, `archived`
  - roles: `admin`, `manager`, `sales`
- Keep endpoint adapters thin; module logic stays module-owned.
- Preserve RTL behavior and Persian UX compatibility.

## Repository Defaults
- Keep diffs focused and minimal.
- Prefer module-local service facades in frontend modules.
- Canonical edit paths:
  - Frontend module logic: `src/modules/<module>/*`
  - Shared frontend runtime: `src/kernel/*`, `src/services/*`, `src/hooks/*`, `src/components/*`
  - Backend module logic: `api/modules/<module>/*`
  - Thin public wrappers: `api/*.php`
- Naming conventions: `docs/naming-conventions.md` (`npm run check:naming`).
- File-size budget for `src/` and `api/`: 300 lines (exceptions in `scripts/file-size-allowlist.json`).

## Validation Modes
- `npm run verify:fast` for scoped frontend/JS changes.
- `npm run verify:safe` for PHP/schema/contracts/cross-module/permission/release-facing changes.
- If unsure, use `npm run verify:safe`.

## Protected Endpoint Checklist
1. Start from existing module handler under `api/modules/<module>/`.
2. Standard bootstrap (`_common.php`, DB config, exception/session/CORS/preflight/method guards).
3. Add auth + permission guards near the top.
4. Call `app_require_csrf()` on state-changing methods.
5. Return JSON via `app_json(...)`.
6. Audit mutations via `app_audit_log(...)`.
7. Keep `api/<endpoint>.php` wrappers thin.
8. Update contract docs when endpoint/schema behavior changes.

## Documentation Refresh Rule
When docs and code drift, refresh docs in the same task (especially module lists, ownership map, and enforcement notes).

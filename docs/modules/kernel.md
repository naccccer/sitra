# Kernel Module

## Responsibility
- Shared infrastructure only.
- No business domain ownership.

## Owns
- Auth/session primitives.
- CSRF enforcement primitives.
- Permission evaluation primitives.
- Audit write primitives.
- Module registry and capability exposure.

## Must Not Own
- Sales, production, inventory, or catalog business workflows.

## Public Services
- `auth_context`
- `permission_check`
- `audit_log`
- `module_registry`
- `module_gate`

## Module Registry Runtime
- Persistence table: `module_registry`.
- Owner guard:
  - Registry control plane is Owner-only (`admin` + `APP_OWNER_UID`).
  - Guard implementation lives in `api/kernel/ModuleGuard.php`.
- Protected modules that cannot be disabled:
  - `auth`
  - `users-access`
- Dependency guard:
  - `production` depends on `inventory`.
  - While `production` is enabled, disabling `inventory` is blocked (`409`).
- Bootstrap contract:
  - `GET /api/bootstrap.php` exposes dynamic `modules` from registry only for Owner.
  - Capability flags are masked by module enabled state.

## Module Gate Middleware
- Business endpoints call kernel helper `app_require_module_enabled($pdo, <moduleId>)`.
- If module is disabled, kernel responds:
  - HTTP `403`
  - `{ success: false, error: 'Module is disabled.', code: 'module_disabled', module: '<moduleId>' }`
- Kernel endpoints (`bootstrap`, `module_registry`) remain unblocked by module gates.
- `module_registry` endpoint itself is hard-blocked for non-owner users with `403 owner_required`.

## Dependencies
- Can depend on low-level shared runtime utilities.
- Must not depend on business modules.

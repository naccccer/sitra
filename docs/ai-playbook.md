# AI Playbook

## Canonical Commands

- Install: `npm ci --prefer-offline --no-audit --no-fund` (or `npm run deps:install`)
- Fast validation: `npm run verify:fast`
- Safe validation: `npm run verify:safe`
- All tests: `npm run test:all`
- Generate contract types: `npm run contracts:types`
- File budget check: `npm run check:file-size`
- Naming check: `npm run check:naming`

## Preferred Edit Paths

- Business UI/API changes: `src/modules/*` and `api/modules/*`
- Shared runtime: `src/kernel/*`, `src/services/*`, `src/hooks/*`

## Do Not Touch (Without Explicit Scope)

- `api/_common.php` guard semantics
- Status enum contract: `pending`, `processing`, `delivered`, `archived`
- Module boundary rules in lint/check scripts

## High-Risk Pitfalls

- Direct module-to-module imports (frontend/backend)
- Missing CSRF on mutating endpoints
- Role/permission key drift (`users-access` vs `users_access`)
- File growth above 300 lines without extraction
- Increasing an allowlisted oversized file without splitting/reducing scope

## Recommended Edit Pattern

1. Update module-local service or handler first.
2. Keep adapter endpoints/wrappers thin.
3. Update contracts/docs/examples in same change.
4. Run `verify:fast` or `verify:safe` based on scope.

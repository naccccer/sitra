# Sitra ERP Roadmap

This file is forward-looking only. It does not define the current architecture or current active module list; use `docs/code-map.md` for that.

## Current Platform Snapshot
- Active business modules already in repo:
  - `sales`
  - `customers`
  - `inventory`
  - `human-resources`
  - `accounting`
  - `master-data`
  - `users-access`
- Shared runtime:
  - `kernel`
- Reserved, inactive scaffold:
  - `production`

## Next Priorities

### 1) Sales Hardening
- Improve order list performance and filtering for larger datasets.
- Expand optimistic concurrency and conflict UX.
- Continue splitting oversized sales/admin components into smaller containers/hooks.

### 2) Master Data Improvements
- Add stricter validation for pricing and dimension rules.
- Improve catalog edit ergonomics for large operation lists.
- Add import/export for catalog snapshots.

### 3) Access and Control Plane
- Improve role-permission matrix UX.
- Add stronger safeguards for owner-only operations.

### 4) Platform Reliability
- Expand automated integration coverage for auth/bootstrap/orders/settings.
- Add migration scripts for schema evolution.
- Improve observability around failed requests and retries.

## Validation Gate
- Fast: `npm run verify:fast`
- Safe: `npm run verify:safe`
- Full tests: `npm run test:all`

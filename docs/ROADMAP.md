# Sitra ERP Roadmap

## Current Baseline (Completed)
- Module boundaries stabilized around:
  - `sales`
  - `master-data`
  - `users-access`
  - `kernel/auth`
- Roles simplified to:
  - `admin`
  - `manager`
  - `sales`
- Added machine-readable contract schemas and generated frontend contract types.

## Next Priorities

### 1) Sales Hardening
- Improve order list performance and filtering for larger datasets.
- Expand optimistic concurrency and conflict UX.
- Continue splitting oversized sales/admin components into smaller containers/hooks.

### 2) Master Data Improvements
- Add stricter validation for pricing and dimension rules.
- Improve catalog edit ergonomics for large operation lists.
- Add import/export for catalog snapshots.

### 3) Users & Access
- Improve role-permission matrix UX (bulk toggles, audit-friendly diff preview).
- Add stronger safeguards for owner-only operations.

### 4) Platform Reliability
- Expand automated integration coverage for auth/bootstrap/orders/settings.
- Add migration scripts for schema evolution.
- Improve observability around failed requests and retries.

## Validation Gate
- Fast: `npm run verify:fast`
- Safe: `npm run verify:safe`
- Full tests: `npm run test:all`

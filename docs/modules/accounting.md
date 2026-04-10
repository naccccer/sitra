# Accounting Module

## Responsibility
- Payroll workspace, payroll import, accounting settings, and accounting-owned ledgers/accounts.

## Owns
- Payroll periods and payslip lifecycle.
- Payroll payment records and payroll documents.
- Accounting settings and account/voucher data owned by accounting tables.

## Public Services
- `accounting.payroll.v1`
- `accounting.payroll.import.v1`

## Data Ownership
- Owns `acc_*` tables.
- Consumes HR and sales data through contracts/read models only.

## Interaction Rules
- Direct cross-module table access is forbidden.
- Compatibility adapters may expose HR-backed employee data, but ownership remains with HR.
- Accounting admin tables/settings grids should use shared workspace/table primitives, with Persian numeral rendering for user-facing numeric values and explicit `dir="ltr"` only for mixed-direction scan fields (codes/dates/identifiers).


## Accounts Lifecycle Notes
- `GET /api/acc_accounts.php` supports additive `view=active|archived|all` and keeps `includeInactive` as legacy alias.
- `PATCH /api/acc_accounts.php` supports `action=archive|restore|delete` (legacy `toggle_active`/`isActive` aliases are still accepted).
- Account delete is retained soft-delete (`deleted_at`) and is allowed only from archived state; delete cascades to descendant child accounts.
- `toggle_postable` behavior remains unchanged.

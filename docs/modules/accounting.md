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

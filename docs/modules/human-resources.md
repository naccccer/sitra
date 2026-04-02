# Human Resources Module

## Responsibility
- Employee directory and HR-owned reference data used by other modules.

## Owns
- Employee profile, employment status, identifiers, and HR-facing document context.

## Public Services
- `human_resources.employee_directory.v1`

## Data Ownership
- Owns `hr_employees`.
- Other modules may consume employee data through contracts or compatibility adapters only.

## Interaction Rules
- HR remains the source of truth for employee identity and activation state.
- Accounting payroll integrations must treat HR as the owner of employee records.
- HR directory/documents admin list surfaces should use shared workspace/table primitives, Persian numeral formatting for visible numeric values, and explicit `dir="ltr"` only for mixed-direction scan fields.

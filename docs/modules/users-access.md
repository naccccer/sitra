# Users-Access Module

## Responsibility
- User account lifecycle and role assignment.
- Access policy persistence and enforcement inputs.

## Owns
- User records and activation state.
- Role mapping for runtime authorization.

## Public Services
- `user_list`
- `user_create`
- `user_update`
- `user_active_set`

## Data Ownership
- Owns `users` table and future role/permission mapping tables.

## Interaction Rules
- Other modules must consume effective permissions through kernel checks.
- User mutation operations must be audited.
- `admin` role is Owner-only governance scope (System Owner/Support), not factory operations.
- Non-owner actors cannot assign, demote, or deactivate `admin` users.
- Users list/admin table surfaces should use shared workspace/table primitives and keep numeric/date scan consistency via Persian numerals plus explicit `dir="ltr"` only on mixed-direction fields (e.g., usernames and timestamps).

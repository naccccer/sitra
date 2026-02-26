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


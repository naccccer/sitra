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

## Dependencies
- Can depend on low-level shared runtime utilities.
- Must not depend on business modules.


# Naming Conventions

## Cross-Layer Module Naming Map

Use these exact forms consistently:

- Module ID (frontend/runtime): `kebab-case` (`users-access`, `master-data`, `sales`, `auth`)
- Permission/Event namespace (backend): `snake_case` (`users_access`, `master_data`, `sales`, `kernel`, `auth`)
- API module folder names: `snake_case` (`master_data`, `users_access`)

Mapping:

| Concept | Kebab Case | Snake Case |
|---|---|---|
| Users Access | `users-access` | `users_access` |
| Master Data | `master-data` | `master_data` |
| Sales | `sales` | `sales` |
| Kernel | `kernel` | `kernel` |
| Auth | `auth` | `auth` |

## File Naming Rules

- React components: `PascalCase.jsx`
- Hooks/services/utils JS files: `camelCase.js`
- Backend module files: `snake_case.php`

Enforcement:

- `npm run check:naming`
- `npm run check:file-size`

# Naming Conventions

## Cross-Layer Module Naming Map

Use these exact forms consistently:

- Module ID (frontend/runtime): `kebab-case`
- Permission/event namespace (backend): `snake_case`
- API module folder names: `snake_case`

| Concept | Kebab Case | Snake Case |
|---|---|---|
| Accounting | `accounting` | `accounting` |
| Customers | `customers` | `customers` |
| Human Resources | `human-resources` | `human_resources` |
| Inventory | `inventory` | `inventory` |
| Master Data | `master-data` | `master_data` |
| Sales | `sales` | `sales` |
| Users Access | `users-access` | `users_access` |
| Kernel | `kernel` | `kernel` |
| Auth | `auth` | `auth` |
| Production (inactive scaffold) | `production` | `production` |

## File Naming Rules
- React components: `PascalCase.jsx`
- Hooks/services/utils JS files: `camelCase.js`
- Backend module files: `snake_case.php`

## Enforcement
- `npm run check:naming`
- `npm run check:file-size`

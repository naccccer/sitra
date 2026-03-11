# Code Map

| Feature | Canonical Frontend Module | Canonical Backend Module | DB Tables | Endpoint Entrypoints |
|---|---|---|---|---|
| Bootstrap + Session + Capabilities | `src/kernel`, `src/hooks/useBootstrap.js` | `api/modules/kernel` | `users`, `system_settings`, `module_registry`, `orders` | `GET /api/bootstrap.php` |
| Sales Orders Lifecycle | `src/modules/sales` | `api/modules/sales` | `orders`, `order_request_idempotency` | `GET|POST|PUT|PATCH|DELETE /api/orders.php` |
| Catalog Management | `src/modules/master-data` | `api/modules/master_data` | `system_settings` (`catalog`) | `GET|POST /api/catalog.php` |
| Business Profile | `src/pages/ProfilePage.jsx` + kernel settings shell | `api/modules/master_data` | `system_settings` (`profile`) | `GET|POST /api/profile.php` |
| Users and Permissions | `src/modules/users-access` | `api/modules/users_access` | `users`, `system_settings` (`role_permissions`) | `GET|POST|PUT|PATCH /api/users.php`, `GET|POST /api/role_permissions.php` |
| Module Registry (Owner) | `src/kernel/pages/SystemSettingsPage.jsx` | `api/modules/kernel` | `module_registry` | `GET|PATCH /api/module_registry.php` |
| Audit Logs | `src/kernel/pages/AuditLogsPage.jsx` | `api/modules/kernel` | `audit_logs` | `GET /api/audit_logs.php` |
| Auth | `src/components/auth/LoginView.jsx` | `api/modules/users_access` | `users` | `POST /api/login.php`, `POST /api/logout.php` |
| Uploads | Sales + Admin profile components | top-level upload endpoints | filesystem (`api/uploads/`) | `POST /api/upload.php`, `POST /api/upload_logo.php` |

## Canonical Edit Paths

- Frontend business changes: `src/modules/<module>/*`
- Shared frontend runtime/shell: `src/kernel/*`, `src/services/*`, `src/hooks/*`
- Backend business handlers: `api/modules/<module>/*`
- Endpoint wrappers: `api/*.php` (thin adapters only)

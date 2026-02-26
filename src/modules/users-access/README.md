# Users-Access Frontend Module

Owns:
- Users page and user management UI
- Users-access API facade for frontend module boundary

Public entry points:
- `pages/UsersPage.jsx`
- `components/AdminUsersSettingsTab.jsx`
- `services/usersAccessApi.js`

Compatibility:
- Legacy paths in `src/pages/UsersPage.jsx` and `src/components/admin/AdminUsersSettingsTab.jsx` re-export from this module.


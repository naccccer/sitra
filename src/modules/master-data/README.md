# Master-Data Frontend Module

Owns:
- Catalog settings page and editing UI
- Master-data API facade for catalog persistence

Public entry points:
- `pages/AdminPage.jsx`
- `components/AdminSettingsView.jsx`
- `services/masterDataApi.js`

Compatibility:
- Legacy paths in `src/pages/AdminPage.jsx` and `src/components/admin/AdminSettingsView.jsx` re-export from this module.


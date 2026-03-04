# Production Frontend Module

Owns:
- Production route pages and production UI flows
- Production API facade for work-order release/list
- Work-order stage update and consume actions
- Label lookup/reprint actions by `orderRowKey` / `workOrderId`
- Scan-first stage/station transition flow
- Scanner profile presets with enter/auto-submit modes
- Role-filtered station preset master data from production GET response

Public entry points:
- `pages/ProductionPage.jsx`
- `services/productionApi.js`

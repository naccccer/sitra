# Phase 3 Rewrite Plan — Customers, HR, Users Access, Master Data

Updated: 2026-04-07
Owner mode: UX modernization lead

## 1) Module-by-module rewrite plan

### Customers
- **Template migration:** `CustomersPage` now uses `WorkspaceShellTemplate`.
- **Directory/detail/settings contract:** keep `CustomersDirectoryPanel` + details/form modals, but enforce shared shell and shared alert grammar.
- **Permission clarity:** write actions remain gated by `customers.write`; read-only users can browse but cannot mutate.
- **Next:** migrate any remaining modal-local validation copy drift to shared pattern catalog.

### Human Resources
- **Template migration:** `HumanResourcesPage` now uses `WorkspaceShellTemplate`.
- **Directory/detail/settings contract:** keep `HumanResourcesWorkspace` internals and preserve page/search/archive/form flow.
- **Permission clarity:** write actions remain explicitly bound to `human_resources.employees.write`.
- **Next:** unify import/error microcopy and shortcut behavior across HR tables/modals.

### Users Access
- **Template migration:** `UsersPage` now uses `WorkspaceShellTemplate`.
- **Directory/detail/settings contract:** `AdminUsersSettingsTab` stays module-owned but inherits shared shell and card framing.
- **Permission clarity:** only `canManageUsers` path remains actionable.
- **Next:** normalize role/activation confirmations and success/error banners with shared patterns.

### Master Data
- **Template migration:** `MasterDataPage` now uses `WorkspaceShellTemplate`.
- **Navigation standardization:** custom tab links replaced with shared `SegmentedTabs` grammar.
- **Permission clarity:** route visibility continues to be capability + module-enabled filtered.
- **Next:** align subpage-level forms/modals with common validation and feedback behavior.

---

## 2) Reused component matrix

| UX concern | Shared component/contract | Modules now aligned |
|---|---|---|
| Page shell | `WorkspaceShellTemplate` | Customers, HR, Users Access, Master Data |
| Page header | `WorkspacePageHeader` (via shell template) | Customers, HR, Users Access, Master Data |
| Workspace tabs | `SegmentedTabs` | Master Data (plus existing Accounting surface) |
| Inline feedback | `InlineAlert` | Customers (error banner), existing module surfaces |
| Modal shell baseline | `ModalShell` + module modals | Customers/HR module modals continue under shared shell |
| Permission denial | `AccessDenied` | All four modules |

---

## 3) Leftover debt list to delete (safe after parity QA)

1. Module-local page wrappers that duplicate shell spacing/header contracts.
2. Custom tab visual styles where `SegmentedTabs` can replace safely.
3. One-off error banners that bypass `InlineAlert`/`UniversalState`.
4. Inconsistent modal confirmation copy and validation phrasing across admin/reference modules.
5. Ambiguous write-action affordances that do not visibly reflect permission constraints.

---

## Constraints check
- No custom one-off page shell patterns were introduced.
- Role behavior remains explicit via capability/permission gates at module entry and mutation points.

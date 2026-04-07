# Operator Throughput Rewrite Spec (Sales + Inventory + Accounting)

## Scope and priority
This rewrite prioritizes high-frequency operator workflows and removes obsolete UI paths when safe.

Priority order:
1. Sales orders workspace + create/edit lifecycle
2. Inventory operations workspace
3. Accounting core transaction surfaces (vouchers/accounts/bridge)

---

## 1) Rewritten workflow specs

### A) Sales orders workspace + create/edit flow

#### Primary user jobs
- Rapidly find a live order.
- Update workflow state (`pending` -> `processing` -> `delivered` -> `archived`).
- Capture and reconcile payments.
- Open create/edit with minimum context switching.

#### New interaction model
- Single workspace shell using `WorkspaceShellTemplate` + shared toolbar/table grammar.
- Create action is always in primary action slot.
- Search, archive toggle, refresh, and pagination remain in one predictable region.
- Edit action opens `order/:id` in place as canonical edit path.

#### Safe path removals
- Remove duplicate “secondary access” entry points that bypass workspace list context.
- Keep a single canonical create entry (`/orders/new`) and canonical edit entry (`/orders/:id`).

---

### B) Inventory operations workspace

#### Primary user jobs
- Filter by status/type and scan dense operation rows quickly.
- Run lifecycle actions (`submit`, `approve`, `post`, `cancel`) with role-safe constraints.
- Start a new operation without leaving operational context.

#### New interaction model
- `WorkspaceShellTemplate` wraps hierarchy tabs and content.
- Operations list follows shared table/filter/action grammar:
  - filter row (status + query)
  - refresh and primary action placement
  - dense table scan with aligned numeric cells and lifecycle actions in a fixed action column
- Uses shared state rendering (`DataTableState`/`UniversalState`) for loading/empty/error.

#### Safe path removals
- Deprioritize ad-hoc status rendering patterns; use universal states only.

---

### C) Accounting core transaction surfaces

#### Primary user jobs
- Create/update voucher entries.
- Move between accounts, reports, bridge, and settings without interaction re-learning.
- Keep high-density financial tables readable.

#### New interaction model
- `WorkspaceShellTemplate` wraps accounting tab grammar.
- One tab strip contract (`SegmentedTabs` inside shared tabs slot).
- Shared header language and predictable panel sequencing.

#### Safe path removals
- Remove ad-hoc page wrappers that replicate tab-shell behavior.

---

## 2) Component mapping by screen

### Sales
| Screen | New template contract | Table/filter/action grammar |
|---|---|---|
| `OrdersPage` | `WorkspaceShellTemplate` + `AdminOrdersView` | `OrdersWorkspaceToolbar` + `OrdersWorkspaceTable` + `PaginationBar` |
| `OrderCreatePage` | Existing route contract, canonical create path | Form grammar remains module-owned; adopt shared state + alert primitives incrementally |
| `OrderDetailPage` | Existing route contract, canonical edit path | Reuse shared action and state primitives where touched |

### Inventory
| Screen | New template contract | Table/filter/action grammar |
|---|---|---|
| `InventoryV2Page` | `WorkspaceShellTemplate` + hierarchy tabs card | Child workspaces adopt shared toolbar/table patterns |
| `OperationsPanel` | Existing module panel inside shell template | `WorkspaceToolbar` + `FilterRow` + `DataTable` + `PaginationBar` + lifecycle action column |

### Accounting
| Screen | New template contract | Table/filter/action grammar |
|---|---|---|
| `AccountingPage` | `WorkspaceShellTemplate` + segmented tabs card | Module panels share common shell/header/action placement |
| `VouchersPanel` / `AccountsPanel` / `SalesBridgePanel` | Module-owned internals | Align to shared toolbar/state primitives during incremental refactor |

---

## 3) KPI targets (operator throughput)

### Baseline-to-target goals (first release)
- **Order create-to-save median time:** -25%
- **Order lookup (search to open) median time:** -30%
- **Inventory operation status action completion time:** -20%
- **Voucher entry completion time:** -15%
- **Clicks per frequent task (P75):** -20%
- **Operator mis-click / wrong-action rate:** -30%
- **Recoverable validation error rate:** -25%

### Measurement notes
- Measure by task telemetry (`start`, `first_result`, `submit`, `success`, `cancel`).
- Segment by role (`admin`, `manager`, `sales`) and workflow type.
- Compare 2-week pre/post windows.

---

## 4) Release QA checklist

### Workflow integrity
- [ ] Sales list -> create -> edit -> archive flow works without dead ends.
- [ ] Inventory operation transitions obey role/lifecycle constraints.
- [ ] Accounting tabs preserve deep-link behavior (`?tab=`) and refresh safely.

### Interaction consistency
- [ ] Header/title/description follow shared template language on all rewritten surfaces.
- [ ] Toolbars use shared action ordering: primary action, filters, refresh.
- [ ] Table state behavior uses universal grammar for loading/empty/error/success/archived.

### Keyboard and throughput
- [ ] Tab order is logical and consistent in toolbar/filter/table controls.
- [ ] Enter key in search/filter inputs performs expected action (search/apply) without focus loss.
- [ ] Bulk-select affordance (where present) supports keyboard activation and clear feedback.
- [ ] Dense tables retain scanability: fixed action column, numeric alignment, low visual noise.

### Safety and cleanup
- [ ] No obsolete duplicate navigation paths remain for rewritten flows.
- [ ] Permissions/capabilities still gate UI affordances server-safely.
- [ ] RTL layout and Persian copy remain intact.

# ERP UX Audit + Cutover Map (2026-04-07)

## Scope + Method
- Audited active application routes from router + navigation and expanded inventory/accounting tab surfaces.
- Reviewed major modal workflows across active modules (sales, customers, HR, inventory, accounting, kernel).
- Tagged each screen/workspace as `keep`, `refactor`, `rebuild`, or `delete`.
- Prioritized by **operator frequency** × **workflow criticality** for cutover order.
- Optimization target: speed + consistency, with RTL Persian UX preserved.

---

## 1) Screen Inventory (Keep / Refactor / Rebuild / Delete)

### Scoring model used
- **Impact**: `H` = revenue/ops-critical, `M` = frequent but non-critical, `L` = occasional/admin.
- **Frequency**: `H` = daily high-traffic, `M` = weekly/role-specific, `L` = occasional.
- **Priority rank**: lower number = earlier cutover.

| # | Route / Screen | Module | Impact | Frequency | Tag | Why | Cutover priority |
|---|---|---|---|---|---|---|---|
| 1 | `/orders/new` (OrderCreatePage / OrderForm) | sales | H | H | **rebuild** | Most business-critical capture flow; bespoke modals + high form complexity should move to standardized step architecture. | 1 |
| 2 | `/orders` (Orders workspace) | sales | H | H | **refactor** | Core daily list/ops flow; keep IA but unify table/actions/filters and modal behavior. | 2 |
| 3 | `/orders/:id` (Order detail/edit) | sales | H | H | **rebuild** | Shared complexity with order-create; ideal to merge into one resilient order workspace architecture. | 3 |
| 4 | `/inventory?tab=operations` (+ subtabs) | inventory | H | H | **refactor** | Strong domain coverage exists; needs consistency/performance and action safety upgrades. | 4 |
| 5 | `/inventory?tab=catalog` | inventory | H | H | **refactor** | Master-data inside inventory is frequent; reuse one entity CRUD shell across products/lots. | 5 |
| 6 | `/customers` | customers | H | H | **refactor** | High-frequency CRM lookup + edit; dual-modals are useful but need convergence + less cognitive load. | 6 |
| 7 | `/accounting?tab=payroll` | accounting | H | M | **rebuild** | Payroll has deepest modal/state sprawl; convert to guided workflow and persistent draft patterns. | 7 |
| 8 | `/human-resources` | human-resources | M | H | **refactor** | Good functional coverage; simplify dense page-state orchestration and modal entry paths. | 8 |
| 9 | `/inventory?tab=stock` | inventory | M | M | **refactor** | Valuable reporting/replenishment area; unify filtering and empty/error UX with other data workspaces. | 9 |
| 10 | `/accounting?tab=vouchers` | accounting | H | M | **refactor** | Financially critical; replace browser confirms + improve action affordances. | 10 |
| 11 | `/accounting?tab=accounts` | accounting | M | M | **keep** | Structure is straightforward; mostly needs design-token and form-shell harmonization. | 11 |
| 12 | `/master-data/pricing` | master-data | H | M | **refactor** | High downstream impact on sales pricing; interaction density suggests systemized editors. | 12 |
| 13 | `/master-data/profile` | master-data | M | L | **keep** | Low complexity profile/config surface; retain with light visual/system cleanup. | 13 |
| 14 | `/users-access` | users-access | H | L | **refactor** | Security-critical admin screen; improve clarity/safety for role/activation actions. | 14 |
| 15 | `/management/audit` | kernel | M | L | **keep** | Operationally useful, contained complexity; align modal/table primitives only. | 15 |
| 16 | `/owner/modules` | kernel | M | L | **keep** | Owner-only low-frequency control plane; maintain with tokenized UI polish. | 16 |
| 17 | `/` dashboard | kernel | M | H | **refactor** | Daily landing page; improve action hierarchy and task-centric quick entries. | 17 |
| 18 | `/login` | auth | H | M | **keep** | Minimal and stable; no structural rewrite needed. | 18 |
| 19 | `/users` redirect | compatibility | L | L | **delete** (eventual) | Legacy compatibility redirect; safe to remove after nav/link migration telemetry passes. | 19 |
| 20 | `/owner/users` redirect | compatibility | L | L | **delete** (eventual) | Same as above; keep only during migration window. | 20 |

---

## 2) Major Modal Workflow Audit

| Workflow | Current implementation | Tag | Cutover note |
|---|---|---|---|
| Sales checkout modal | Custom overlay modal (not shared shell) | rebuild | Move to unified `ModalShell` + form sections + keyboard/accessibility patterns. |
| Sales manual-item modal | Custom overlay modal (not shared shell) | rebuild | Fold into shared dialog/form tokens and validation summary pattern. |
| Sales pattern files modal | Custom overlay modal (not shared shell) | refactor | Keep content model; port chrome/actions onto shared modal primitives. |
| Sales payment manager modal | Existing modal workflow in admin orders | refactor | Harmonize with voucher/payroll payment interactions. |
| Customer create/edit modal | Uses shared shell | refactor | Keep, but standardize field grouping/action layout with HR and inventory entity forms. |
| Customer details modal | Uses shared shell with nested project/contact management | refactor | Split into tabs + side panel model to reduce depth. |
| HR employee modal | Uses shared shell | refactor | Keep architecture; reduce form density and interaction branching. |
| HR import modal | Uses shared shell | keep | Flow is bounded; only align tokens/messages and upload states. |
| Inventory operation form modal | Uses shared shell and shared across ops types | refactor | Preserve reuse; improve adaptive fields and guardrail messaging by operation status. |
| Inventory entity dialog (products/lots/warehouses/locations) | Shared dialog primitive | keep | Strong reuse candidate; improve consistency with account/voucher entity forms. |
| Accounting account form modal | Uses shared shell | keep | Minor normalization only. |
| Accounting voucher modal | Uses shared shell | refactor | Add stronger review/finalize UX and consistent destructive confirmations. |
| Accounting payroll modal set | Multiple shells/confirms/editor modals | rebuild | Consolidate to single workflow shell with staged state machine. |
| Audit log details modal | Uses shared shell | keep | Minimal tuning only. |

---

## 3) Component Duplication Map

### A) Modal framework duplication
1. **Shared modal foundation (`ModalShell`) is established but bypassed in critical sales flows.**
   - Result: inconsistent spacing, header behavior, close affordances, and likely keyboard/focus behavior.
2. **Custom fixed-overlay implementations exist in multiple places**, creating divergent modal chrome patterns and maintenance overhead.
3. **Confirmation UX duplicated as browser-native `window.confirm` in many modules**, breaking visual consistency and reducing confidence for destructive actions.

### B) CRUD dialog duplication
1. Inventory has a good shared entity dialog pattern; customers, accounts, and vouchers still have module-specific variants.
2. Payroll has parallel confirm/finalize/editor modal layers that partially overlap functionally.
3. Sales order flow uses bespoke modal UI primitives rather than shared `ui/*` controls in key steps.

### C) Table/list workspace duplication
1. Repeated list filter + pagination + busy/error patterns across customers, HR, inventory, accounting.
2. Repeated archive/restore patterns implemented per module with different confirmation semantics.
3. Repeated action toolbars and row actions with inconsistent iconography, wording, and button hierarchy.

---

## 4) Top 20 UX Blockers (Prioritized)

1. Order creation/edit is modal-heavy and bespoke in critical checkout/manual-item steps (high revenue risk if errors occur).
2. Sales core dialogs do not use the shared modal shell, causing behavior/style drift.
3. Browser-native confirms are used for destructive/irreversible actions across modules.
4. Payroll workflow is fragmented across multiple modal surfaces and stateful panels.
5. Complex pages carry many local state branches, increasing accidental mode confusion (HR, payroll, customer details).
6. Operation status actions in inventory rely on text+confirm patterns instead of explicit staged action UX.
7. Customer details combines customer/project/contact tasks in one deep modal, increasing cognitive load.
8. Inconsistent destructive language and action ordering (archive/delete/finalize/cancel) across modules.
9. List filtering/pagination interactions differ by module, slowing cross-role operator switching.
10. Error/empty/loading states are semantically similar but visually inconsistent between workspaces.
11. Action button hierarchy (primary/secondary/ghost) is not systemically uniform in high-density panels.
12. Quick-create patterns differ (sales linking tools vs customer create vs HR create) with no unified progressive disclosure pattern.
13. Accounting finalize/close actions rely on confirm dialogs with limited contextual consequence preview.
14. Master-data pricing has high information density without consistent editor scaffolding patterns.
15. Dashboard shortcuts are useful but not workflow-prioritized by operator role/task urgency.
16. Routing + tab query params can expose users to context loss when switching between deep subtabs.
17. Modal content heights and scrolling behavior vary, increasing perceived instability.
18. Form validation messaging is inconsistent in placement/wording between modules.
19. Archive views are toggled differently between modules (naming, placement, feedback).
20. Legacy redirect routes remain as technical debt and can obscure canonical information architecture.

---

## 5) Phase-ready Rebuild Shortlist

## Phase 0 (2 weeks): System hardening before rewrite
- Establish one **ERP Dialog Standard**: shell, footer action order, destructive confirmation variant, keyboard/focus behavior.
- Replace `window.confirm` usages in active high-impact flows (sales, inventory ops, vouchers, fiscal year close, user actions).
- Create shared **Workspace State Pattern** (loading/empty/error/pagination/filter row) and retrofit one pilot page.

## Phase 1 (4–6 weeks): Highest ROI rewrite
1. **Sales Order Workspace Unified Rewrite** (`/orders/new` + `/orders/:id` + checkout/manual-item dialogs).
2. **Payroll Workspace Rewrite** (`/accounting?tab=payroll`) using staged flow + persistent draft + single modal architecture.

## Phase 2 (3–4 weeks): Core operations consistency
1. **Orders list refactor** (`/orders`) for fast triage and payment/status operations.
2. **Inventory operations refactor** (`/inventory?tab=operations`) with consistent action rails and confirmation UX.
3. **Customers refactor** (`/customers`) splitting deep details modal into structured sub-surfaces.

## Phase 3 (2–3 weeks): Shared admin and support surfaces
- Refactor HR workspace, vouchers, master-data pricing, users-access with shared workspace primitives.
- Normalize dashboard task entry points based on role and high-frequency workflows.

## Phase 4 (cleanup): De-risk and simplify IA
- Remove legacy redirect routes (`/users`, `/owner/users`) after usage telemetry confirms safe cutover.
- Freeze design tokens + modal/workspace contracts and enforce via lintable UI conventions.

---

## 6) Rewrite-first Cutover Map (What gets rewritten first)

### Rewrite lane A (start immediately)
1. Sales order-create/detail unified experience.
2. Payroll unified experience.

### Rewrite lane B (parallel refactor lane)
1. Orders list.
2. Inventory operations.
3. Customers workspace.

### Stabilization lane (after A/B)
1. HR + vouchers + pricing + users-access consistency pass.
2. Dashboard and low-frequency admin screens polish.
3. Redirect deletion + IA cleanup.

---

## Recommendation
If one decision is needed now: **begin with Sales Order Workspace rewrite** and use it to define the reusable dialog/workspace system contract that Payroll and Inventory can adopt next.

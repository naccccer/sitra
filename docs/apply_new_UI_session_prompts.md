# Orders-Derived UI Session Prompts

## Purpose
- This file is the ready-to-paste prompt companion for the orders-derived UI rollout.
- `docs/apply_new_UI_roadmap.md` remains the execution authority for scope, standards, phase rules, and completion requirements.
- Keep this file in sync with the phase names, verification commands, and doc-update rules in `docs/apply_new_UI_roadmap.md`.

## Prompt Blocks
### Prompt For Phase 0 - Baseline Audit
```text
Read `ARCHITECTURE.md`, `MODULE_CONTRACTS.md`, `docs/code-map.md`, `docs/guardrails.md`, `README.md`, `docs/ai-playbook.md`, and `docs/apply_new_UI_roadmap.md` first. Execute only `Phase 0 - Baseline Audit` from `docs/apply_new_UI_roadmap.md`.

Inventory all remaining non-orders frontend surfaces that diverge from the canonical admin orders workspace. Record exact target files, grouped by module and surface category, plus known exceptions and print-sensitive surfaces. Do not migrate UI yet unless you must fix documentation drift.

Stay frontend/doc-only. Do not make backend, API, schema, route, or module-boundary changes. Do not continue into Phase 1.

Before finishing:
- update `docs/apply_new_UI_roadmap.md` with the Phase 0 log entry
- refresh any affected module docs only if the audit found material doc drift
- update `docs/UI_roadmap.md` only if shared UI guardrails or shared standards materially changed
- run `npm run verify:fast`
- report files changed, standards adopted, deferred items, docs updated, and the exact entry criteria for Phase 1
```

### Prompt For Phase 1 - Lock Orders As Reference
```text
Read `ARCHITECTURE.md`, `MODULE_CONTRACTS.md`, `docs/code-map.md`, `docs/guardrails.md`, `README.md`, `docs/ai-playbook.md`, and `docs/apply_new_UI_roadmap.md` first. Execute only `Phase 1 - Lock Orders As Reference`.

Treat the admin orders workspace as the canonical UI reference, specifically:
- `src/modules/sales/components/admin/AdminOrdersView.jsx`
- `src/modules/sales/components/admin/orders-workspace/OrdersWorkspaceToolbar.jsx`
- `src/modules/sales/components/admin/orders-workspace/OrdersWorkspaceTable.jsx`
- shared primitives under `src/components/shared/ui/*`

Document the canonical visual rules from orders, lock the allowed shared primitive set, and record any primitive gaps that must be handled before broader rollout. Do not migrate non-orders modules yet.

Before finishing:
- update `docs/apply_new_UI_roadmap.md` with the Phase 1 log entry
- refresh `docs/modules/sales.md` only if the conventions/examples materially changed
- update `docs/UI_roadmap.md` only if shared UI guardrails or shared standards materially changed
- run `npm run verify:fast`
- report files changed, standards adopted, deferred items, docs updated, and the exact entry criteria for Phase 2
```

### Prompt For Phase 2 - Shared Primitive Alignment
```text
Read `ARCHITECTURE.md`, `MODULE_CONTRACTS.md`, `docs/code-map.md`, `docs/guardrails.md`, `README.md`, `docs/ai-playbook.md`, and `docs/apply_new_UI_roadmap.md` first. Execute only `Phase 2 - Shared Primitive Alignment`.

Refine shared primitives only where current shared components still fall short of the locked orders reference. Keep all changes neutral and reusable. Work in `src/components/shared/ui/*` and only the minimum supporting shared styling needed.

Do not import or expose private sales internals. Do not migrate module pages except the minimum needed to validate a shared primitive change. Do not continue into Phase 3.

Before finishing:
- update `docs/apply_new_UI_roadmap.md` with the Phase 2 log entry
- update `docs/UI_roadmap.md` if shared UI guardrails or shared standards materially changed
- update `README.md` or `docs/ai-playbook.md` only if repo-level workflow guidance changed
- run `npm run verify:safe`
- report files changed, standards adopted, deferred items, docs updated, and the exact entry criteria for Phase 3
```

### Prompt For Phase 3 - Numeric And Typography Consistency
```text
Read `ARCHITECTURE.md`, `MODULE_CONTRACTS.md`, `docs/code-map.md`, `docs/guardrails.md`, `README.md`, `docs/ai-playbook.md`, and `docs/apply_new_UI_roadmap.md` first. Execute only `Phase 3 - Numeric And Typography Consistency`.

Standardize Persian numerals, weight hierarchy, tabular-number usage, and RTL/LTR handling across active list/detail/admin surfaces that still diverge from the orders reference. Use `toPN` where appropriate and keep `dir` handling explicit only where mixed-direction scanning requires it.

Do not redesign unrelated layouts. Do not continue into Phase 4.

Before finishing:
- update `docs/apply_new_UI_roadmap.md` with the Phase 3 log entry
- refresh affected module docs if examples or conventions materially changed
- update `docs/UI_roadmap.md` only if shared standards materially changed
- run `npm run verify:fast`
- report files changed, standards adopted, deferred items, docs updated, and the exact entry criteria for Phase 4
```

### Prompt For Phase 4 - Customers + Users Access
```text
Read `ARCHITECTURE.md`, `MODULE_CONTRACTS.md`, `docs/code-map.md`, `docs/guardrails.md`, `README.md`, `docs/ai-playbook.md`, and `docs/apply_new_UI_roadmap.md` first. Execute only `Phase 4 - Customers + Users Access`.

Migrate the most orders-like admin tables first by aligning customers and users-access list/admin surfaces to the locked orders-derived standards. Use shared primitives and keep all work in module-owned files under `src/modules/customers/*` and `src/modules/users-access/*`.

Do not import sales-private components. Do not continue into Phase 5.

Before finishing:
- update `docs/apply_new_UI_roadmap.md` with the Phase 4 log entry
- refresh `docs/modules/customers.md` and `docs/modules/users-access.md` if conventions/examples materially changed
- update `docs/UI_roadmap.md` only if shared standards materially changed
- run `npm run verify:fast`
- perform visual smoke checks for RTL alignment, Persian numerals, icon/action consistency, table/header/footer consistency, empty/loading/error states, and pagination
- report files changed, standards adopted, deferred items, docs updated, and the exact entry criteria for Phase 5
```

### Prompt For Phase 5 - Inventory + Human Resources
```text
Read `ARCHITECTURE.md`, `MODULE_CONTRACTS.md`, `docs/code-map.md`, `docs/guardrails.md`, `README.md`, `docs/ai-playbook.md`, and `docs/apply_new_UI_roadmap.md` first. Execute only `Phase 5 - Inventory + Human Resources`.

Align operational tables and modal/list surfaces in inventory and human-resources to the locked orders-derived standards. Use shared primitives and keep module ownership intact.

Do not change workflow semantics, API assumptions, or module boundaries. Do not continue into Phase 6.

Before finishing:
- update `docs/apply_new_UI_roadmap.md` with the Phase 5 log entry
- refresh `docs/modules/human-resources.md` and any current inventory module guidance if conventions/examples materially changed
- update `docs/UI_roadmap.md` only if shared standards materially changed
- run `npm run verify:fast`
- perform visual smoke checks for RTL alignment, Persian numerals, icon/action consistency, table/header/footer consistency, empty/loading/error states, and pagination
- report files changed, standards adopted, deferred items, docs updated, and the exact entry criteria for Phase 6
```

### Prompt For Phase 6 - Accounting + Master Data
```text
Read `ARCHITECTURE.md`, `MODULE_CONTRACTS.md`, `docs/code-map.md`, `docs/guardrails.md`, `README.md`, `docs/ai-playbook.md`, and `docs/apply_new_UI_roadmap.md` first. Execute only `Phase 6 - Accounting + Master Data`.

Align denser business/admin tables and settings grids in accounting and master-data to the locked orders-derived standards. Use shared primitives, preserve scan quality, and document any justified density exceptions.

Do not broaden scope into backend or schema work. Do not continue into Phase 7.

Before finishing:
- update `docs/apply_new_UI_roadmap.md` with the Phase 6 log entry
- refresh `docs/modules/accounting.md` and `docs/modules/master-data.md` if conventions/examples materially changed
- update `docs/UI_roadmap.md` only if shared standards materially changed
- run `npm run verify:fast`
- perform visual smoke checks for RTL alignment, Persian numerals, icon/action consistency, table/header/footer consistency, empty/loading/error states, and pagination
- report files changed, standards adopted, deferred items, docs updated, and the exact entry criteria for Phase 7
```

### Prompt For Phase 7 - Remaining Sales Non-Orders Surfaces
```text
Read `ARCHITECTURE.md`, `MODULE_CONTRACTS.md`, `docs/code-map.md`, `docs/guardrails.md`, `README.md`, `docs/ai-playbook.md`, and `docs/apply_new_UI_roadmap.md` first. Execute only `Phase 7 - Remaining Sales Non-Orders Surfaces`.

Align remaining in-scope sales detail/form/supporting admin surfaces to the locked orders-derived standards without changing the canonical reference. The admin orders workspace remains the source of truth, not customer order-create/detail flows.

Preserve print safety for sales/order-adjacent surfaces. Do not continue into Phase 8.

Before finishing:
- update `docs/apply_new_UI_roadmap.md` with the Phase 7 log entry
- refresh `docs/modules/sales.md` if conventions/examples materially changed
- update `docs/UI_roadmap.md` only if shared standards materially changed
- run `npm run verify:fast`
- perform visual smoke checks for RTL alignment, Persian numerals, icon/action consistency, table/header/footer consistency, empty/loading/error states, pagination, and print safety where relevant
- report files changed, standards adopted, deferred items, docs updated, and the exact entry criteria for Phase 8
```

### Prompt For Phase 8 - Consistency Sweep And Documentation Closure
```text
Read `ARCHITECTURE.md`, `MODULE_CONTRACTS.md`, `docs/code-map.md`, `docs/guardrails.md`, `README.md`, `docs/ai-playbook.md`, and `docs/apply_new_UI_roadmap.md` first. Execute only `Phase 8 - Consistency Sweep And Documentation Closure`.

Remove obvious leftovers, document approved exceptions, and finalize the rollout guardrails. Confirm there are no obvious ad hoc table families left in active modules and no forbidden cross-module private UI imports introduced by the rollout.

Do not start a new phase family. Close the roadmap cleanly.

Before finishing:
- update `docs/apply_new_UI_roadmap.md` with the Phase 8 log entry
- update `docs/UI_roadmap.md` if shared UI guardrails or shared standards materially changed
- refresh affected `docs/modules/*.md` files when conventions/examples materially changed
- update `README.md` or `docs/ai-playbook.md` only if repo-level workflow guidance changed
- run `npm run verify:safe`
- perform final visual and consistency checks for RTL alignment, Persian numerals, icon/action consistency, table/header/footer consistency, empty/loading/error states, pagination, print safety where relevant, and approved exception coverage
- report files changed, standards adopted, deferred items, docs updated, and closure notes for future work
```

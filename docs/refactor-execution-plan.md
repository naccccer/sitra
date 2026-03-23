# Refactor Execution Plan

## 1. Purpose
- Operational guide to execute the approved incremental refactor of the modular monolith ERP without code drift or API changes.

## 2. Global Rules
- Obey ARCHITECTURE.md: Kernel <- Modules only; no cross-module table access; contracts/services for communication.
- Obey MODULE_CONTRACTS.md: treat contract shapes as API truth; no breaking changes.
- Keep adapters thin; move business logic to module-owned helpers/services.
- Keep files <300 lines; split rather than stretch.
- Structured financial storage is the source of truth (`order_financials`, `order_payments`); no JSON fallback paths.

## Final State
- Removed systems: `order_meta_json` storage/readers and all JSON fallback logic for orders/financials.
- New data model: `order_financials` + `order_payments` own all financial totals/payments; dual-read/write removed.
- Enforced rules: no cross-module DB access; each module owns its tables and exposes contracts; payroll/sales bridges consume module facades only.
- Lessons learned: design ownership before migration; keep compatibility short-lived and explicit; enforce file-size/RTL discipline early to avoid refactors.

## 3. Phase 0 — Execution setup
- Goal: Prepare safe workspace and tooling discipline.
- Scope: repo-level workflow only.
- Target files: none (docs only).
- Tasks:
  - Create working branch; ensure `.env.local` present; DB available.
  - Pin testing modes: JS-only → `npm run verify:fast`; cross-module/PHP/schema → `npm run verify:safe`.
  - Define “scope lock”: load only files listed per phase in Cursor/Codex.
  - Set token budget: avoid loading binary/assets; prefer per-file loads.
- Risks: Running wrong verify mode; uncontrolled context bleed.
- Verification: `npm run verify:fast` (sanity).
- Done: branch ready; scope lock habit documented; commands confirmed.

## 4. Phase 1 — Boundary violations
- Goal: Remove cross-module DB access in accounting/customers; use contracts/read models.
- Scope: accounting + customers modules.
- Target files: `api/modules/accounting/acc_sales_bridge.php`, `api/modules/accounting/reports_queries.php`, `api/modules/accounting/acc_payroll.php`, `api/modules/accounting/payroll_helpers.php`, `api/modules/customers/customer_projects.php`, any new module-local facades.
- Tasks:
  - Replace direct `orders/customers/hr_employees` queries with module-owned contract calls/read models.
  - Keep permissions/CSRF and responses identical.
  - Add minimal facades inside accounting/customers as needed (no kernel changes).
- Risks: Performance regressions; missing edge filters.
- Verification: `npm run verify:safe`; manual: accounting bridge GET+POST, payroll list/workspace, customer projects list with totals.
- Done: No direct cross-module table access; tests pass; smoke passes.

## 5. Phase 2 — Split sales order handler
- Goal: Bring `orders_handlers.php` <300 lines and keep adapter thin.
- Scope: sales module backend.
- Target files: `api/modules/sales/orders_handlers.php`, new helpers in `api/modules/sales/orders_domain.php` (or sibling sales-only files).
- Tasks:
  - Extract idempotency/status/meta normalization into helpers.
  - Adapter handles only auth/CSRF/dispatch/response.
  - Preserve API behavior and error codes.
- Risks: Behavior drift in status/idempotency; duplicate validation.
- Verification: `npm run verify:safe`; manual: POST/PUT/PATCH/DELETE `/api/orders.php`, idempotent replay.
- Done: Handler <300 lines; helpers in place; behavior unchanged.

## 6. Phase 3 — Split oversized React components
- Goal: Reduce UI file size and token cost; keep behavior.
- Scope: sales + users-access frontend modules.
- Target files: `src/modules/sales/components/customer/SettingsModal.jsx`, `src/modules/users-access/components/AdminUsersSettingsTab.jsx`, new hooks/utils in same modules.
- Tasks:
  - Move calculations/uploads/state mgmt to hooks (`useSettingsModalLogic`, `useAdminUsersSettings`).
  - Keep props/JSX stable; no cross-module imports.
- Risks: State regressions; upload/validation edge cases.
- Verification: `npm run verify:fast`; manual: settings modal (holes, upload), admin users tab (add/edit/delete).
- Done: Each file <300 lines; UI unchanged; tests pass.

## 7. Phase 4 — Consolidate inventory v2 and payroll logic
- Goal: Single source for inventory ops and payroll workflows; thin adapters.
- Scope: inventory v2 + accounting payroll backend.
- Target files: `api/common/inventory_v2_operations.php`, `api/modules/inventory/inventory_v2_operations.php`, `api/modules/accounting/acc_payroll.php`, `api/modules/accounting/payroll_patch.php`, `api/modules/accounting/payroll_helpers.php`, `payroll_formula_engine.php`.
- Tasks:
  - Unify operation number generation/line mapping/inserts; remove duplicate helpers.
  - Align payroll status/validation between main and patch handlers.
- Risks: Workflow mismatch; status transition bugs.
- Verification: `npm run verify:safe`; manual: inventory op create/approve/post, payroll approve/issue/pay.
- Done: No duplicated logic; adapters call shared helpers; tests pass.

## 8. Phase 5A — Data ownership design for payments/meta
- Goal: Completed — ownership and schema defined; JSON fallback marked for removal.
- Outcome: Sales owns structured financials/payments tables; bridge consumes sales contract; migration plan approved.
- Verification: Design review only (complete).

## 9. Phase 5B — Payment/meta migration implementation
- Goal: Completed — structured model live; legacy `order_meta_json` fallback removed.
- Scope: sales backend + accounting bridge + schema.
- Outcome:
  - Writers/readers use `order_financials` + `order_payments` only.
  - Bridge reads module contract; no cross-module table access.
  - Legacy JSON compatibility removed after data backfill.
- Verification: `npm run verify:safe`; manual: create order with payments, run bridge, totals match; regression passes.

## 10. Verification matrix
- `verify:fast`: JS-only phases (3).
- `verify:safe`: phases 1,2,4,5B.
- Manual sets per phase (listed above) required before moving on.

## 11. Cursor/Codex working rules
- Scope lock: load only target files per phase; avoid assets/fonts/uploads.
- Token saving: prefer `rg`/single-file opens; avoid full repo indexing; summarize large helpers before editing.
- Keep diffs narrow; no refactors outside current phase scope.
- Don’t duplicate ARCHITECTURE.md; reference rules instead.

## 12. Exit criteria
- All phases done definitions met.
- No cross-module table access remains.
- Oversized files reduced; duplicate logic removed.
- Payment ownership implemented per design with compatibility.
- `verify:safe` passes; manual smoke matrix green.

## Scope Lock Rules
- Always limit changes to explicitly listed files.
- Never allow cross-module edits in one task.
- If scope expands, stop and re-run with tighter scope.
- Prefer 1-file or 1-module changes.
- Avoid touching shared/common unless necessary.

## Safety Rule
- After each phase, commit or checkpoint.
- If verification fails, revert immediately.
- Never stack multiple unverified changes.

## Prompts

### Phase 1
- Master: “Refactor boundary breaches in accounting/customers. Touch only accounting/customers files listed; replace cross-module table access with contracts/read models. Keep API responses identical; obey ARCHITECTURE and MODULE_CONTRACTS; no new kernel deps.”
- Focused 1: “Update `api/modules/accounting/acc_sales_bridge.php` to consume sales contract/read model instead of `orders` table; keep GET/POST outputs unchanged.”
- Focused 2: “Modify `api/modules/customers/customer_projects.php` to compute financials via sales contract/read model, preserving response shape and permissions.”

### Phase 2
- Master: “Split `api/modules/sales/orders_handlers.php` into adapter + helpers; keep behavior and API unchanged; file <300 lines; respect module boundaries.”
- Focused 1: “Extract idempotency/status helpers from `orders_handlers.php`; adapter delegates; error codes unchanged.”
- Focused 2: “Extract order meta/financial normalization into helper; adapter keeps auth/CSRF/dispatch only.”

### Phase 3
- Master: “Reduce `SettingsModal.jsx` and `AdminUsersSettingsTab.jsx` below 300 lines by moving logic to same-module hooks; keep UI/props stable; no cross-module imports.”
- Focused 1: “Create `useSettingsModalLogic` for hole math/upload/state; slim `SettingsModal.jsx` UI only.”
- Focused 2: “Create `useAdminUsersSettings` for data/role logic; keep table/form JSX intact.”

### Phase 4
- Master: “Consolidate inventory v2 and payroll logic; adapters thin; APIs stable; remove duplicated helpers.”
- Focused 1: “Unify inventory v2 op number/line handling in shared helper; adapter calls helper only.”
- Focused 2: “Align payroll validation/status flows between `acc_payroll.php` and `payroll_patch.php`; delete duplicates.”

### Phase 5A (complete)
- Outcome: Ownership design approved; JSON fallback deprecated; no further action.

### Phase 5B (complete)
- Outcome: Structured payment model live; bridge on contracts; legacy JSON removed.

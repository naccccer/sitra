# Refactor Execution Plan — COMPLETED

> All phases finished. This document is now a historical record.

## 1. Purpose
- Operational guide to execute the approved incremental refactor of the modular monolith ERP without code drift or API changes.

## 2. Global Rules
- Obey ARCHITECTURE.md: Kernel <- Modules only; no cross-module table access; contracts/services for communication.
- Obey MODULE_CONTRACTS.md: treat contract shapes as API truth; no breaking changes.
- Keep adapters thin; move business logic to module-owned helpers/services.
- Keep files <300 lines; split rather than stretch.
- Design-first for schema/payment ownership; implement only after design is approved.

## 3. Phase 0 — Execution setup ✅
- Goal: Prepare safe workspace and tooling discipline.
- Result: Branch ready; verify commands confirmed.

## 4. Phase 1 — Boundary violations ✅
- Goal: Remove cross-module DB access in accounting/customers; use contracts/read models.
- Result: `acc_sales_bridge.php` uses `app_sales_bridge_fetch_orders_for_accounting()` facade. `customer_projects.php` uses `app_sales_project_financial_summary()` facade. Zero direct cross-module table access remains.
- Key files created: `sales_bridge_read_model.php`, `sales_project_read_model.php`.

## 5. Phase 2 — Split sales order handler ✅
- Goal: Bring `orders_handlers.php` <300 lines and keep adapter thin.
- Result: Handler reduced to 45 lines (adapter-only). Logic extracted to:
  - `orders_idempotency.php` (45 lines)
  - `orders_status.php` (41 lines)
  - `orders_normalization.php` (128 lines)
  - `orders_persistence_write.php` (285 lines)
  - `orders_persistence_read.php`, `orders_persistence_mutation.php`

## 6. Phase 3 — Split oversized React components ✅
- Goal: Reduce UI file size and token cost; keep behavior.
- Result:
  - `SettingsModal.jsx`: 208 lines (logic in `useSettingsModalLogic` hook)
  - `AdminUsersSettingsTab.jsx`: 89 lines (logic in `useAdminUsersSettings` hook)

## 7. Phase 4 — Consolidate inventory v2 and payroll logic ✅
- Goal: Single source for inventory ops and payroll workflows; thin adapters.
- Result: Inventory ops unified in `api/common/inventory_v2_operations.php` (shared helpers), module adapter is 114 lines. Payroll consolidated in `payroll_helpers.php`; no duplicated logic between `acc_payroll.php` and `payroll_patch.php`.

## 8. Phase 5A — Data ownership design for payments/meta ✅
- Goal: Decide ownership and schema for payments/order_meta before code changes.
- Result: Design approved in `docs/design/order-financials-data-model.md`. Sales owns all financial data; accounting reads via facade; derived fields computed at read time.

## 9. Phase 5B — Payment/meta migration implementation ✅
- Goal: Implement approved payment/meta model without breaking APIs.
- Result:
  - `order_financials` and `order_payments` tables created and populated.
  - `order_financials_repository.php` provides canonical read/write.
  - `app_compute_payment_derived_fields()` is the single source for paidTotal/dueAmount/paymentStatus.
  - Accounting bridge reads via `app_read_order_payments()` — no JSON parsing.
  - `order_meta_json` column fully removed (writes, reads, column, env var, migration scripts).

## 10. Post-plan cleanup ✅
- `order_meta_json` column dropped from database.
- All dead code removed: fallback functions, backfill scripts, env vars, schema references.
- Final grep confirms zero remaining references.

## 11. Exit criteria — all met
- ✅ All phase done-definitions met.
- ✅ No cross-module table access remains.
- ✅ Oversized files reduced; duplicate logic removed.
- ✅ Payment ownership implemented per design.
- ✅ `order_meta_json` fully retired (column + code).

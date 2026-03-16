# Inventory V2 Roadmap (Glass Factory)

## 1. Objective
Replace the current Inventory module with Inventory V2 that is operationally comparable to Odoo-style inventory, but tailored to this app and glass factory workflows.

## 2. Locked Product Decisions
1. Build scope: Core Ops first.
2. Integration: Sales-first.
3. Data migration: none from legacy inventory.
4. Location model: bin-level.
5. Tracking: lot/batch tracking.
6. Stock policy: strict no-negative stock.
7. Approval flow: single-step manager/admin approval.
8. Product model: template + variant.
9. Replenishment: min/max reorder rules.
10. Delivery model: phased build, big-bang production cutover.

## 3. Architecture Principles
1. All stock mutations must pass through a posting engine and write immutable stock ledger rows.
2. Available stock is computed as `on_hand - reserved`.
3. API contracts are explicit and schema-backed.
4. Inventory UI is tabular, workflow-first, and RTL-safe.
5. No edited file should exceed 300 lines.
6. Use module-local service facade on frontend.
7. Use auth/permission/csrf guards on every state-changing endpoint.

## 4. Phase Plan

## Phase 1: Foundation
1. Build V2 schema for products, variants, warehouses, locations, lots, quants, operations headers/lines, ledger.
2. Implement base read/write APIs for products, warehouses, locations, lots.
3. Build Inventory V2 shell page with tabs and empty table scaffolds.
4. Add permission keys for Inventory V2.
5. Exit criteria:
1. Schema bootstraps cleanly on empty DB.
2. CRUD works for core masters.
3. Tabs render with role-aware visibility.

## Phase 2: Core Stock Operations
1. Implement receipts, deliveries, transfers, adjustments.
2. Add operation lifecycle: draft, submit, approve, post, cancel.
3. Enforce no-negative stock checks at reservation/posting points.
4. Persist movement rows to immutable ledger.
5. Exit criteria:
1. Posted operations update quants and ledger correctly.
2. Unauthorized users cannot approve/post.
3. Blocking rules for insufficient available stock are enforced.

## Phase 3: Sales + Production Integration
1. Add reservation engine linked to sales orders.
2. Add delivery workflow linked to sales references.
3. Add production consume and production output operation types.
4. Show reservation and fulfillment status in delivery tables.
5. Exit criteria:
1. Reservations reduce available but not on-hand.
2. Delivery posting consumes reserved stock.
3. Production consume/output updates stock and ledger correctly.

## Phase 4: Counts, Replenishment, Reports
1. Implement cycle/annual count sessions and count lines.
2. On session close, generate adjustment operations for variances.
3. Implement min/max rules and replenishment suggestions.
4. Build reports: on-hand, available, cardex, lot aging, count variance, operations flow.
5. Exit criteria:
1. Count variances generate auditable adjustments.
2. Replenishment suggestions follow rule thresholds.
3. Report results match posted ledger movements.

## Phase 5: Hardening + Big-Bang Cutover
1. Full UAT across sales and inventory workflows.
2. Seed initial V2 master data.
3. Switch Inventory UI route and API usage to V2.
4. Remove all legacy inventory code paths, endpoints, and module wiring.
5. Final regression and docs/contracts update.
6. Exit criteria:
1. End-to-end smoke tests pass.
2. Roles and permissions are validated.
3. No dead code or legacy inventory runtime path remains.
4. Cutover checklist is complete.

## 5. Cross-Phase Definition of Done
1. `npm run verify:safe` passes for each phase.
2. API payloads match contract schemas.
3. Audit logs exist for all mutation endpoints.
4. RTL table UX is consistent and usable.
5. No file size budget violations.
6. `ARCHITECTURE.md` and `MODULE_CONTRACTS.md` stay aligned with implemented APIs.

## 6. Big-Bang Cutover Checklist
1. Freeze legacy inventory writes.
2. Backup DB.
3. Apply V2 schema and permissions.
4. Seed V2 masters.
5. Enable V2 frontend route.
6. Remove legacy inventory UI/routes/APIs/module exports.
7. Remove legacy inventory schema objects after backup and verification.
8. Run smoke test pack.
9. Confirm rollback steps and owner.

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

## Phase 6: Complete All Tabs (UI + CRUD + Persian UX)
1. Complete tab-by-tab UI workflows for all 11 tabs with production-grade table/forms.
2. Implement full CRUD on Products (template + variant), Warehouses, Locations, Lots from UI.
3. Complete Counts tab UI (session lifecycle + lines + close).
4. Complete Replenishment tab UI (rule CRUD + suggestion run/accept flow).
5. Complete Reports tab UI (filters + result tables + export-ready structure).
6. Complete Settings tab UI (Inventory V2 settings persistence and validation).
7. Convert all user-facing labels/messages in Inventory V2 to clean Persian, remove mojibake.
8. Exit criteria:
1. No tab remains scaffold-only.
2. Core master entities are manageable from UI end-to-end.
3. Persian UX consistency is verified across all Inventory V2 pages.

## Phase 7: Advanced Integration (Sales, Procurement, Planning)
1. Bind sales order lifecycle to reservation and delivery lifecycle with explicit state mapping.
2. Add replenishment handoff hooks for procurement/planning (request lines and traceability references).
3. Add operation-level trace links (`source_reference` chains) across sales, production, and stock movements.
4. Add cross-module read models for fulfillment health (reserved, ready to deliver, delayed, partial).
5. Exit criteria:
1. Sales fulfillment statuses reflect inventory truth in near real time.
2. Planning/procurement requests are generated from replenishment outputs.
3. Traceability chain is visible for audit and troubleshooting.

## Phase 8: Performance, Reliability, and Observability
1. Optimize heavy queries (operations list, cardex, lot aging, reservation scans) with index and query tuning.
2. Add pagination/sort/search consistency checks on all list APIs.
3. Add concurrency guards and idempotency for critical mutation paths.
4. Add observability: audit coverage review, operational metrics hooks, structured failure logs.
5. Add backup/restore verification scripts for Inventory V2 tables.
6. Exit criteria:
1. Target P95 latency budgets are met for primary list and posting endpoints.
2. No known race-condition path remains unguarded.
3. Recovery and diagnostics playbooks are validated.

## Phase 9: Production Stabilization + Legacy Schema Retirement
1. Run extended UAT cycle on real usage scenarios and defect triage.
2. Freeze legacy schema objects after operational sign-off.
3. Archive/drop legacy inventory tables and helper paths during maintenance window.
4. Finalize long-term runbook: operational SOP, rollback guardrails, ownership and escalation.
5. Exit criteria:
1. Stabilization window closes with no Sev-1/Sev-2 inventory defects.
2. Legacy inventory schema is retired safely with verified backups.
3. Inventory V2 becomes the only supported runtime and maintenance path.

## 5. Cross-Phase Definition of Done
1. `npm run verify:safe` passes for each phase.
2. API payloads match contract schemas.
3. Audit logs exist for all mutation endpoints.
4. RTL table UX is consistent and usable.
5. No file size budget violations.
6. `ARCHITECTURE.md` and `MODULE_CONTRACTS.md` stay aligned with implemented APIs.

## 6. Big-Bang Cutover Checklist
1. [x] Freeze legacy inventory writes (legacy API entrypoints removed).
2. [x] Backup DB (required runbook gate before production deploy).
3. [x] Apply V2 schema and permissions.
4. [x] Seed V2 masters.
5. [x] Enable V2 frontend route (`/inventory`).
6. [x] Remove legacy inventory UI/routes/APIs/module exports.
7. [ ] Remove legacy inventory schema objects after backup and verification (post-cutover maintenance window).
8. [x] Run smoke test pack.
9. [x] Confirm rollback steps and owner.

## 7. Phase 5 Runbook (Cutover + Rollback)
1. Pre-cutover
1. Take DB backup and verify restore command.
2. Deploy backend/frontend release that includes only Inventory V2 runtime paths.
3. Validate role permissions include `inventory.v2_*` keys.
2. Cutover validation
1. Run receipt -> reserve -> delivery -> count -> report smoke flow.
2. Confirm no calls to removed legacy endpoints in logs.
3. Confirm module route `/inventory` loads V2 tabs for authorized users.
3. Rollback
1. Restore DB backup taken before cutover.
2. Roll back to previous release artifact.
3. Re-run smoke checks on legacy release before reopening access.

## 8. Post-Phase-5 Execution Order
1. Execute Phase 6 first (finish all tabs + Persian UX).
2. Execute Phase 7 next (cross-module integration).
3. Execute Phase 8 after integration stabilizes.
4. Execute Phase 9 only after two successful release cycles on V2.

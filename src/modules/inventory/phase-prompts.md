# Inventory V2 Session Prompts

## 1. How To Use
1. Start a new Codex session per phase.
2. Paste the matching phase prompt from this file.
3. Keep `src/modules/inventory/roadmap.md` as the phase authority.
4. Do not mix phases in one session unless explicitly required by blockers.

## 2. Global Constraints Block (prepend to every phase prompt)
```text
You are implementing Inventory V2 in c:\xampp\htdocs\sitra.

Mandatory constraints:
- Follow AGENTS.md strictly.
- Keep RTL-safe UI behavior.
- Do not import src/services/api directly in module components; use module service facade.
- Every PHP mutation endpoint must include auth + permission + csrf guards.
- Use prepared statements only.
- Keep each edited file under 300 lines.
- Update contracts/schemas and architecture docs when interfaces change.
- Run npm run verify:safe before finalizing.
- Return changed files and a concise verification summary.
```

## 3. Phase 1 Prompt
```text
Implement Inventory V2 Phase 1 (Foundation) per src/modules/inventory/roadmap.md.

Goals:
1. Add V2 schema support for products, variants, warehouses, locations, lots, quants, operation headers/lines, stock ledger.
2. Add V2 master endpoints for products/warehouses/locations/lots with role/permission guards.
3. Create new Inventory V2 frontend page shell with Odoo-style tabs and table scaffolds:
   Dashboard, Products, Receipts, Deliveries, Transfers, Production Moves, Adjustments, Counts, Replenishment, Reports, Settings.
4. Add/seed permission keys for inventory.v2.*.
5. Keep legacy inventory untouched.

Deliverables:
1. Backend schema/helpers/endpoints.
2. Frontend route/module shell.
3. Permission wiring.
4. Contract schema stubs for new endpoints.
5. Docs update for introduced interfaces.

Validation:
- npm run verify:safe

Final output format:
1. Summary of implemented scope.
2. File list changed.
3. Verification results.
4. Known follow-ups for Phase 2 only.
```

## 4. Phase 2 Prompt
```text
Implement Inventory V2 Phase 2 (Core Stock Operations) per roadmap.

Goals:
1. Implement operation lifecycle for receipts, deliveries, transfers, adjustments.
2. Add submit/approve/post/cancel actions.
3. Enforce strict no-negative stock based on available quantity.
4. Write immutable stock ledger entries on posting.
5. Build tab tables/forms for Receipts, Deliveries, Transfers, Adjustments with server-side filter/sort/pagination.

Deliverables:
1. Operation posting engine and validation guards.
2. API endpoints for operation actions.
3. Frontend workflows for operation creation and posting.
4. Audit logging for all mutations.
5. Contract schema updates.

Validation:
- npm run verify:safe

Final output format:
1. Implemented behavior summary.
2. File list changed.
3. Verification results.
4. Edge cases handled.
```

## 5. Phase 3 Prompt
```text
Implement Inventory V2 Phase 3 (Sales + Production Integration) per roadmap.

Goals:
1. Build reservation subsystem linked to sales orders (reference_type/reference_id/reference_code).
2. Delivery operations consume reserved stock.
3. Add production operation types:
   - production_consume
   - production_output
4. Expose reservation/fulfillment statuses in Inventory and Sales views where relevant.

Deliverables:
1. Reservation data model + APIs + guards.
2. Sales integration hooks/services for reserve/release/fulfill.
3. Production consume/output posting support.
4. Updated UI tables for Deliveries and Production Moves.
5. Contract/docs updates.

Validation:
- npm run verify:safe

Final output format:
1. Integration points completed.
2. File list changed.
3. Verification results.
4. Any deferred items for Phase 4.
```

## 6. Phase 4 Prompt
```text
Implement Inventory V2 Phase 4 (Counts, Replenishment, Reports) per roadmap.

Goals:
1. Add count sessions and count lines (cycle and annual).
2. Close sessions with variance-to-adjustment posting.
3. Add min/max reorder rules and replenishment suggestions.
4. Build reports:
   on-hand, available, cardex, lot aging, count variance, operations flow.

Deliverables:
1. Count and replenishment APIs/workflows.
2. Reports API with query filters.
3. Counts/Replenishment/Reports tab implementations.
4. Export-ready table structures.
5. Contract/docs updates.

Validation:
- npm run verify:safe

Final output format:
1. Implemented report and count capabilities.
2. File list changed.
3. Verification results.
4. Data assumptions used.
```

## 7. Phase 5 Prompt
```text
Implement Inventory V2 Phase 5 (Hardening + Big-Bang Cutover) per roadmap.

Goals:
1. Prepare production cutover from legacy inventory to V2.
2. Remove all legacy inventory runtime paths (UI, routes, APIs, module wiring).
3. Complete UAT fixes and permission hardening.
4. Finalize docs and operational runbook.

Deliverables:
1. Cutover checklist implementation status.
2. UI/API routing switched to V2.
3. Legacy inventory code removed from runtime and repository paths used by app.
4. Final docs:
   - ARCHITECTURE.md
   - MODULE_CONTRACTS.md
   - inventory roadmap references

Validation:
- npm run verify:safe
- Full smoke flow: receipt -> reserve -> delivery -> count -> report

Final output format:
1. Cutover-ready summary.
2. File list changed.
3. Verification and smoke results.
4. Rollback notes.
5. Explicit proof that no legacy inventory runtime path remains.
```

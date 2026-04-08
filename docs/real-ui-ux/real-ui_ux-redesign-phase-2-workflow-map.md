# Real UI/UX Redesign Phase 2 Workflow Map

Updated: 2026-04-08
Status: Complete
Benchmark workflow: sales order entry plus customer/project intake

## Baseline flow before redesign
1. Operator opens `/orders/new`.
2. Operator configures glass items and builds the order basket.
3. Customer identity is still incomplete or hidden until the final checkout overlay.
4. Operator opens the final checkout overlay to enter name and phone.
5. Customer/project linkage is hidden behind an optional accordion inside that overlay.
6. Quick create/edit actions use browser-native `window.prompt` and `window.confirm`.
7. Submission success and failure are reported through generic browser alerts.

## Baseline friction points
- Customer and project context arrived too late in the workflow.
- Lookup, quick create, and final confirmation were collapsed into one overloaded overlay.
- Browser-native dialogs broke visual continuity and recovery flow.
- Final validation happened at the end, so operators discovered missing context too late.
- Success and error feedback did not teach the next useful action.

## Redesigned Phase 2 flow
1. Operator opens `/orders/new`.
2. Operator fills or verifies customer name and phone in the top order-context surface.
3. If staff linkage is needed, operator opens a dedicated customer/project modal without leaving order entry.
4. Operator searches, selects, or quickly creates the customer, project, and project contact inside shared modal patterns.
5. Operator configures items and reviews the live order basket.
6. Operator opens the final review modal, which now summarizes customer snapshot, linkage state, item count, and total instead of asking for primary data again.
7. Submission returns instructional inline success or failure states, including offline-queue wording when relevant.

## In-scope stale patterns removed
- Hidden customer/project accordion inside the final submit step.
- Browser-native quick-create prompts for customer, project, and project-contact entry in the benchmark flow.
- Browser-native confirmation for customer quick-edit history propagation in the benchmark flow.
- Unused `summary` badge pattern inside the customers directory toolbar.

## KPI comparison notes
- Benchmark flow browser-native dialog count: reduced from 5 (`4` prompts + `1` confirm in the order-entry linkage path) to `0`.
- Benchmark flow submit surface count: moved from `1` overloaded bespoke checkout overlay to `2` focused shared-modal surfaces:
  - customer/project linkage
  - final review and submission
- Order-entry customer snapshot timing: moved from final-step-only entry to always-visible top-of-page entry.

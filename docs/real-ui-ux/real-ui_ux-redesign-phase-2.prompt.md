# Real UI/UX Redesign Phase 2 Prompt

## Objective
Use sales + customer intake as the benchmark workflow and redesign it end-to-end around the new shell and shared system.

## Scope
In scope:
- Order entry
- Customer selection
- Project selection
- Related front-desk task flow where operators create, edit, validate, and submit order data
- Validation, confirmation, submission, and recovery behavior inside this workflow family

Out of scope:
- Broad redesign of unrelated modules
- Cross-module backend rewrites unless a UX blocker requires a narrowly scoped additive change
- Cosmetic-only polish that does not improve throughput, clarity, or error recovery

## Locked decisions
- This is the primary benchmark workflow for KPI comparison.
- Compact, efficient operator UX takes priority over decorative flourish.
- Modals are the default secondary-task surface where they preserve flow.
- Persian RTL-first interaction must remain intact.
- Shared shell, token, action, and state contracts from Phase 1 are authoritative.
- Reduce chrome: fewer cards, fewer badges/tags, and fewer persistent explanation blocks.
- If an explanation is optional, use a small help/tooltip affordance instead of always-visible note text.

## In-scope modules and screens
- `sales`
- `customers`
- Shared surfaces directly supporting customer and project selection inside order entry

## Required repo and doc updates
- Document any workflow-level contract additions in shared frontend docs.
- If a UX blocker requires backend or contract change, keep it additive and update the owning contract docs.
- Update the roadmap with measured KPI deltas against Phase 0 baseline.

## Implementation checklist
- Map the current benchmark workflow step by step before redesigning it.
- Reduce context switching and ambiguous action placement in order entry.
- Improve customer and project lookup, selection clarity, and recovery from invalid input or missing context.
- Standardize validation timing, confirmation thresholds, and submission states.
- Make success, error, and in-progress states instructional instead of generic.
- Remove fragmented local patterns that conflict with the new shared system.
- Strip decorative shell chrome introduced during Phase 1 where it does not improve throughput.
- Remove redundant cards around headers, filters, and top-level controls unless they separate meaningfully distinct surfaces.
- Replace persistent explanatory text with tooltip help affordances wherever the information is useful but not required for constant visibility.

## Verification checklist
- Benchmark workflow can be completed end-to-end without shell or modal confusion.
- Validation and recovery are consistent and understandable.
- Primary actions are clear at every step.
- KPI measurement can compare baseline and redesigned flow using the same method.
- Sales and customers surfaces use the shared system rather than bespoke local conventions.
- Header and toolbar areas avoid decorative tags and redundant wrapper cards.
- Optional guidance appears on demand rather than adding visual noise by default.

## Acceptance criteria
- The benchmark workflow is measurably faster, clearer, or lower-friction than baseline.
- Operators retain context while selecting customers and projects.
- Error handling and confirmations support confidence instead of interrupting flow.

## Roadmap update requirements at phase close
Update `real-ui_ux-redesign-roadmap.md` with:
- What changed in the benchmark workflow
- What remains before workflow standards are reusable elsewhere
- KPI delta versus Phase 0 baseline
- Risks or follow-up needs discovered in sales and customers adoption
- Any adjustments needed for Phase 3

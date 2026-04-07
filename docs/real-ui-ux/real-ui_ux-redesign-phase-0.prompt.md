# Real UI/UX Redesign Phase 0 Prompt

## Objective
Prepare the repository and the redesign program for execution by auditing documentation, defining governance, capturing KPI baselines, and mapping the current UI inconsistency surface.

## Scope
In scope:
- Audit every markdown file in the repository, with special focus on `docs/`, `doc/`, root markdown files, and governance or design-system artifacts.
- Classify each document as `keep`, `rewrite`, or `delete`.
- Remove duplicate mirror docs and stale redesign artifacts when they are not required for operations.
- Produce a deleted docs log with `path`, `action`, and `reason`.
- Define the canonical redesign doc set under `docs/real-ui-ux/`.
- Define the canonical post-cleanup doc set after deletion.
- Capture KPI baselines for the benchmark workflow: sales + customer intake.
- Inventory current shared UI primitives and patterns for shell, navigation, icons, buttons, tables, forms, modals, and states.
- Produce a gap map of inconsistency hot spots and operator-friction themes.

Out of scope:
- Full UI implementation or visual overhaul
- Backend or schema changes unless required only to support measurement or documentation accuracy
- Module-by-module visual cleanup beyond what is needed to document the current state

## Locked decisions
- Workflow-first redesign order
- Compact operator UX
- Aggressive reset allowed
- Desktop-first
- Persian RTL-first with limited operational LTR zones only
- Practical accessibility with strong keyboard support
- Clarity-first state system
- Modals as the default secondary-task surface
- `docs/real-ui-ux/` is the only active redesign planning location

## Required repo and doc updates
- Create or refine the canonical redesign program docs under `docs/real-ui-ux/`.
- Delete old redesign docs that are no longer operationally required.
- Keep the documentation set internally consistent after cleanup.
- Do not leave duplicate active redesign instructions in multiple places.

## Implementation checklist
- Build a markdown inventory of the repository.
- Record classification and rationale for every redesign- or governance-relevant markdown file.
- Delete duplicate mirror docs, stale prompt packs, or contradictory redesign instructions where appropriate.
- Create a deleted docs log in the redesign doc set.
- Identify benchmark tasks for sales + customer intake and define measurable baseline steps.
- Record current shell, action hierarchy, state handling, table behavior, form behavior, and modal behavior.
- Identify the top inconsistency clusters that must shape Phase 1 through Phase 3.
- Capture the review checklist that future phases must reuse.

## Verification checklist
- All markdown files were audited or explicitly excluded with reason.
- The repo has one active redesign planning location.
- The deleted docs log exists and is understandable without tribal knowledge.
- KPI baseline method is documented for the benchmark workflow.
- Pattern inventory covers shell, icons, buttons, tables, forms, modals, and states.
- Gap map clearly identifies where the redesign must focus first.

## Acceptance criteria
- Documentation clutter is reduced and active redesign instructions no longer compete with historical ones.
- Future phases have enough baseline information to measure improvement instead of redesigning by taste alone.
- The roadmap clearly states how every later phase must report progress and deltas.

## Roadmap update requirements at phase close
Update `real-ui_ux-redesign-roadmap.md` with:
- What changed
- What remains
- KPI delta or baseline capture status
- Risks found during audit
- Any phase-sequencing adjustments justified by the audit

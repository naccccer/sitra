# Real UI/UX Redesign Roadmap

Updated: 2026-04-08
Status: Active program, Phase 2 complete
Approval authority: Repository owner
Canonical redesign planning location: `docs/real-ui-ux/`

## Program summary
This program replaces the prior completed redesign narrative with a new active rewrite track focused on operator throughput, consistency, and repository cleanliness.

The redesign direction is fixed:
- Workflow-first execution order
- Compact, operator-oriented UX
- Aggressive reset allowed where it improves clarity and speed
- Primary benchmark workflow: sales + customer intake
- Visual direction: operational-modern, closest to Linear/Attio-style product polish
- Desktop-first by default
- Persian RTL-first, with task-specific LTR zones only where operationally necessary
- Practical internal accessibility with strong keyboard support
- Shared states must optimize for clarity first
- Default secondary-task surface: modals
- Each phase must be independently shippable
- Phase 0 must establish KPI baselines

## Non-negotiable constraints
These constraints remain in force throughout the redesign:
- Respect modular-monolith boundaries from `ARCHITECTURE.md`.
- Keep auth, session, CSRF, CORS, and audit behavior intact.
- Keep prepared SQL for all user input on the backend.
- Preserve locked runtime values for roles and order statuses.
- Keep endpoint wrappers thin and module-owned logic module-local.
- Preserve RTL behavior and Persian UX compatibility.
- Prefer shared frontend primitives over module-local one-off styling.

## Design principles
- Operator efficiency over decoration
- Consistency over local optimization
- Clear action hierarchy
- Dense but readable data surfaces
- Explicit, instructional system states
- Keyboard-friendly interaction
- Desktop-first workspace layouts
- Measured rollout over aesthetic churn
- Chrome restraint over ornamental UI
- Fewer cards, badges, and always-visible helper blocks unless they materially improve task speed
- If explanation is optional, prefer tooltip help affordances over persistent explanatory text

## KPI framework
Phase 0 establishes baselines for the benchmark workflow and the redesign operating model. Every later phase must report deltas against that baseline.

Track at minimum:
- Task completion time for the benchmark workflow
- Click or interaction count for benchmark workflow completion
- Validation or recovery friction count for benchmark workflow completion
- UI consistency debt count for affected scope
- Manual smoke-check pass rate for affected scope

Every phase close must update this roadmap with:
- What changed
- What remains
- KPI delta
- Risks
- Next-phase adjustments

## Governance
- `docs/real-ui-ux/` is the only active redesign planning location.
- Historical redesign-cycle docs should be deleted once they are no longer operationally required.
- Phase 0 must prune duplicate, stale, contradictory, or mirror docs and record each delete decision.
- Shared pattern changes must be adopted program-wide over time, not recreated independently per module.
- If a phase changes UX-facing behavior, the roadmap and the matching phase prompt must be updated in the same change.
- If a UX blocker requires backend or contract change, keep it additive or versioned and update the owning contract docs in the same change.
- Decorative shell/meta tags should not appear by default.
- Cards should group truly distinct operational surfaces, not serve as redundant wrappers around already clear content.
- Optional guidance should default to hover/focus help affordances instead of persistent paragraph copy.

## Expected frontend contract additions
The redesign does not plan backend or database changes by default. It does plan new shared frontend contracts for:
- Shell and navigation configuration
- Design tokens for color, spacing, typography, radii, elevation, motion, and focus
- Shared action hierarchy
- Shared page and workspace layout templates
- Shared table, form, modal, and universal-state behavior

## Acceptance criteria
The program is complete only when all of the following are true:
- Shell and navigation behavior are consistent across modules.
- Buttons and actions follow one hierarchy model.
- Tables share one density, scanning, bulk-action, and state language.
- Forms share one validation, inline-help, submission, and recovery language.
- Modals and any allowed drawers or pages follow one decision model.
- Color, typography, spacing, icons, and state treatments are unified.
- Sales and customer intake workflows are measurably faster and clearer than Phase 0 baseline.
- The active documentation set is operationally lean and free of stale redesign instructions.

## Phase roadmap
### Phase 0: Cleanup, audit, governance, baseline
Objective:
Establish a clean documentation and decision foundation before UI implementation begins.

Deliverables:
- Full markdown audit across the repo, especially `docs/` and `doc/`
- Classification of each document: keep, rewrite, delete
- Deleted docs log with path, action, and reason
- Canonical redesign doc set after duplicate and stale-file deletion
- KPI baseline definition and review checklist
- Inventory of current shell, table, form, modal, icon, button, and state patterns
- Gap map of inconsistency hot spots with sales and customer workflow as the benchmark

### Phase 1: Foundation system and shell
Objective:
Create the shared visual and interaction system, then apply it to the app shell.

Deliverables:
- Left-rail plus workspace-header shell
- New navigation IA for operator speed
- Shared typography, spacing, icon, color, elevation, border, radius, and focus tokens
- Shared action hierarchy
- Shared state grammar for loading, empty, error, success, archived, disabled
- Adoption on the shell and highest-visibility shared surfaces

### Phase 2: Sales + customers benchmark workflows
Objective:
Redesign the highest-value operator workflow first and use it as the proof point for the system.

Deliverables:
- Reworked order entry flow
- Reworked customer and project selection flow
- Reduced context loss and action ambiguity
- Standard validation, confirmation, submission, and recovery behavior for this workflow family
- KPI delta against Phase 0 baseline

### Phase 3: Shared data-entry and data-surface system
Objective:
Standardize the shared interaction grammar for heavy operational surfaces.

Deliverables:
- Shared table rules for density, scanability, row hierarchy, bulk actions, and states
- Shared form rules for grouping, validation timing, error messaging, required-state treatment, and submit states
- Shared modal rules for sizing, layout, footer actions, escape behavior, and close behavior
- Converted shared primitives and templates ready for broad reuse

### Phase 4: Remaining operational modules
Objective:
Apply the system to the remaining active modules in priority order.

Deliverables:
- Inventory, accounting, HR, master-data, users-access, and kernel admin pages aligned to the system
- Removal of duplicate local visual conventions
- Only domain-driven exceptions retained
- Smoke-tested adoption across operationally heavy screens

### Phase 5: Consolidation, polish, long-term governance
Objective:
Remove residual design debt and lock the system against drift.

Deliverables:
- Removal of leftover pre-redesign patterns and dead variants
- Final consistency pass across modules
- Final contribution, review, and maintenance guidance
- Lightweight governance loop that prevents future re-fragmentation
- Final KPI summary, remaining debt log, and rewrite triggers

## Validation expectations
- Use `npm run verify:fast` for scoped frontend phases.
- Use `npm run verify:safe` if a phase touches PHP, contracts, schema behavior, permissions, or cross-module risk areas.
- Include manual smoke checks for affected workflows in every phase.

## Change log template for phase close
Copy this block into the end of the roadmap at each phase close and fill it in:

```md
## Phase X Close Update
- What changed:
- What remains:
- KPI delta:
- Risks:
- Next-phase adjustments:
```

## Assumptions
- Bilingual support is not required now, but the redesign should not block it later.
- Mobile is not a first-class operational target in this program.
- Motion stays restrained; interaction speed and clarity take priority.
- Modals are the default secondary-task surface, but full pages remain valid for primary workflows.
- Phase 0 should prune hard and delete stale redesign-cycle material instead of preserving it.
- Stale redesign-cycle docs should be deleted, not archived, unless a future task explicitly requires retention.

## Phase 0 Close Update
- What changed: audited all repo-owned markdown files, deleted stale redesign-cycle and duplicate mirror docs, restored `docs/ROADMAP.md` to future-only usage, and added Phase 0 audit plus deletion-log artifacts under `docs/real-ui-ux/`.
- What remains: numeric operator timing baselines still need manual or telemetry-backed capture at Phase 1 kickoff, and runtime UI changes have not started yet.
- KPI delta: baseline method established; static consistency baseline captured at 7 bespoke sales overlays, 15 `window.confirm` usages, 2 legacy redirect routes, and 7 routed entry surfaces already using `WorkspaceShellTemplate`.
- Risks: the current sales workflow still bypasses shared shell and modal standards in its most critical surfaces, so Phase 2 risk remains high until those bespoke overlays are removed.
- Next-phase adjustments: Phase 1 should include shell unification rules that explicitly protect the sales benchmark workflow, and Phase 3 should absorb confirm-dialog replacement as a shared-system requirement.

## Phase 1 Close Update
- What changed: established the Phase 1 shell contract in `docs/design-system/foundation-shell-system.md`, introduced a shared token/shell override layer in `src/kernel/styles/ui-foundation.css`, moved the authenticated desktop layout to a persistent left rail plus a single global workspace header, normalized top-level navigation into `ورود سریع` / `عملیات` / `کنترل و پیکربندی`, standardized shared action hierarchy variants (`primary`, `secondary`, `tertiary`, `quiet`, `destructive`, `icon-only`), expanded the universal state grammar to `loading`, `empty`, `error`, `success`, `archived`, and `disabled`, removed duplicate inner workspace headers by default, and aligned shell titles with sidebar wording.
- What remains: `/orders/new` still supports an unauthenticated flow outside the authenticated shared shell, sales still owns the highest-profile bespoke overlays, `window.confirm` remains in workflow-heavy modules pending Phase 2 and Phase 3 adoption, and minor shell alignment polish may still need spot-fixes if any page shows edge drift after the shared changes.
- KPI delta: shared entry-surface coverage via `WorkspaceShellTemplate` increased from 7 routed entry surfaces to 8 shared entry surfaces including dashboard; top-level `showHeader={false}` exceptions dropped from 7 to 0; shell-level `window.confirm` debt did not change and remains 15 usages across workflow surfaces.
- Risks: the left-rail shift changes long-established muscle memory for operators, inventory/accounting nested navigation now depends more heavily on clear tab labeling, and the split authenticated vs unauthenticated order-entry shell can still feel inconsistent until Phase 2 addresses the benchmark workflow.
- Next-phase adjustments: Phase 2 should preserve the simplified shell rules now in place: one global header only, titles that mirror sidebar labels, no decorative tags, fewer redundant cards, and optional explanations behind tooltip-style help affordances; it should also test whether the new left rail actually reduces context switching during order entry, keep sales/customer intake inside the shared shell vocabulary, and prioritize replacing bespoke sales overlays with shared modal/action/state contracts before deeper workflow polish.

## Phase 2 Close Update
- What changed: mapped the benchmark workflow in `docs/real-ui-ux/real-ui_ux-redesign-phase-2-workflow-map.md`, added the shared workflow contract doc `docs/design-system/benchmark-workflow-system.md`, moved customer name/phone capture to a persistent top-of-page order-context surface, introduced a dedicated customer/project linkage modal built from shared primitives, converted final order submission into a review-first shared modal with instructional success and failure states, and pruned the dead badge-summary pattern from the customers directory toolbar.
- What remains: `/orders/new` still has an unauthenticated path outside the authenticated shell, configuration-specific sales overlays (`SettingsModal`, `ManualItemModal`, `ServiceCatalogView`, `HoleMapDesignerView`, `OrdersPaymentManagerModal`, `PatternFilesModal`) still need broader shared-modal adoption, benchmark timing/click measurements still need a live manual capture pass, and repo-wide confirm-dialog replacement remains Phase 3 work.
- KPI delta: browser-native dialogs in the benchmark order-entry linkage path dropped from 5 (`4` prompts + `1` confirm) to `0`; bespoke fixed-overlay sales modals dropped from 7 to 6 after moving checkout to the shared modal contract; customer snapshot entry moved from final-step-only input to an always-visible top workflow surface; scoped verification (`npm run verify:fast`) passed after the redesign slice.
- Risks: operators can still bypass customer/project linkage because it remains a warning rather than a blocker, the split public vs authenticated `/orders/new` shell still creates a mild context shift, and the remaining sales-specific overlays can still dilute consistency if Phase 3 does not absorb them quickly.
- Next-phase adjustments: Phase 3 should promote the benchmark flow rules into reusable form/modal/confirm contracts, replace the remaining bespoke sales overlays, add a shared confirmation pattern to retire browser-native confirms elsewhere, and pair the static KPI deltas above with live operator timing and click-count measurement before broader module rollout.

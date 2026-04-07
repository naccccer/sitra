# Real UI/UX Redesign Phase 3 Prompt

## Objective
Standardize the shared data-entry and data-surface system so dense operational screens behave consistently across modules.

## Scope
In scope:
- Shared table primitives and table behavior
- Shared form primitives and form behavior
- Shared modal primitives and modal behavior
- Bulk actions, row actions, row hierarchy, and data states
- Field grouping, validation timing, required states, error messaging, and submit states

Out of scope:
- Full application-wide module adoption outside representative conversions and shared primitive changes
- Deep domain redesign unrelated to tables, forms, or modals
- Schema or contract churn unless needed to remove a verified UX blocker

## Locked decisions
- Dense but readable operational surfaces
- Clarity-first states
- Modals are the default secondary-task surface
- Shared primitives and templates must absorb the behavior, not local screen-specific hacks
- Keyboard friendliness and RTL integrity remain mandatory

## In-scope representative areas
- Shared UI primitives under `src/components/shared/ui/*`
- Shared workspace templates and state surfaces
- Representative module surfaces that prove table, form, and modal patterns

## Required repo and doc updates
- Update shared component behavior docs when contracts or states change.
- Record any deprecated patterns scheduled for removal in later phases.
- Keep roadmap and phase prompt aligned when scope expands or narrows.

## Implementation checklist
- Define the target table grammar for compact scanability and clear actions.
- Define the target form grammar for grouping, validation, and submission behavior.
- Define the target modal grammar for sizing, structure, footer layout, and close behavior.
- Convert shared primitives and templates to encode these rules.
- Migrate representative screens to prove the contracts are reusable.
- Mark or remove old patterns that directly conflict with the new system.

## Verification checklist
- Tables share consistent density, action placement, and state treatment.
- Forms share consistent validation timing and recovery behavior.
- Modals share consistent layout, footer, and close behavior.
- Representative conversions do not reintroduce bespoke local interaction grammar.
- Shared primitives are flexible enough for later module adoption without new one-off variants.

## Acceptance criteria
- The app now has one reusable data-surface and data-entry language.
- Later module redesign work can focus on domain content rather than re-solving table, form, or modal behavior.
- Old conflicting patterns are identified for removal rather than silently coexisting.

## Roadmap update requirements at phase close
Update `real-ui_ux-redesign-roadmap.md` with:
- What changed in shared tables, forms, and modals
- What legacy patterns remain
- KPI delta or consistency-debt reduction for the affected scope
- Risks in primitive flexibility or migration effort
- Any adjustments needed for Phase 4

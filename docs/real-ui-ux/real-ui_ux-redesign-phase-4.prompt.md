# Real UI/UX Redesign Phase 4 Prompt

## Objective
Apply the new shell, token, action, state, table, form, and modal system to the remaining operational modules in priority order.

## Scope
In scope:
- `inventory`
- `accounting`
- `human-resources`
- `master-data`
- `users-access`
- Kernel admin pages and other shared operational admin surfaces

Out of scope:
- New foundational visual system work that should already be settled by earlier phases
- Domain-unrelated redesign churn that does not improve throughput or consistency
- Breaking backend contract changes unless an additive fix is required to unblock UX quality

## Locked decisions
- Earlier-phase shared system contracts are authoritative.
- Module-specific exceptions are allowed only when clearly domain-driven.
- Compact, desktop-first operator workflows remain the default.
- Persian RTL-first behavior and keyboard-friendly interaction remain mandatory.
- Low-chrome execution remains mandatory: no decorative tags, redundant cards, or always-visible optional help text by default.

## Required repo and doc updates
- Update the roadmap with adoption progress by module cluster.
- Record any true domain-driven exceptions and why they are not debt.
- Remove or deprecate module-local variants that become unnecessary.

## Implementation checklist
- Prioritize the heaviest operational surfaces in each remaining module.
- Replace old local shells, action bars, state surfaces, tables, forms, and modals with shared patterns.
- Resolve module-specific visual drift and duplicated components.
- Keep module logic module-owned while normalizing rendering grammar.
- Capture any remaining debt that must move to Phase 5 instead of quietly persisting.
- Collapse redundant visual wrappers and helper copy introduced during earlier adoption passes.
- Use tooltip/help affordances for optional clarification instead of persistent notes wherever feasible.

## Verification checklist
- Each affected module gets manual smoke checks for navigation, actions, states, tables, and forms.
- No module reintroduces an outdated visual language for convenience.
- Shared primitives cover the real module cases without forcing excessive local overrides.
- Any domain exceptions are explicit and documented.
- Module headers and entry controls remain visually restrained rather than card-heavy.

## Acceptance criteria
- Remaining active modules look and behave like part of one product family.
- Operationally heavy screens no longer rely on legacy local conventions.
- Exceptions are intentional and rare rather than accidental drift.

## Roadmap update requirements at phase close
Update `real-ui_ux-redesign-roadmap.md` with:
- What changed by module cluster
- What legacy patterns still remain
- KPI delta or consistency-debt reduction for the affected modules
- Risks found during broad adoption
- Any final cleanup priorities for Phase 5

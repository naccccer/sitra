# Real UI/UX Redesign Phase 1 Prompt

## Objective
Create the shared visual and interaction foundation for the app, then apply it to the global shell and highest-visibility shared surfaces.

## Scope
In scope:
- Redesign the global shell around a persistent left rail and workspace header.
- Rework navigation IA for operator speed and clarity.
- Define and implement shared tokens for typography, spacing, color, elevation, borders, radii, focus states, and restrained motion.
- Define shared icon usage rules and a single icon language.
- Define the app-wide action hierarchy: primary, secondary, tertiary, destructive, quiet, icon-only.
- Define the shared state grammar for loading, empty, error, success, archived, and disabled.
- Apply the new system to the shell and shared entry surfaces first.

Out of scope:
- Full redesign of every module workflow
- Contract or schema changes unless a UX blocker requires an additive fix
- Broad module-specific table or form rewrites beyond what the shell and shared surface adoption needs

## Locked decisions
- Visual direction: operational-modern with Linear or Attio-like product polish
- Compact density
- Desktop-first layouts
- Persian RTL-first behavior
- Keyboard-friendly navigation and focus handling
- Clarity-first system states
- Prefer shared primitives and tokens over local one-off styling

## In-scope surfaces
- Shared app shell
- Sidebar or left rail navigation
- Workspace and page headers
- Shared action bars, top-level filters, and entry surfaces
- Shared iconography and tokenized visual foundation

## Required repo and doc updates
- Update shared runtime and component docs when shell, state, or action contracts change.
- Keep the roadmap and this phase prompt synchronized if scope changes.
- Note any intentionally deferred shell or state debt for later phases.

## Implementation checklist
- Establish the final shell layout and responsive desktop behavior.
- Normalize top-level navigation grouping and labels for operator speed.
- Standardize header structure, page title treatment, context summary, and action placement.
- Introduce or refine shared tokens for typography, spacing, color, focus, and elevation.
- Define shared visual behavior for state surfaces and action hierarchy.
- Apply the system to the highest-visibility shared surfaces so later phases inherit a stable baseline.

## Verification checklist
- Shell works correctly in RTL desktop layouts.
- Keyboard navigation and focus treatment are coherent.
- Shared action hierarchy is visually obvious and consistently applied.
- Loading, empty, error, success, archived, and disabled states are distinguishable and instructional.
- Visual token usage replaces one-off hardcoded styling in the affected shared surfaces.

## Acceptance criteria
- The product shell feels like one coherent system rather than a collection of module pages.
- Primary actions, navigation, and state surfaces are recognizable at a glance across the affected scope.
- Later module phases can build on a stable foundation instead of redefining shell rules.

## Roadmap update requirements at phase close
Update `real-ui_ux-redesign-roadmap.md` with:
- What changed in the shell and token system
- What shared debt remains before workflow-heavy phases
- KPI delta if any shell-level benchmark was measurable
- Risks in navigation or adoption discovered during rollout
- Any adjustments needed for Phase 2 or Phase 3

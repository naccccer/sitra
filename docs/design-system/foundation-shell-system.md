# Foundation And Shell System

Updated: 2026-04-08
Owner: Shared UI runtime
Scope: Phase 1 shared shell, tokens, action hierarchy, icon language, and universal states

## Runtime contract anchors
- Shared tokens and shell overrides: `src/kernel/styles/ui-foundation.css`
- Global shell layout: `src/components/layout/MainLayout.jsx`
- Left-rail navigation: `src/components/layout/Sidebar.jsx`
- Shell header metadata: `src/components/layout/Header.jsx`, `src/components/layout/shellMeta.js`
- Shared page/workspace entry surfaces: `src/components/shared/ui/WorkspaceShellTemplate.jsx`, `src/components/shared/ui/WorkspacePageHeader.jsx`, `src/components/shared/ui/WorkspaceToolbar.jsx`
- Shared action/state primitives: `src/components/shared/ui/Button.jsx`, `src/components/shared/ui/IconButton.jsx`, `src/components/shared/ui/UniversalState.jsx`, `src/components/shared/ui/InlineAlert.jsx`
- Benchmark workflow contract extension: `docs/design-system/benchmark-workflow-system.md`

## Shell rules
- Desktop shell uses a persistent left rail plus one global workspace header.
- Shell remains RTL-first for copy, focus order, and content alignment even though the rail is visually left-anchored.
- Mobile keeps the rail as an overlay; desktop keeps it persistent and collapsible.
- Workspace pages should use `WorkspaceShellTemplate`, but the inner page header is off by default.
- Do not duplicate titles inside the page body when the global shell header already identifies the page.
- Header metadata comes from `shellMeta.js`; do not duplicate route-title logic inside module pages.
- Global shell titles should match the sidebar label language.
- The shell should stay visually restrained: no decorative environment/meta tags by default.
- Do not add wrapper cards around headers or toolbars unless they separate a truly distinct surface.
- Persistent descriptive paragraphs should be rare; use hover/focus help affordances for optional guidance.
- Do not show blue category text or secondary title lines above the main page title in the global shell header.

## Navigation IA
- Group 1: `ورود سریع`
  - Home, orders, customers
- Group 2: `عملیات`
  - HR, inventory, accounting
- Group 3: `کنترل و پیکربندی`
  - Master data, security/access, owner console

Principles:
- Place operator-frequency destinations before configuration.
- Keep top-level labels short and scan-friendly.
- Use child tabs only when a workspace already has meaningful secondary navigation.

## Token usage
- Colors, borders, radii, elevation, motion, and shell sizing come from `ui-foundation.css`.
- Prefer shared tokens before introducing hardcoded values in shared surfaces.
- Legacy values that still exist in untouched module internals are migration debt, not precedent.

## Action hierarchy
- `primary`
  - Main forward action for the current surface. Usually one per header or panel.
- `secondary`
  - Important but non-dominant action tied to the current task.
- `tertiary`
  - Useful utility or navigation action that should stay visible without overpowering the surface.
- `quiet`
  - Low-emphasis action, inline affordance, or reversible helper.
- `destructive`
  - Irreversible or harmful action. Must stay visually distinct.
- `icon-only`
  - Use `IconButton` with a tooltip and accessible label. Reserve for dense chrome or clearly understood controls.

Compatibility note:
- Legacy variants such as `ghost`, `danger`, and `forest` remain temporarily available for migration safety.
- New shared surfaces should use the Phase 1 hierarchy names.

## Icon language
- Use `lucide-react` as the single icon set for shared shell and shared primitives.
- Default icon sizes:
  - rail and primary shell actions: `16-18`
  - dense buttons and table actions: `13-16`
- Icons support meaning; they do not replace labels on primary actions.
- Icon-only controls must always expose tooltip text and `aria-label`.
- Optional explanatory copy should usually be surfaced through a small help icon with tooltip/popover behavior.

## Universal state grammar
- `loading`
  - Show progress and tell the operator what is being prepared.
- `empty`
  - Explain why nothing is shown and what the next useful action is.
- `error`
  - State the failure plainly and suggest retry or recovery.
- `success`
  - Confirm the outcome and keep momentum toward the next task.
- `archived`
  - Make the record state explicit and point to restore/view behavior.
- `disabled`
  - Clarify that the surface is unavailable because of permission or availability constraints.

Rules:
- Prefer `UniversalState` for full-surface states.
- Prefer `InlineAlert` for inline status or recoverable local issues.
- Avoid inventing one-off state blocks on top-level entry surfaces.

## Phase 1 debt intentionally deferred
- `/orders/new` still supports an unauthenticated path outside the authenticated shared shell.
- Sales benchmark customer/project linking and final confirmation now belong to the Phase 2 workflow contract; remaining sales-specific overlays and repo-wide confirm cleanup remain later-phase debt.
- Module-heavy inner workflows still contain legacy local action ordering that should be normalized during later adoption phases.
- Header alignment and spacing should be treated as visual polish debt if any page still shows minor shell-geometry drift after the shared fixups.

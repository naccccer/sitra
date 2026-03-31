# Sitra ERP UI Roadmap

This document is the execution roadmap for UI unification in Sitra ERP.
It does not override `ARCHITECTURE.md`, `MODULE_CONTRACTS.md`, or `docs/code-map.md`.

## Purpose
- Give Codex a decision-complete roadmap for UI execution.
- Keep the product visually unified without changing behavior, API contracts, response shapes, schema, permissions, CSRF, or module boundaries.
- Turn the current UI work into a reusable system that future modules can follow.

## Locked Direction
- Overall style: minimal, modern, calm, premium ERP.
- Density: semi-compact.
- Primary canvas: dominant soft white with a luxury-clean feel.
- Accent family: deep navy + maroon.
- Navy usage: concentrated in active areas and shell accents, not as a general page wash.
- Maroon usage: restrained premium highlight, not a loud decorative color.
- Corners: soft and rounded.
- Surface flavor: subtle glass and subtle neumorphism only where hierarchy benefits.
- Layout philosophy: show critical information first; reveal secondary information progressively.
- Navigation: icon-first, low-noise, consistent.
- Motion: subtle, short, and purposeful.

## New Locked Requests
- Icons must read as fill-style rather than outline-style.
- Icons must be smaller than the current visual weight.
- All tables must converge to one shared layout and one shared styling recipe.
- Add subtle animation only where it improves clarity or polish.

## Hard Constraints
- No behavior change unless visually necessary and still non-functional.
- No API contract change.
- No response shape change.
- No schema change.
- No new cross-module dependencies.
- Keep module boundaries intact.
- Keep permissions, auth, CSRF, and audit behavior intact.
- Keep endpoint adapters thin.
- Preserve RTL and Persian UX compatibility.
- Preserve print behavior and print classes.
- Prefer shared UI fixes over page-local visual patches.

## Phase Status

Last updated: 2026-03-31

| Phase | Status | Notes |
|---|---|---|
| Phase 0 - UI Audit | completed | Audit completed and reference pages identified. |
| Phase 1 - Tokens and Surface Language | completed | Token layer established and later corrected toward white + navy + maroon. |
| Phase 2 - Shared Primitives | completed | Core shared primitives migrated onto the token system. |
| Phase 3 - Shell Redesign | completed | Main shell, header, sidebar, and nav states refreshed. |
| Phase 4 - Page Recipes | completed | Shared page-level recipe layer landed. |
| Phase 5 - Reference Rollout | completed | Dashboard, orders workspace, and customers reference slice refreshed. |
| Phase 6 - Module Rollout | in progress | `sales` slice completed; next slice is `customers`. |
| Phase 7 - Polish and Documentation | pending | Final convergence pass after active modules are aligned. |

## System Rules

### 1. Foundation
- White is the dominant canvas.
- Shell gradients must be very restrained.
- Decorative color wash must remain minimal.
- Glass belongs mainly to shell-level surfaces, premium wrappers, and limited overlays.
- Neumorphism belongs mainly to icon chips, soft inset controls, and small support surfaces.
- Dense operational areas must stay flatter than overview cards.

### 2. Icons
- Default icon size should trend smaller than the current implementation.
- Icons should feel filled or visually solid, not thin and outline-heavy.
- Shared icon treatment must be unified:
  - nav icons
  - action icons
  - stat icons
  - quick-action chips
- Preferred implementation order:
  1. Reduce icon size and increase visual solidity through shared wrappers and color treatment.
  2. Where the current outline icon set still feels too thin, replace high-frequency icons with shared filled SVGs in the shared UI layer.
  3. Do not add a new icon dependency unless the shared SVG approach proves insufficient.
- Icon-only controls must keep a clear `title`.

### 3. Active States
- Active states must be solid-filled, not border-led.
- Navy is the default active color for:
  - navigation
  - tabs
  - segmented controls
  - selected chips
  - primary actions
- Maroon is reserved for premium emphasis or limited support accents, not routine active state usage.

### 4. Tables
- All operational tables must converge to one shared recipe.
- Every table should share the same structure baseline:
  - consistent outer shell
  - consistent header row treatment
  - consistent row height and padding
  - consistent hover state
  - consistent empty/loading/footer behavior
  - consistent row action sizing and placement
- Table-heavy pages should use `TableShell` or its direct successor rather than ad hoc local wrappers.
- Glass and neumorphism must not be used inside dense data grids if readability drops.
- Table density should remain semi-compact and stable across modules.

### 5. Motion
- Motion must be subtle and purposeful.
- Allowed motion patterns:
  - page enter fade/slide
  - modal enter/exit
  - accordion and disclosure open/close
  - tab highlight movement
  - loading shimmer or pulse where already appropriate
- Motion must stay short and non-blocking.
- No decorative looping motion.
- No motion that slows operational work.

### 6. Progressive Disclosure
- Toolbars should expose only primary actions and core filters.
- Secondary actions should move into:
  - icon buttons
  - menus
  - collapsible sections
  - detail drawers or modal flows
- Top-of-page descriptive copy is optional and should be removed when it adds noise instead of clarity.

## Canonical Targets
- Global tokens and utilities:
  - `src/index.css`
- Shared UI layer:
  - `src/components/shared/ui/*`
- App shell:
  - `src/components/layout/MainLayout.jsx`
  - `src/components/layout/Header.jsx`
  - `src/components/layout/Sidebar.jsx`
  - `src/components/layout/sidebarNav.js`
- Reference pages:
  - `src/pages/DashboardPage.jsx`
  - `src/modules/sales/components/admin/AdminOrdersView.jsx`
  - `src/modules/customers/components/CustomersDirectoryPanel.jsx`

## Phase Plan

### Phase 0 - UI Audit
Status:
- Completed on 2026-03-31.

Intent:
- Identify the current shared layer, shell layer, and reference pages.

Completed outcomes:
- Shared primitives were confirmed as the correct starting point.
- Shell-first redesign was confirmed as the lowest-risk path.
- Dashboard, orders workspace, and customers directory were locked as reference pages.
- Print surfaces were marked as sensitive and protected.

### Phase 1 - Tokens and Surface Language
Status:
- Completed on 2026-03-31.

Intent:
- Define the product-wide visual vocabulary in one place.

Completed outcomes:
- Token layer landed in `src/index.css`.
- Surface utilities were introduced for cards, glass, inset, accent, and icon chips.
- Foundation was later corrected toward:
  - dominant soft white
  - deep navy active emphasis
  - maroon premium accent

Locked outcomes:
- White remains dominant.
- Glass is available but not default.
- Neumorphism stays secondary.

### Phase 2 - Shared Primitives
Status:
- Completed on 2026-03-31.

Intent:
- Make shared primitives the single source of truth for visual consistency.

Completed outcomes:
- `Button`, `Card`, `Input`, `Select`, `Badge`, `ModalShell`, and `EmptyState` were retuned onto the token system.
- Additive appearance props were introduced without breaking existing call sites.

Locked outcomes:
- Compatibility props remain intact.
- Shared primitives must continue to absorb new visual rules instead of page-local styling multiplying.

### Phase 3 - Shell Redesign
Status:
- Completed on 2026-03-31.

Intent:
- Make the shell feel unified before broad page rollout.

Completed outcomes:
- Main layout, header, sidebar, and nav state styling were refreshed.
- Active nav states moved toward solid emphasis.
- Shell accents were reduced so pages can carry the main operational content.

Locked outcomes:
- Shell owns the strongest glass treatment.
- Navy should stay concentrated in active states and shell accents.

### Phase 4 - Page Recipes
Status:
- Completed on 2026-03-31.

Intent:
- Standardize reusable page-level patterns.

Completed outcomes:
- Shared recipes were added for:
  - `PageHeader`
  - `StatsStrip`
  - `StatCard`
  - `FilterToolbar`
  - `WorkspaceCard`
  - `TableShell`
  - `StatusBanner`
  - `LoadingState`

Locked outcomes:
- Shared recipes are the default path for page construction.
- Table-heavy screens must converge through the shared table recipe, not local wrappers.

### Phase 5 - Reference Rollout
Status:
- Completed on 2026-03-31.

Intent:
- Prove the system on representative pages.

Completed outcomes:
- Dashboard, sales workspace, and customers reference slice were refreshed.
- Redundant top-of-page copy was reduced where it added noise.
- The latest corrective pass simplified dashboard and orders workspace further.

Locked outcomes:
- Reference pages should stay as the visual benchmark for later slices.

### Phase 6 - Module Rollout
Status:
- In progress as of 2026-03-31.

Completed module slices:
- `sales`

Next module:
- `customers`

Execution order:
1. `customers`
2. `inventory`
3. `human-resources`
4. `accounting`
5. `master-data`
6. `users-access`

Mandatory tasks for every remaining module:
- Replace local page wrappers with shared recipes where possible.
- Move every list/table screen onto the shared table recipe.
- Normalize row actions, badges, filters, and empty states.
- Reduce icon size and move icon treatment toward the shared fill-style direction.
- Remove redundant page-intro copy where it does not add operational value.
- Keep behavior, queries, permissions, and module boundaries intact.

New mandatory corrective tasks before broad continuation:
- Add a shared icon strategy in the shared UI layer so icons become smaller and visually solid.
- Unify all table layouts and visual states through the shared table recipe.
- Add subtle motion primitives for:
  - page entry
  - tabs
  - disclosure sections
  - modal transitions

Validation:
- `npm run verify:fast` after each module slice
- `npm run build` after broad shared visual changes

### Phase 7 - Polish and Documentation
Status:
- Pending.

Intent:
- Close visual drift, edge cases, and future guidance.

Tasks:
- Review dense forms, long tables, empty states, archived states, and error banners.
- Review icon sizing and visual solidity one more time across all active modules.
- Review motion for consistency and restraint.
- Review mobile overflow and RTL alignment.
- Review print surfaces for regressions.
- Refresh lightweight contributor guidance for future UI work if needed.

Validation:
- `npm run verify:fast`
- `npm run build`

## Current Historical Notes
- `sales` rollout has already been completed through its current slice without changing workflow behavior.
- The foundation has already been corrected away from olive/bronze.
- The current live direction is now:
  - white-dominant
  - navy in active areas and shell accents
  - maroon as restrained premium accent
  - reduced top-of-page noise

## Codex Execution Rules
- Execute phases in order.
- Keep diffs focused by phase or corrective sweep.
- When touching a page, prefer shared primitives or shared recipes over local patterns.
- If a visual need appears in at least two pages, solve it in shared UI first.
- If a table diverges from the shared recipe, bring the page back to the shared recipe instead of forking a second table pattern.
- If the current icon set cannot satisfy the fill-style requirement cleanly, introduce shared SVG icons before introducing any new package.
- If a planned effect conflicts with clarity, density, RTL quality, or operational speed, clarity wins.
- After every completed phase or corrective sweep, update this roadmap in the same change:
  - phase status
  - completed outcomes
  - locked decisions
  - carry-over items
  - validation result

## Done Definition
- The app feels like one product across shell, shared primitives, and active modules.
- White is the dominant canvas.
- Navy appears mainly in active areas and shell accents.
- Maroon is restrained and premium.
- Icons are smaller and visually solid rather than outline-heavy.
- Tables share one layout language and one styling system.
- Motion is subtle and helpful, never noisy.
- Progressive disclosure keeps screens clean.
- Architecture, contracts, permissions, CSRF, and print behavior remain intact.

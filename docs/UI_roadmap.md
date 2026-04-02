# UI Roadmap For Sitra ERP

## Summary
- Ù‡Ø¯Ù Ø§ÛŒÙ† roadmap Ø³Ø§Ø®Øª ÛŒÚ© UI system Ù…Ù†Ø³Ø¬Ù…ØŒ Ù…ÛŒÙ†ÛŒÙ…Ø§Ù„ØŒ Ø³ÙÛŒØ¯Ù…Ø­ÙˆØ±ØŒ Ø¢ÛŒÚ©ÙˆÙ†â€ŒÙ…Ø­ÙˆØ± Ùˆ Ø­Ø±ÙÙ‡â€ŒØ§ÛŒ Ø¨Ø±Ø§ÛŒ Ú©Ù„ Ø§Ù¾ Ø§Ø³ØªØ› Ø¨Ø§ Ø§ÙˆÙ„ÙˆÛŒØª ØµØ±ÛŒØ­ Ø±ÙˆÛŒ readabilityØŒ Ø³Ø±Ø¹Øª Ú©Ø§Ø±ØŒ Ùˆ utility.
- Ø§Ø¬Ø±Ø§ÛŒ roadmap ÙÙ‚Ø· Ø¯Ø± Ù„Ø§ÛŒÙ‡â€ŒÛŒ frontend/shared UI Ø§Ù†Ø¬Ø§Ù… Ù…ÛŒâ€ŒØ´ÙˆØ¯ Ùˆ Ù‡ÛŒÚ† ØªØºÛŒÛŒØ±ÛŒ Ø¯Ø± Ù…Ø¹Ù…Ø§Ø±ÛŒ modular monolithØŒ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯Ù‡Ø§ÛŒ backendØŒ ÛŒØ§ Ù…Ø±Ø²Ù‡Ø§ÛŒ Ù…Ø§Ú˜ÙˆÙ„ÛŒ Ø§ÛŒØ¬Ø§Ø¯ Ù†Ù…ÛŒâ€ŒÚ©Ù†Ø¯.
- ØªØ±ØªÛŒØ¨ rollout: `foundation -> shell -> shared patterns -> daily ops -> data modules -> auth/polish`.
- Ø¬Ù‡Øª Ø¨ØµØ±ÛŒ Ù†Ù‡Ø§ÛŒÛŒ: `bold minimal` Ø¨Ø§ base Ø³ÙÛŒØ¯ØŒ charcoalØŒ accent Ú¯Ø±Ù…ØŒ radius Ù†Ø±Ù…ØŒ motion Ø­Ø¯Ø§Ù‚Ù„ÛŒØŒ Ùˆ ØªØ§Ú©ÛŒØ¯ Ø¨Ø± consistency Ùˆ function.
- Ù‡Ø± ÙØ§Ø² Ø¨Ø§ÛŒØ¯ Ù…Ø³ØªÙ‚Ù„ØŒ Ú©ÙˆÚ†Ú©ØŒ Ù‚Ø§Ø¨Ù„ verify Ùˆ Ù‚Ø§Ø¨Ù„ ØªÙˆÙ‚Ù Ø¨Ø§Ø´Ø¯.

## Global UI Rules
- The admin orders workspace (`src/modules/sales/components/admin/AdminOrdersView.jsx`, `src/modules/sales/components/admin/orders-workspace/OrdersWorkspaceToolbar.jsx`, `src/modules/sales/components/admin/orders-workspace/OrdersWorkspaceTable.jsx`) is the canonical reference for shared workspace and table behavior.
- The approved shared primitive set for rollout is limited to the orders-used workspace/table/button patterns: `Button`, `Input`, `Select`, `Badge`, `IconButton`, `PaginationBar`, `WorkspaceToolbar`, `FilterRow`, `SegmentedTabs`, `DataTable`, `DataTableHead`, `DataTableBody`, `DataTableRow`, `DataTableCell`, `DataTableHeaderCell`, `DataTableActions`, `DataTableDetail`, and `DataTableState`.
- Any new shared workspace or table behavior must either fit that set or be documented as a specific gap before it is adopted broadly.
- Shared table-row controls should use the neutral table action surface (`surface="table"`) instead of repeating local white-control overrides inside module tables.
- Inline pill-style status editors should use the shared `SelectPill` primitive so orders-style editable state controls stay reusable and module-agnostic.
- Shared detail rows may expose a summary slot before nested content, and shared pagination may expose a continuation slot when a workspace needs footer paging plus load-more behavior.
- Ù‡Ù…Ù‡â€ŒÛŒ actionÙ‡Ø§ÛŒ Ù¾Ø±ØªÚ©Ø±Ø§Ø± Ø¨Ø§ÛŒØ¯ Ø¯Ø± Ú©Ù„ Ø§Ù¾ ÛŒÚ© Ø²Ø¨Ø§Ù† Ù…Ø´ØªØ±Ú© Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ù†Ø¯.
- actionÙ‡Ø§ÛŒ `create`, `edit`, `delete`, `archive`, `restore`, `print`, `save`, `cancel`, `reload`, `filter` Ùˆ `open details` Ø¨Ø§ÛŒØ¯ ÙÙ‚Ø· Ø§Ø² shared variants Ùˆ shared icon/action patterns Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†Ù†Ø¯.
- actionÙ‡Ø§ÛŒ destructive Ø¯Ø± Ù‡Ù…Ù‡â€ŒØ¬Ø§ Ø¨Ø§ÛŒØ¯ toneØŒ icon treatmentØŒ hover state Ùˆ confirmation behavior Ù‡Ù…â€ŒØ®Ø§Ù†ÙˆØ§Ø¯Ù‡ Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ù†Ø¯.
- Ù‡Ù…Ù‡â€ŒÛŒ tableÙ‡Ø§ Ø¨Ø§ÛŒØ¯ ÛŒÚ© visual system Ù…Ø´ØªØ±Ú© Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ù†Ø¯.
- table headerØŒ row spacingØŒ selected rowØŒ hover stateØŒ status cellØŒ action cellØŒ empty stateØŒ loading state Ùˆ pagination Ø¨Ø§ÛŒØ¯ pattern Ù…Ø´ØªØ±Ú© Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ù†Ø¯.
- Ù‡ÛŒÚ† Ù…Ø§Ú˜ÙˆÙ„ÛŒ Ù…Ø¬Ø§Ø² Ù†ÛŒØ³Øª style table ÛŒØ§ action pattern Ø§Ø®ØªØµØ§ØµÛŒ Ø¬Ø¯ÛŒØ¯ Ø¨Ø³Ø§Ø²Ø¯ØŒ Ù…Ú¯Ø± Ù†ÛŒØ§Ø² domain-specific Ø¢Ù† ØµØ±ÛŒØ­ Ø«Ø¨Øª Ùˆ Ù…Ø³ØªÙ†Ø¯ Ø´ÙˆØ¯.
- badgeÙ‡Ø§ØŒ status pillsØŒ toolbarÙ‡Ø§ØŒ filter rowÙ‡Ø§ØŒ drawer/modal headerÙ‡Ø§ Ùˆ section headerÙ‡Ø§ Ø¨Ø§ÛŒØ¯ shared Ùˆ ØªÚ©Ø±Ø§Ø±Ù¾Ø°ÛŒØ± Ø¨Ø§Ø´Ù†Ø¯.
- glass/gradient ÙÙ‚Ø· Ø¯Ø± shellØŒ login Ùˆ highlight surfaces Ù…Ø¬Ø§Ø² Ø§Ø³ØªØ› Ù†Ù‡ Ø¯Ø± data tables Ùˆ Ù†Ù‡ Ø¯Ø± ÙØ±Ù…â€ŒÙ‡Ø§ÛŒ data-heavy.
- print Ùˆ invoice surfaces Ø§Ø² redesign Ø¹Ù…ÙˆÙ…ÛŒ Ù†Ø¨Ø§ÛŒØ¯ Ø¢Ø³ÛŒØ¨ Ø¨Ø¨ÛŒÙ†Ù†Ø¯.

## Phases

### Phase 0 - UI Audit Baseline
- Ø«Ø¨Øª baseline Ø§Ø² shellØŒ dashboardØŒ ordersØŒ customersØŒ inventoryØŒ accountingØŒ loginØŒ modalÙ‡Ø§ Ùˆ tableÙ‡Ø§.
- Ø´Ù†Ø§Ø³Ø§ÛŒÛŒ component debtØŒ style driftØŒ one-off patternÙ‡Ø§ Ùˆ visual inconsistencyÙ‡Ø§.
- Ø«Ø¨Øª Ù…ÙˆØ§Ø±Ø¯ÛŒ Ú©Ù‡ Ø§Ù„Ø§Ù† Ø¨ÛŒÙ† Ù…Ø§Ú˜ÙˆÙ„â€ŒÙ‡Ø§ ÛŒÚ©Ø³Ø§Ù† Ù†ÛŒØ³ØªÙ†Ø¯:
  - action buttons
  - status badges
  - data tables
  - filters/toolbars
  - modal headers/footers
  - empty/loading/error states
- ØªØ¹ÛŒÛŒÙ† migration order Ø¨Ø±Ø§ÛŒ shared primitives.

### Phase 1 - Visual Foundation
- ØªØ¹Ø±ÛŒÙ design tokens Ø¯Ø± `src/index.css` Ø¨Ø±Ø§ÛŒ:
  - color
  - surface
  - semantic state
  - border
  - shadow
  - radius
  - focus ring
  - motion
- ØªØ«Ø¨ÛŒØª visual language Ø³ÙÛŒØ¯Ù…Ø­ÙˆØ± Ø¨Ø§ accent Ú¯Ø±Ù… Ùˆ usage Ù…Ø­Ø¯ÙˆØ¯ Ø¨Ø±Ø§ÛŒ highlight surfaces.
- ØªØ¹Ø±ÛŒÙ base utility classes Ø¨Ø±Ø§ÛŒ surfaceØŒ section hierarchy Ùˆ workspace polish.

### Phase 2 - App Shell
- Ø¨Ø§Ø²Ø·Ø±Ø§Ø­ÛŒ `app-shell`, `Header`, `Sidebar` Ùˆ Ø±ÙØªØ§Ø± navigation Ø¨Ø§ Ø§Ù„Ú¯ÙˆÛŒ `Hybrid Rail`.
- Ø§Ø¶Ø§ÙÙ‡â€ŒÚ©Ø±Ø¯Ù† tooltip Ø¨Ø±Ø§ÛŒ Ø­Ø§Ù„Øªâ€ŒÙ‡Ø§ÛŒ icon-only.
- ÛŒÚ©Ø¯Ø³Øªâ€ŒØ³Ø§Ø²ÛŒ stateÙ‡Ø§ÛŒ hover, active, focus Ùˆ mobile drawer.
- ØªØ¹Ø±ÛŒÙ shell behavior Ø¨Ù‡â€ŒØ¹Ù†ÙˆØ§Ù† Ø§Ù„Ú¯ÙˆÛŒ Ù…Ø±Ø¬Ø¹ Ø¨Ø±Ø§ÛŒ Ù…Ø§Ú˜ÙˆÙ„â€ŒÙ‡Ø§ÛŒ Ø¢ÛŒÙ†Ø¯Ù‡.

### Phase 3 - Shared UI Primitives
- Ø§Ø³ØªØ§Ù†Ø¯Ø§Ø±Ø¯Ø³Ø§Ø²ÛŒ `Button`, `Input`, `Select`, `Card`, `Badge`, `ModalShell`, `EmptyState`.
- Ø§ÙØ²ÙˆØ¯Ù† primitives Ø¬Ø¯ÛŒØ¯:
  - `Tooltip`
  - `IconButton`
  - `SectionHeader`
  - `InlineAlert`
  - `StatCard`
- ØªØ¹Ø±ÛŒÙ variantÙ‡Ø§ÛŒ ØµØ±ÛŒØ­ Ø¨Ø±Ø§ÛŒ actionÙ‡Ø§:
  - primary
  - secondary
  - ghost
  - success
  - danger
  - accent
- ØªØ¹Ø±ÛŒÙ action mapping Ø«Ø§Ø¨Øª Ø¨Ø±Ø§ÛŒ use caseÙ‡Ø§ÛŒ Ù¾Ø±ØªÚ©Ø±Ø§Ø±:
  - edit
  - delete
  - archive
  - restore
  - print
  - refresh
  - row expand
- Ø§Ø¬Ø¨Ø§Ø± ØªØ¯Ø±ÛŒØ¬ÛŒ ØµÙØ­Ø§Øª Ø¬Ø¯ÛŒØ¯ Ø¨Ù‡ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø§Ø² shared primitives.

### Phase 4 - Data Workspace Patterns
- Ø³Ø§Ø®Øª Ø§Ù„Ú¯ÙˆÙ‡Ø§ÛŒ Ù…Ø´ØªØ±Ú© Ø¨Ø±Ø§ÛŒ:
  - page header
  - action toolbar
  - filter row
  - table shell
  - table states
  - empty/loading/error states
  - modal/drawer content
  - pagination
- ØªØ¹Ø±ÛŒÙ `one table family` Ø¨Ø±Ø§ÛŒ Ú©Ù„ Ø§Ù¾:
  - head styling
  - row density
  - zebra/hover/select logic
  - action column pattern
  - status column pattern
  - detail expansion container
- Ú©Ø§Ù‡Ø´ style duplication Ø¯Ø± ØµÙØ­Ø§Øª data-heavy.

### Phase 5 - Daily Ops Rollout
- rollout Ø±ÙˆÛŒ `Dashboard` Ùˆ `Sales Orders`.
- ÛŒÚ©Ø¯Ø³Øªâ€ŒØ³Ø§Ø²ÛŒ stat cardsØŒ summary panelsØŒ toolbarÙ‡Ø§ØŒ tableÙ‡Ø§ØŒ badgeÙ‡Ø§ Ùˆ action clusters.
- orders page Ø¨Ø§ÛŒØ¯ Ø¨Ù‡â€ŒØ¹Ù†ÙˆØ§Ù† Ù…Ø±Ø¬Ø¹ Ø§Ø³ØªØ§Ù†Ø¯Ø§Ø±Ø¯ table/action workspace Ø¨Ø±Ø§ÛŒ rollout Ø¨Ø¹Ø¯ÛŒ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø´ÙˆØ¯.

### Phase 6 - Module Rollout
- rollout Ù…Ø±Ø­Ù„Ù‡â€ŒØ§ÛŒ Ø±ÙˆÛŒ:
  - `customers`
  - `inventory`
  - `accounting`
  - `human-resources`
  - `users-access`
  - `master-data`
- Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø§Ø² primitives Ùˆ patternÙ‡Ø§ÛŒ Ù…Ø´ØªØ±Ú© Ø¨Ù‡â€ŒØ¬Ø§ÛŒ style logic Ù¾Ø±Ø§Ú©Ù†Ø¯Ù‡.
- Ø¯Ø± Ù‡Ø± Ù…Ø§Ú˜ÙˆÙ„ Ø¨Ø§ÛŒØ¯ actionÙ‡Ø§ Ùˆ tableÙ‡Ø§ Ø¨Ù‡ family Ù…Ø´ØªØ±Ú© migrate Ø´ÙˆÙ†Ø¯ØŒ Ù†Ù‡ ÙÙ‚Ø· palette Ùˆ spacing.

### Phase 7 - Auth And Brand Polish
- Ø¨Ø§Ø²Ø·Ø±Ø§Ø­ÛŒ `LoginView` Ùˆ entry surfaces Ø¨Ø§ Ù‡Ù…Ø§Ù† visual language.
- Ø§Ø³ØªÙØ§Ø¯Ù‡â€ŒÛŒ Ú©Ù†ØªØ±Ù„â€ŒØ´Ø¯Ù‡ Ø§Ø² gradient/glow ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ø­Ø³ premium Ùˆ Ù†Ù‡ Ø¨Ø±Ø§ÛŒ Ø´Ù„ÙˆØºÛŒ.
- login Ø¨Ø§ÛŒØ¯ Ø¨Ø§ shell Ù‡Ù…â€ŒØ®Ø§Ù†ÙˆØ§Ø¯Ù‡ Ø¨Ø§Ø´Ø¯ØŒ Ù†Ù‡ ÛŒÚ© UI Ø¬Ø¯Ø§.

### Phase 8 - Final Consistency Pass
- Ø­Ø°Ù style duplication Ùˆ Ú©Ù„Ø§Ø³â€ŒÙ‡Ø§ÛŒ ad-hoc.
- Ø«Ø¨Øª guardrailÙ‡Ø§ÛŒ Ø§Ø¬Ø±Ø§ÛŒÛŒ Ø¨Ø±Ø§ÛŒ featureÙ‡Ø§ÛŒ Ø¢ÛŒÙ†Ø¯Ù‡.
- Ø¨Ø±Ø±Ø³ÛŒ Ù†Ù‡Ø§ÛŒÛŒ RTLØŒ keyboard usability Ùˆ print safety.
- Ø¨Ø±Ø±Ø³ÛŒ Ù†Ù‡Ø§ÛŒÛŒ consistency Ø¨Ø±Ø§ÛŒ:
  - action system
  - table system
  - shared status language
  - page hierarchy

## Phase Completion Rule
- Ø¯Ø± Ù¾Ø§ÛŒØ§Ù† Ù‡Ø± ÙØ§Ø²ØŒ Ø§Ø¬Ø±Ø§ÛŒ Ø¢Ù† ÙØ§Ø² Ø¨Ø§ÛŒØ¯ Ù…ØªÙˆÙ‚Ù Ø´ÙˆØ¯.
- Ø¨Ø¹Ø¯ Ø§Ø² Ù¾Ø§ÛŒØ§Ù† Ù‡Ø± ÙØ§Ø²ØŒ Ù‡Ù…ÛŒÙ† ÙØ§ÛŒÙ„ `docs/UI_roadmap.md` Ø¨Ø§ÛŒØ¯ update Ø´ÙˆØ¯.
- update Ù‡Ø± ÙØ§Ø² Ø¨Ø§ÛŒØ¯ Ø­Ø¯Ø§Ù‚Ù„ Ø´Ø§Ù…Ù„ Ø§ÛŒÙ† Ù…ÙˆØ§Ø±Ø¯ Ø¨Ø§Ø´Ø¯:
  - ÙØ§Ø² Ú©Ø§Ù…Ù„â€ŒØ´Ø¯Ù‡
  - ØªØ§Ø±ÛŒØ® ØªÚ©Ù…ÛŒÙ„
  - ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ø§ØµÙ„ÛŒ ØªØºÛŒÛŒØ±Ú©Ø±Ø¯Ù‡
  - Ø§Ù„Ú¯ÙˆÙ‡Ø§ÛŒ Ø¬Ø¯ÛŒØ¯ ØªØ«Ø¨ÛŒØªâ€ŒØ´Ø¯Ù‡
  - Ø§Ú¯Ø± Ú†ÛŒØ²ÛŒ defer Ø´Ø¯Ù‡ØŒ Ø¯Ù„ÛŒÙ„ defer
- ÙØ§Ø² Ø¨Ø¹Ø¯ÛŒ ÙÙ‚Ø· Ø¨Ø¹Ø¯ Ø§Ø² Ø«Ø¨Øª Ø§ÛŒÙ† update Ø¯Ø± roadmap Ø´Ø±ÙˆØ¹ Ù…ÛŒâ€ŒØ´ÙˆØ¯.

## Tracking Template
Ø¯Ø± Ù¾Ø§ÛŒØ§Ù† Ù‡Ø± ÙØ§Ø²ØŒ ÛŒÚ© entry Ø¨Ø§ Ø§ÛŒÙ† ÙØ±Ù…Øª Ø¨Ù‡ roadmap Ø§Ø¶Ø§ÙÙ‡ Ø´ÙˆØ¯:

```md
## Phase Log

### Completed: Phase 1 - Visual Foundation
- Date: 2026-03-31
- Status: done
- Key files:
  - `docs/UI_roadmap.md`
  - `src/index.css`
  - `src/components/shared/ui/index.js`
  - `src/components/shared/ui/Badge.jsx`
  - `src/components/shared/ui/Button.jsx`
  - `src/components/shared/ui/Card.jsx`
  - `src/components/shared/ui/EmptyState.jsx`
  - `src/components/shared/ui/Input.jsx`
  - `src/components/shared/ui/Select.jsx`
  - `src/components/shared/ui/IconButton.jsx`
  - `src/components/shared/ui/InlineAlert.jsx`
  - `src/components/shared/ui/SectionHeader.jsx`
  - `src/components/shared/ui/StatCard.jsx`
  - `src/components/shared/ui/Tooltip.jsx`
- Standardized:
  - design tokens for the shared visual language in `src/index.css`
  - shared action variants and focus/motion states through the core UI primitives
  - reusable action, alert, section, stat, and tooltip patterns for later rollout phases
- Deferred:
  - app shell rollout moved to `Phase 2 - App Shell`
  - shared table family and module/page rollout moved to later phases

### Completed: Phase 2 - App Shell
- Date: 2026-03-31
- Status: done
- Key files:
  - `docs/UI_roadmap.md`
  - `src/components/layout/MainLayout.jsx`
  - `src/components/layout/Header.jsx`
  - `src/components/layout/Sidebar.jsx`
  - `src/components/layout/sidebarNav.js`
- Standardized:
  - hybrid-rail shell behavior with a persistent desktop collapsed state
  - icon-only sidebar states backed by shared tooltip behavior
  - shared hover, active, focus, and mobile drawer treatment across the shell navigation
- Deferred:
  - table family rollout remains in later roadmap phases
  - module/page-level adoption remains outside `Phase 2 - App Shell`

### Completed: Phase 3 - Shared UI Primitives
- Date: 2026-03-31
- Status: done
- Key files:
  - `docs/UI_roadmap.md`
  - `src/components/shared/ui/actionPresets.js`
  - `src/components/shared/ui/index.js`
  - `src/components/shared/ui/Button.jsx`
  - `src/components/shared/ui/Input.jsx`
  - `src/components/shared/ui/Select.jsx`
  - `src/components/shared/ui/Card.jsx`
  - `src/components/shared/ui/Badge.jsx`
  - `src/components/shared/ui/EmptyState.jsx`
  - `src/components/shared/ui/ModalShell.jsx`
  - `src/components/shared/ui/IconButton.jsx`
  - `src/components/shared/ui/InlineAlert.jsx`
  - `src/components/shared/ui/SectionHeader.jsx`
  - `src/components/shared/ui/StatCard.jsx`
- Standardized:
  - explicit shared action presets for create/edit/delete/archive/restore/print/save/cancel/reload/filter/open details/row expand
  - shared primitive state APIs for button loading, input/select validation sizing, card interactivity, and accent badge usage
  - reusable modal, empty, alert, section, stat, and icon-button patterns aligned with the new visual system
- Deferred:
  - page-level adoption of the new action presets remains for later rollout phases
  - one shared table family remains in `Phase 4 - Data Workspace Patterns`

### Completed: Phase 4 - Data Workspace Patterns
- Date: 2026-03-31
- Status: done
- Key files:
  - `docs/UI_roadmap.md`
  - `src/components/shared/ui/DataTable.jsx`
  - `src/components/shared/ui/PaginationBar.jsx`
  - `src/components/shared/ui/WorkspacePageHeader.jsx`
  - `src/components/shared/ui/WorkspaceToolbar.jsx`
  - `src/components/shared/ui/FilterRow.jsx`
  - `src/components/shared/ui/WorkspaceDetailPanel.jsx`
  - `src/components/shared/ui/index.js`
- Standardized:
  - shared page header, action toolbar, filter row, detail panel, and pagination patterns for data-heavy workspaces
  - one common table family covering header cells, body rows, selected and expanded states, status cells, action clusters, and detail containers
  - shared loading, empty, and error states for table bodies through a single data-table state pattern
- Deferred:
  - page/module rollout of these patterns remains for `Phase 5 - Daily Ops Rollout` and later module phases
  - domain-specific table exceptions still need to be explicitly justified during rollout

### Completed: Phase 5 - Daily Ops Rollout
- Date: 2026-03-31
- Status: done
- Key files:
  - `docs/UI_roadmap.md`
  - `src/pages/DashboardPage.jsx`
  - `src/modules/sales/pages/OrdersPage.jsx`
  - `src/modules/sales/components/admin/AdminOrdersView.jsx`
  - `src/modules/sales/components/admin/orders-workspace/OrdersWorkspaceToolbar.jsx`
  - `src/modules/sales/components/admin/orders-workspace/OrdersWorkspaceTable.jsx`
- Standardized:
  - dashboard rollout onto the shared page header, stat card, badge, and data-table system
  - sales orders rollout onto the shared page header, workspace toolbar, shared table family, detail panel, and action preset language
  - orders workspace established as the reference table/action workspace for later module rollout phases
- Deferred:
  - broader module adoption remains for `Phase 6 - Module Rollout`
  - cross-module table migration still needs module-by-module rollout and validation

### Completed: Phase 6 - Module Rollout
- Date: 2026-04-01
- Status: done
- Key files:
  - `docs/UI_roadmap.md`
  - `src/modules/customers/components/CustomersDirectoryPanel.jsx`
  - `src/modules/inventory/components/InventoryProductsPanel.jsx`
  - `src/modules/inventory/components/InventoryWarehousesPanel.jsx`
  - `src/modules/inventory/components/InventoryLocationsPanel.jsx`
  - `src/modules/inventory/components/InventoryLotsPanel.jsx`
  - `src/modules/accounting/components/accounts/AccountsPanel.jsx`
  - `src/modules/accounting/components/payroll/PayrollEmployeesPanel.jsx`
  - `src/modules/human-resources/components/HumanResourcesDirectoryPanel.jsx`
  - `src/modules/users-access/components/UsersListTable.jsx`
  - `src/modules/master-data/components/admin-settings/CustomItemsSettingsSection.jsx`
  - `src/modules/master-data/components/admin-settings/MatrixSettingsSection.jsx`
- Standardized:
  - customers, human-resources, accounting, inventory, and users-access data panels onto the shared toolbar, table, state, and action-cell family established by sales orders
  - inventory master tables onto shared status pills, reload/filter controls, and centered action treatments instead of ad hoc border-collapse table styling
  - master-data editable settings tables onto the shared data-table visual system so module rollout now uses one common table language across active modules
  - users-access and master-data table workspaces finalized on the shared header, summary, and action-control language instead of bespoke top-of-table scaffolding
- Deferred:
  - broader auth-entry and brand polish remains for `Phase 7 - Auth And Brand Polish`
  - any additional module-specific exceptions should be handled only as follow-up polish, not as part of `Phase 6 - Module Rollout`

### Completed: Phase 7 - Auth And Brand Polish
- Date: 2026-04-01
- Status: done
- Key files:
  - `docs/UI_roadmap.md`
  - `src/components/auth/LoginView.jsx`
  - `src/App.jsx`
  - `src/index.css`
- Standardized:
  - login and entry surfaces onto the same glass/surface language already established by the shell instead of a disconnected standalone card
  - controlled brand highlight treatment for auth-only entry panels using restrained glow/gradient surfaces rather than broad page-wide decoration
  - loading and fatal entry states around bootstrap/auth into the same premium but compact RTL-safe surface family as login
- Deferred:
  - final cross-app duplicate-style cleanup remains for `Phase 8 - Final Consistency Pass`
  - any broader shell or module refinements outside auth-entry surfaces were intentionally left out of `Phase 7 - Auth And Brand Polish`

### Completed: Phase 8 - Final Consistency Pass
- Date: 2026-04-01
- Status: done
- Key files:
  - `docs/UI_roadmap.md`
  - `src/index.css`
  - `src/App.jsx`
  - `src/components/auth/LoginView.jsx`
  - `src/components/layout/Header.jsx`
  - `src/components/layout/Sidebar.jsx`
- Standardized:
  - repeated shell and auth-entry surface styling into shared CSS hooks for brand panels, entry-state cards, user chips, and mobile dismiss controls
  - final shell and auth hierarchy so header, sidebar, login, loading, and fatal states now read as one family instead of adjacent bespoke surfaces
  - future-facing UI execution guardrails in this roadmap for shared surface reuse, limited highlight treatment, and print-safe redesign boundaries
- Deferred:
  - no further roadmap phases remain; future UI work should follow the shared guardrails established through Phases 1 to 8
  - any future visual changes should be treated as targeted follow-up tasks rather than continuation of this rollout

### Completed: Phase X - <name>
- Date: YYYY-MM-DD
- Status: done
- Key files:
  - path
  - path
- Standardized:
  - actions
  - tables
  - shells
  - states
- Deferred:
  - item
```

## Implementation Notes
- Ù‡ÛŒÚ† ØªØºÛŒÛŒØ± public APIØŒ schemaØŒ endpoint ÛŒØ§ contract Ù„Ø§Ø²Ù… Ù†ÛŒØ³Øª.
- Ù…Ø³ÛŒØ±Ù‡Ø§ÛŒ Ø§ØµÙ„ÛŒ Ø§Ø¬Ø±Ø§:
  - `src/index.css`
  - `src/components/layout/*`
  - `src/components/shared/ui/*`
  - ØµÙØ­Ø§Øª Ù…Ø±Ø¬Ø¹ Ù…Ø§Ú˜ÙˆÙ„â€ŒÙ‡Ø§
- tableÙ‡Ø§ØŒ ÙØ±Ù…â€ŒÙ‡Ø§ Ùˆ modalÙ‡Ø§ Ø¨Ø§ÛŒØ¯ compactØŒ Ø®ÙˆØ§Ù†Ø§ØŒ RTL-safe Ùˆ keyboard-friendly Ø¨Ù…Ø§Ù†Ù†Ø¯.
- rollout Ù‡Ø± ÙØ§Ø² Ø¨Ø§ÛŒØ¯ Ø§Ø² shared layer Ø¨Ù‡ pages Ø¨Ø±ÙˆØ¯ØŒ Ù†Ù‡ Ø¨Ø±Ø¹Ú©Ø³.
- Ø§Ú¯Ø± Ø¯Ø± ÛŒÚ© ÙØ§Ø² Ù„Ø§Ø²Ù… Ø´Ø¯ Ú†ÛŒØ²ÛŒ reusable Ø³Ø§Ø®ØªÙ‡ Ø´ÙˆØ¯ØŒ Ø¨Ø§ÛŒØ¯ Ø¯Ø± shared layer Ø¨Ù†Ø´ÛŒÙ†Ø¯ØŒ Ù†Ù‡ Ø¯Ø± ÛŒÚ© Ù…Ø§Ú˜ÙˆÙ„ Ø®Ø§Øµ.
- guardrail Ù†Ù‡Ø§ÛŒÛŒ Ø¨Ø±Ø§ÛŒ Ø§Ø¯Ø§Ù…Ù‡ ØªÙˆØ³Ø¹Ù‡:
  - shellØŒ auth Ùˆ workspace surfaces ÙÙ‚Ø· Ø§Ø² Ú©Ù„Ø§Ø³â€ŒÙ‡Ø§ Ùˆ primitives Ù…Ø´ØªØ±Ú© Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†Ù†Ø¯ØŒ Ù†Ù‡ class stackÙ‡Ø§ÛŒ ØªÚ©Ø±Ø§Ø±ÛŒ Ùˆ Ù…ÙˆØ¶Ø¹ÛŒ
  - highlight gradient/glow ÙÙ‚Ø· Ø±ÙˆÛŒ shell Ùˆ auth entry Ø¨Ù…Ø§Ù†Ø¯ Ùˆ Ø¨Ù‡ tableÙ‡Ø§ ÛŒØ§ ÙØ±Ù…â€ŒÙ‡Ø§ÛŒ data-heavy Ù†Ø´Øª Ù†Ú©Ù†Ø¯
  - print/invoice surfaces Ø¨Ø§ÛŒØ¯ Ø§Ø² passÙ‡Ø§ÛŒ visual Ø¹Ù…ÙˆÙ…ÛŒ Ø¬Ø¯Ø§ Ø¨Ù…Ø§Ù†Ù†Ø¯ Ù…Ú¯Ø± ØªØºÛŒÛŒØ± print-specific ØµØ±ÛŒØ­ Ù„Ø§Ø²Ù… Ø¨Ø§Ø´Ø¯

## Validation
- Ø¨Ø±Ø§ÛŒ Ù‡Ø± phase screenshot comparison Ø±ÙˆÛŒ desktop Ùˆ mobile Ú¯Ø±ÙØªÙ‡ Ø´ÙˆØ¯.
- RTL Ø¯Ø± sidebarØŒ headerØŒ tableÙ‡Ø§ØŒ filter barØŒ form fieldÙ‡Ø§ Ùˆ modalÙ‡Ø§ smoke-test Ø´ÙˆØ¯.
- hover, active, focus-visible, disabled, loading, empty, error, success states Ø¨Ø±Ø§ÛŒ primitives Ø¨Ø±Ø±Ø³ÛŒ Ø´ÙˆÙ†Ø¯.
- sidebar Ø¯Ø± Ø³Ù‡ Ø­Ø§Ù„Øª expanded, collapsed Ùˆ mobile drawer ØªØ³Øª Ø´ÙˆØ¯.
- regression Ø±ÙˆÛŒ print Ùˆ invoice preview Ø§Ù†Ø¬Ø§Ù… Ø´ÙˆØ¯.
- Ø¨Ø±Ø§ÛŒ phaseÙ‡Ø§ÛŒ frontend-focused Ø§Ø² `npm run verify:fast` Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø´ÙˆØ¯.

## Current Status
- Current phase: `Completed`
- Last completed phase: `Phase 8 - Final Consistency Pass`
- Next expected completion update: only if a new roadmap phase is added

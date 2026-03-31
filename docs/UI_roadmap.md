# UI Roadmap For Sitra ERP

## Summary
- هدف این roadmap ساخت یک UI system منسجم، مینیمال، سفیدمحور، آیکون‌محور و حرفه‌ای برای کل اپ است؛ با اولویت صریح روی readability، سرعت کار، و utility.
- اجرای roadmap فقط در لایه‌ی frontend/shared UI انجام می‌شود و هیچ تغییری در معماری modular monolith، قراردادهای backend، یا مرزهای ماژولی ایجاد نمی‌کند.
- ترتیب rollout: `foundation -> shell -> shared patterns -> daily ops -> data modules -> auth/polish`.
- جهت بصری نهایی: `bold minimal` با base سفید، charcoal، accent گرم، radius نرم، motion حداقلی، و تاکید بر consistency و function.
- هر فاز باید مستقل، کوچک، قابل verify و قابل توقف باشد.

## Global UI Rules
- همه‌ی actionهای پرتکرار باید در کل اپ یک زبان مشترک داشته باشند.
- actionهای `create`, `edit`, `delete`, `archive`, `restore`, `print`, `save`, `cancel`, `reload`, `filter` و `open details` باید فقط از shared variants و shared icon/action patterns استفاده کنند.
- actionهای destructive در همه‌جا باید tone، icon treatment، hover state و confirmation behavior هم‌خانواده داشته باشند.
- همه‌ی tableها باید یک visual system مشترک داشته باشند.
- table header، row spacing، selected row، hover state، status cell، action cell، empty state، loading state و pagination باید pattern مشترک داشته باشند.
- هیچ ماژولی مجاز نیست style table یا action pattern اختصاصی جدید بسازد، مگر نیاز domain-specific آن صریح ثبت و مستند شود.
- badgeها، status pills، toolbarها، filter rowها، drawer/modal headerها و section headerها باید shared و تکرارپذیر باشند.
- glass/gradient فقط در shell، login و highlight surfaces مجاز است؛ نه در data tables و نه در فرم‌های data-heavy.
- print و invoice surfaces از redesign عمومی نباید آسیب ببینند.

## Phases

### Phase 0 - UI Audit Baseline
- ثبت baseline از shell، dashboard، orders، customers، inventory، accounting، login، modalها و tableها.
- شناسایی component debt، style drift، one-off patternها و visual inconsistencyها.
- ثبت مواردی که الان بین ماژول‌ها یکسان نیستند:
  - action buttons
  - status badges
  - data tables
  - filters/toolbars
  - modal headers/footers
  - empty/loading/error states
- تعیین migration order برای shared primitives.

### Phase 1 - Visual Foundation
- تعریف design tokens در `src/index.css` برای:
  - color
  - surface
  - semantic state
  - border
  - shadow
  - radius
  - focus ring
  - motion
- تثبیت visual language سفیدمحور با accent گرم و usage محدود برای highlight surfaces.
- تعریف base utility classes برای surface، section hierarchy و workspace polish.

### Phase 2 - App Shell
- بازطراحی `app-shell`, `Header`, `Sidebar` و رفتار navigation با الگوی `Hybrid Rail`.
- اضافه‌کردن tooltip برای حالت‌های icon-only.
- یکدست‌سازی stateهای hover, active, focus و mobile drawer.
- تعریف shell behavior به‌عنوان الگوی مرجع برای ماژول‌های آینده.

### Phase 3 - Shared UI Primitives
- استانداردسازی `Button`, `Input`, `Select`, `Card`, `Badge`, `ModalShell`, `EmptyState`.
- افزودن primitives جدید:
  - `Tooltip`
  - `IconButton`
  - `SectionHeader`
  - `InlineAlert`
  - `StatCard`
- تعریف variantهای صریح برای actionها:
  - primary
  - secondary
  - ghost
  - success
  - danger
  - accent
- تعریف action mapping ثابت برای use caseهای پرتکرار:
  - edit
  - delete
  - archive
  - restore
  - print
  - refresh
  - row expand
- اجبار تدریجی صفحات جدید به استفاده از shared primitives.

### Phase 4 - Data Workspace Patterns
- ساخت الگوهای مشترک برای:
  - page header
  - action toolbar
  - filter row
  - table shell
  - table states
  - empty/loading/error states
  - modal/drawer content
  - pagination
- تعریف `one table family` برای کل اپ:
  - head styling
  - row density
  - zebra/hover/select logic
  - action column pattern
  - status column pattern
  - detail expansion container
- کاهش style duplication در صفحات data-heavy.

### Phase 5 - Daily Ops Rollout
- rollout روی `Dashboard` و `Sales Orders`.
- یکدست‌سازی stat cards، summary panels، toolbarها، tableها، badgeها و action clusters.
- orders page باید به‌عنوان مرجع استاندارد table/action workspace برای rollout بعدی استفاده شود.

### Phase 6 - Module Rollout
- rollout مرحله‌ای روی:
  - `customers`
  - `inventory`
  - `accounting`
  - `human-resources`
  - `users-access`
  - `master-data`
- استفاده از primitives و patternهای مشترک به‌جای style logic پراکنده.
- در هر ماژول باید actionها و tableها به family مشترک migrate شوند، نه فقط palette و spacing.

### Phase 7 - Auth And Brand Polish
- بازطراحی `LoginView` و entry surfaces با همان visual language.
- استفاده‌ی کنترل‌شده از gradient/glow فقط برای حس premium و نه برای شلوغی.
- login باید با shell هم‌خانواده باشد، نه یک UI جدا.

### Phase 8 - Final Consistency Pass
- حذف style duplication و کلاس‌های ad-hoc.
- ثبت guardrailهای اجرایی برای featureهای آینده.
- بررسی نهایی RTL، keyboard usability و print safety.
- بررسی نهایی consistency برای:
  - action system
  - table system
  - shared status language
  - page hierarchy

## Phase Completion Rule
- در پایان هر فاز، اجرای آن فاز باید متوقف شود.
- بعد از پایان هر فاز، همین فایل `docs/UI_roadmap.md` باید update شود.
- update هر فاز باید حداقل شامل این موارد باشد:
  - فاز کامل‌شده
  - تاریخ تکمیل
  - فایل‌های اصلی تغییرکرده
  - الگوهای جدید تثبیت‌شده
  - اگر چیزی defer شده، دلیل defer
- فاز بعدی فقط بعد از ثبت این update در roadmap شروع می‌شود.

## Tracking Template
در پایان هر فاز، یک entry با این فرمت به roadmap اضافه شود:

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
- هیچ تغییر public API، schema، endpoint یا contract لازم نیست.
- مسیرهای اصلی اجرا:
  - `src/index.css`
  - `src/components/layout/*`
  - `src/components/shared/ui/*`
  - صفحات مرجع ماژول‌ها
- tableها، فرم‌ها و modalها باید compact، خوانا، RTL-safe و keyboard-friendly بمانند.
- rollout هر فاز باید از shared layer به pages برود، نه برعکس.
- اگر در یک فاز لازم شد چیزی reusable ساخته شود، باید در shared layer بنشیند، نه در یک ماژول خاص.
- guardrail نهایی برای ادامه توسعه:
  - shell، auth و workspace surfaces فقط از کلاس‌ها و primitives مشترک استفاده کنند، نه class stackهای تکراری و موضعی
  - highlight gradient/glow فقط روی shell و auth entry بماند و به tableها یا فرم‌های data-heavy نشت نکند
  - print/invoice surfaces باید از passهای visual عمومی جدا بمانند مگر تغییر print-specific صریح لازم باشد

## Validation
- برای هر phase screenshot comparison روی desktop و mobile گرفته شود.
- RTL در sidebar، header، tableها، filter bar، form fieldها و modalها smoke-test شود.
- hover, active, focus-visible, disabled, loading, empty, error, success states برای primitives بررسی شوند.
- sidebar در سه حالت expanded, collapsed و mobile drawer تست شود.
- regression روی print و invoice preview انجام شود.
- برای phaseهای frontend-focused از `npm run verify:fast` استفاده شود.

## Current Status
- Current phase: `Completed`
- Last completed phase: `Phase 8 - Final Consistency Pass`
- Next expected completion update: only if a new roadmap phase is added

# Real UI/UX Redesign Phase 0 Audit

Updated: 2026-04-08
Status: Complete
Scope: Repository-owned markdown files only
Explicit exclusion: `node_modules/**` third-party markdown

## Outcome summary
Phase 0 established one active redesign planning location, removed stale redesign-cycle documentation, and documented the current UX baseline from the codebase itself.

Results:
- One active redesign planning location: `docs/real-ui-ux/`
- Historical redesign-cycle docs deleted instead of archived
- Future-only `docs/ROADMAP.md` restored to its intended role
- KPI baseline method documented for sales + customer intake
- Current shell, table, modal, confirm, and state patterns inventoried
- Top inconsistency clusters identified for Phase 1 through Phase 3

## Markdown audit inventory
### Keep
| Path | Status | Reason |
|---|---|---|
| `AGENTS.md` | keep | Repository working rules and runtime defaults. |
| `ARCHITECTURE.md` | keep | Top architecture source of truth. |
| `MODULE_CONTRACTS.md` | keep | Public contract source of truth. |
| `README.md` | keep | Primary onboarding entrypoint. |
| `.github/PULL_REQUEST_TEMPLATE.md` | keep | Active review and design-system conformance workflow. |
| `api/modules/README.md` | keep | Backend module structure explainer. |
| `docs/ai-playbook.md` | keep | Active execution workflow guidance. |
| `docs/api-contracts-index.md` | keep | Useful runtime API navigation index. |
| `docs/code-map.md` | keep | Active ownership and canonical edit paths. |
| `docs/golden-paths.md` | keep | High-value workflow smoke targets. |
| `docs/guardrails.md` | keep | Active guardrail hierarchy and enforcement notes. |
| `docs/inventory-v2-guide.md` | keep | Current inventory runtime explainer. |
| `docs/naming-conventions.md` | keep | Active naming enforcement doc. |
| `docs/adr/ADR-001-naming-normalization.md` | keep | Useful recorded decision. |
| `docs/adr/README.md` | keep | ADR index. |
| `docs/design-system/component-contribution-template.md` | keep | Still useful for shared UI contract changes during the redesign. |
| `docs/design-system/governance-policy.md` | keep | Active governance and review policy. |
| `docs/modules/README.md` | keep | Module doc index. |
| `docs/modules/accounting.md` | keep | Active ownership reference. |
| `docs/modules/customers.md` | keep | Active ownership reference. |
| `docs/modules/human-resources.md` | keep | Active ownership reference. |
| `docs/modules/kernel.md` | keep | Active ownership reference. |
| `docs/modules/master-data.md` | keep | Active ownership reference. |
| `docs/modules/sales.md` | keep | Active ownership reference. |
| `docs/modules/users-access.md` | keep | Active ownership reference. |
| `docs/real-ui-ux/real-ui_ux-redesign-roadmap.md` | keep | Active redesign program source of truth. |
| `docs/real-ui-ux/real-ui_ux-redesign-phase-0.prompt.md` | removed (Phase 5) | Program-closure cleanup removed legacy execution prompts. |
| `docs/real-ui-ux/real-ui_ux-redesign-phase-1.prompt.md` | removed (Phase 5) | Program-closure cleanup removed legacy execution prompts. |
| `docs/real-ui-ux/real-ui_ux-redesign-phase-2.prompt.md` | removed (Phase 5) | Program-closure cleanup removed legacy execution prompts. |
| `docs/real-ui-ux/real-ui_ux-redesign-phase-3.prompt.md` | removed (Phase 5) | Program-closure cleanup removed legacy execution prompts. |
| `docs/real-ui-ux/real-ui_ux-redesign-phase-4.prompt.md` | removed (Phase 5) | Program-closure cleanup removed legacy execution prompts. |
| `docs/real-ui-ux/real-ui_ux-redesign-phase-5.prompt.md` | removed (Phase 5) | Program-closure cleanup removed legacy execution prompts. |
| `examples/README.md` | keep | Example payload usage guidance. |
| `examples/assets/README.md` | keep | Example asset usage guidance. |
| `src/modules/README.md` | keep | Frontend module structure explainer. |

### Rewrite
| Path | Status | Reason |
|---|---|---|
| `docs/ROADMAP.md` | rewrite | It had become a historical redesign snapshot even though it is supposed to be future-only. |

### Delete
| Path | Status | Reason |
|---|---|---|
| `doc/ui-redesign.md` | delete | Duplicate mirror of stale redesign history. |
| `doc/ui-redesign-prompts.md` | delete | Duplicate mirror of stale redesign history. |
| `docs/design-system.md` | delete | Historical baseline snapshot from the prior redesign cycle. |
| `docs/ui-audit.md` | delete | Historical baseline audit superseded by this Phase 0 audit. |
| `docs/ui-redesign.md` | delete | Prior redesign-cycle program doc superseded by `docs/real-ui-ux/`. |
| `docs/ui-redesign-prompts.md` | delete | Prior redesign prompt pack superseded by `docs/real-ui-ux/`. |
| `docs/ux-cutover-audit-2026-04-07.md` | delete | Prior-cycle cutover audit no longer operationally required. |
| `docs/workspace-templates.md` | delete | Historical final-baseline contract summary duplicated by active code and governance docs. |
| `docs/design-system/deprecated-patterns-archive.md` | delete | Historical archive artifact; current governance should live in active docs only. |
| `docs/design-system/enterprise-shell-system.md` | delete | Prior-cycle shell spec superseded by active redesign roadmap and future implementation work. |
| `docs/design-system/operator-throughput-rewrite-spec.md` | delete | Prior-cycle rewrite spec no longer authoritative. |
| `docs/design-system/phase-3-admin-reference-rewrite-plan.md` | delete | Prior-cycle phase-specific execution artifact. |
| `docs/design-system/quarterly-maintenance-playbook.md` | delete | Post-program maintenance artifact from a superseded redesign cycle. |
| `docs/design-system/ux-optimization-playbook.md` | delete | Prior-cycle KPI and rewrite-trigger playbook superseded by the active program. |

### Explicitly excluded
| Path pattern | Status | Reason |
|---|---|---|
| `node_modules/**/*.md` | excluded | Third-party dependency docs, not repository operational docs. |

## Canonical active doc set
The operationally required doc set for the redesign program is now:
- `ARCHITECTURE.md`
- `MODULE_CONTRACTS.md`
- `docs/code-map.md`
- `docs/guardrails.md`
- `README.md`
- `docs/ai-playbook.md`
- `docs/real-ui-ux/real-ui_ux-redesign-roadmap.md`
- `docs/real-ui-ux/real-ui_ux-redesign-phase-*.prompt.md`
- `docs/design-system/governance-policy.md`
- `docs/design-system/component-contribution-template.md`
- `.github/PULL_REQUEST_TEMPLATE.md`

## KPI baseline definition
### Benchmark workflow family
Primary benchmark workflow: sales + customer intake

### Benchmark tasks
1. Staff order creation: `/orders/new` route load to successful save.
2. Staff order retrieval: `/orders` search or scan to opening `/orders/:id`.
3. Customer lookup: `/customers` search to opening customer details or create flow.

### Phase 0 baseline method
Measure later phases against these baseline dimensions:
- time to complete the benchmark task
- interactions or clicks to complete the benchmark task
- validation or recovery interruptions per completion
- consistency debt count in the affected workflow surface
- smoke-check pass rate for the affected flow

### Phase 0 captured baseline values
Static consistency baseline captured from the current codebase:
- `WorkspaceShellTemplate` entry-page adoption: 7 routed module entry surfaces
- bespoke fixed-overlay modal implementations in active module code: 7, all in `sales`
- `window.confirm` usage in active module code: 15
- routed compatibility redirects still present: 2 (`/users`, `/owner/users`)
- `DataTableState` adoption across module tables: widespread, but state copy and surrounding action patterns remain inconsistent

Timing and click-count baselines:
- numeric operator timings were not captured in this docs-only phase
- Phase 1 kickoff should capture manual or telemetry-backed timings for the three benchmark tasks using the method above

## Current shared UI inventory
### Shell and navigation
- `src/components/layout/MainLayout.jsx`
- `src/components/layout/Header.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/components/layout/sidebarNav.js`
- `src/components/shared/ui/WorkspaceShellTemplate.jsx`

Current state:
- shell exists and supports RTL desktop navigation
- `WorkspaceShellTemplate` covers several module entry pages
- order creation for unauthenticated and some sales-heavy surfaces still bypass the broader shared-shell experience

### Shared action and state primitives
- `Button.jsx`
- `IconButton.jsx`
- `InlineAlert.jsx`
- `UniversalState.jsx`
- `WorkspaceToolbar.jsx`
- `WorkspacePageHeader.jsx`

Current state:
- shared primitives exist
- action hierarchy still varies by module and by older sales surfaces
- some error and success handling is standardized, but destructive and confirm flows are not

### Shared tables
- `DataTable.jsx`
- `PaginationBar.jsx`
- `FilterRow.jsx`

Current state:
- shared table primitive exists and is used across modules
- density and row chrome are closer to unified than forms or modals
- filter and row-action semantics still vary between workspaces

### Shared modals
- `ModalShell.jsx`
- `WorkspaceDetailPanel.jsx`

Current state:
- shared modal shell is used widely in customers, HR, inventory, and accounting
- the most visible sales flows still use bespoke fixed overlays instead of `ModalShell`

## Gap map
### Gap 1: split shell model
Severity: high

Evidence:
- authenticated module pages commonly use `WorkspaceShellTemplate`
- `/orders/new` can run outside the shared shell
- shell and header behavior are not yet the universal benchmark for all high-value workflows

### Gap 2: sales modal divergence
Severity: high

Evidence:
- 7 bespoke fixed-overlay implementations remain in sales
- checkout, manual-item, settings, service-catalog, hole-map, pattern-files, and payment manager surfaces diverge from `ModalShell`

### Gap 3: destructive-confirm inconsistency
Severity: high

Evidence:
- 15 `window.confirm` usages remain across accounting, users-access, HR, inventory, master-data, and sales
- action consequence clarity and visual consistency are fragmented

### Gap 4: action hierarchy drift
Severity: medium

Evidence:
- entry surfaces share some primitives
- older module surfaces still mix custom buttons, text buttons, icon buttons, and local action ordering

### Gap 5: state and validation language drift
Severity: medium

Evidence:
- `DataTableState` and `InlineAlert` are present across modules
- validation placement, destructive warnings, and recovery instructions remain inconsistent between modules

## Phase guidance from the audit
- Phase 1 should treat the shell, navigation IA, and global action hierarchy as one unit of work.
- Phase 2 should aggressively target sales modal divergence and order-entry context switching.
- Phase 3 should eliminate `window.confirm` and finish the shared modal, form, and state grammar.
- Phase 4 should prioritize modules with the highest remaining confirm and action-order drift.

## Reusable review checklist
Every redesign phase should verify:
- one active redesign planning location still exists
- no deleted historical redesign files were reintroduced
- shell and navigation changes go through shared layout contracts
- new modal work uses shared modal contracts instead of bespoke overlays
- destructive actions do not use browser-native confirm dialogs
- roadmap and relevant design-system contracts are updated in the same change
- affected workflows have a measurable KPI hypothesis or delta statement

# ERP UI/UX Redesign Plan — AI-Native Aggressive Mode (No Legacy Constraints)

Owner: Naser Zafar (Architecture)
Execution model: AI-only delivery (Codex/Cursor), no human engineering bottleneck.

---

## 1. Key questions and assumptions

### Key questions before execution
1. Which 3 workflows must become dramatically faster first (orders, approvals, inventory, payments)?
2. What is acceptable disruption window per module (hours/days) during aggressive migration?
3. Which modules can be rebuilt from scratch immediately vs phased rewrite?
4. What is the tolerance for temporary feature freeze while core templates are rebuilt?
5. What KPI targets define success (e.g., 30–50% fewer clicks, 40% less time-on-task)?
6. Should we standardize all modules on one workspace template even if current module UX diverges?
7. Are we allowed to remove/rename low-value screens and actions to reduce complexity?
8. Which approvals and destructive actions require hard safety rails?
9. Do we enforce desktop-first only right now and postpone responsive complexity?
10. What release strategy is preferred: big-bang cutover or parallel run + switch?

### Assumptions (locked)
- We are in active development; legacy compatibility is not a priority.
- Aggressive refactor/rebuild is allowed, including replacing current screen implementations.
- Design-system conformance is mandatory for all new UI.
- Functionality and operator speed outrank visual decoration.
- RTL Persian UX remains first-class and non-negotiable.

---

## 2. UI audit framework

### Audit objective
Identify what to keep, what to rewrite, and what to delete.

### Audit matrix (score 0–3)
- 0 = keep
- 1 = fix in place
- 2 = refactor heavily
- 3 = replace from scratch

### Audit dimensions
- Workflow speed (clicks, context switches, friction)
- Readability in dense data screens
- Consistency with shared UI patterns
- Error prevention and recovery quality
- Permission/action clarity
- Loading/empty/error/archived state quality
- RTL/accessibility integrity

### Required outputs
- Screen inventory with keep/refactor/rebuild/delete tags
- Component inventory with duplicate detection
- Top 20 blockers by business impact
- Rebuild-first shortlist (high frequency + high pain)

---

## 3. Information architecture and navigation recommendations

### Target IA model (strict)
- One global shell
- One module navigation pattern
- One secondary navigation pattern
- One workspace grammar: Header + Toolbar + Data Area + Detail/Modal

### Navigation decisions
- Remove module-specific nav metaphors and unify naming.
- Collapse redundant pages and low-usage routes.
- Move complex workflows into guided transaction flows.
- Promote global quick actions and search.

### Module structure normalization
- Sales, Inventory, Accounting use identical workspace scaffolding.
- Customers, HR, Users Access, Master Data use shared directory-detail-admin templates.
- Reports/settings inherit shared filter/action/export patterns.

---

## 4. Design language and visual system

### System principles
- Calm enterprise look
- High contrast + high scanability
- Dense but readable
- Predictable status semantics
- Zero visual drift across modules

### Token system (mandatory)
- Foundation tokens: color, type, spacing, radius, shadow, motion, z-index
- Component tokens: buttons, fields, table density, modal, alerts, tabs, badges
- State tokens: hover/active/focus/disabled/loading/error/success/archived

### Non-negotiable visual rules
- Single icon set
- Single typography scale
- Fixed spacing scale
- Standardized action hierarchy (primary/secondary/danger)
- Standardized numeric/currency/date presentation rules

---

## 5. Reusable component system

### Core strategy
Everything ships through shared primitives first; modules compose, not reinvent.

### Mandatory component set (v1)
1. WorkspacePageHeader
2. WorkspaceToolbar
3. DataTable (density + filter + bulk actions)
4. Field suite + FieldWrapper
5. Button system + icon actions + destructive actions
6. ModalShell + ConfirmDialog + Drawer
7. Feedback system (InlineAlert, Toast, Empty, Error, Loading, Skeleton)
8. StatusBadge and semantic chips
9. Tabs/Segmented controls
10. Form layouts (compact, sectioned, wizard)

### Governance rule
- If a module needs new UI behavior, add it to shared system first.
- No bespoke table/form/modal/button style in module code.
- Violations are blocked in review.

---

## 6. High-impact screen redesign priorities

### Wave 1 (Immediate rebuild candidates)
- Sales order create/edit
- Sales orders workspace
- Inventory operations workspace
- Global shell/page header/navigation

### Wave 2
- Inventory stock/catalog
- Accounting vouchers/accounts/report filters
- Customers directory/detail/modal

### Wave 3
- HR directory/forms/import flows
- Users access + permissions matrix
- Master Data admin surfaces

### Wave 4
- Secondary surfaces: logs, owner/system settings, print support, advanced reports

---

## 7. Module-by-module rollout plan

## Phase 0 — Cutover strategy (1 week)
- Choose migration mode per module: rebuild vs refactor.
- Freeze UX principles and DS contracts.
- Define KPI baseline and target deltas.

## Phase 1 — Foundation rewrite (2–4 weeks)
- Rebuild shell, headers, toolbar, base states.
- Finalize token layer and shared primitives v1.
- Replace fragmented navigation patterns.

## Phase 2 — Core operations rewrite (4–8 weeks)
- Rewrite Sales, Inventory, Accounting high-frequency workflows on new templates.
- Enforce DataTable/Form/Modal contracts.
- Remove obsolete UI paths.

## Phase 3 — Admin/reference rewrite (3–6 weeks)
- Rewrite Customers, HR, Users Access, Master Data.
- Normalize directories, details, and settings pages.

## Phase 4 — Hardening + acceleration (ongoing)
- Add visual regression and design conformance checks.
- Continuously remove UI debt and duplicate primitives.
- Optimize keyboard-first flows and power-user patterns.

### Definition of done (each phase)
- Shared components adopted in target scope
- UX states standardized
- KPI delta achieved or explained
- No new bespoke UI debt introduced

---

## 8. QA and usability validation checklist

### Required checks for every migrated screen
- Primary action obvious in < 2 seconds
- Table/filter/actions follow shared grammar
- Form validation consistent and immediate
- Empty/loading/error/success states standardized
- Destructive actions protected and explicit
- Role-based action behavior consistent
- RTL and keyboard navigation validated
- Dense data remains readable at normal desktop widths

### Acceptance scenarios
- first load / slow load / empty / error
- create / edit / archive / restore / approve
- permission-restricted user
- long text + large numeric datasets
- modal open-close-cancel and unsaved warnings

---

## 9. Engineering/design-system implementation guidance

### AI-native delivery protocol
- Naser defines target architecture and acceptance criteria.
- AI agents execute phase tasks with strict component contracts.
- Every PR includes: changed templates, affected modules, KPI expectation, QA checklist.

### Repository execution rules
- Keep shared UI in `src/components/shared/ui` and shell in `src/components/layout`.
- Keep business logic in `src/modules/<module>`.
- Add conformance checks for token/component usage.

### Aggressive modernization policy
- Prefer rewrite when legacy structure slows delivery.
- Delete obsolete UI code paths once replacement is stable.
- Avoid backward-compatibility shims unless absolutely required for continuity.
- Optimize for future module velocity over preserving old patterns.

### KPI dashboard (minimum)
- task completion time
- clicks per critical workflow
- operator error rate
- UX-related support issues
- design-system adoption %

---

## Codex execution notes
- Execute one phase at a time with explicit scope and done criteria.
- Prefer high-impact rewrites over incremental polish when ROI is clear.
- Keep architecture ownership centralized; implementation distributed to AI agents.

---

## 10. Roadmap and documentation refresh protocol

### Mandatory update after each phase
After completing every phase (0–5), update roadmap and documentation in the same PR.

### Minimum files to refresh per phase completion
- `docs/ROADMAP.md` (status, progress, next-phase plan)
- `doc/ui-redesign.md` (phase outcomes, decisions, KPI delta)
- `doc/ui-redesign-prompts.md` (prompt refinements based on learnings)
- Any impacted design-system docs (create/update if present):
  - `docs/design-system.md`
  - `docs/workspace-templates.md`
  - `docs/ui-audit.md`

### Required phase-close changelog block
Add a concise changelog section with:
- phase completed
- modules/screens touched
- components added/changed/deprecated
- KPI before/after snapshot
- unresolved risks and carry-over backlog

### End-of-program documentation closure
At the end of Phase 5, perform a full documentation reconciliation:
1. Ensure roadmap reflects final rollout state.
2. Ensure design-system docs match current component contracts.
3. Archive obsolete guidance and mark deprecated patterns.
4. Publish final "UI consistency baseline" and quarterly maintenance plan.

---

## 11. Must-have packages and installation plan

This section is intentionally limited to must-haves only.

### 11.1 Must-have frontend packages
1. `@tanstack/react-query` — server-state caching, retries, mutation lifecycle.
2. `@tanstack/react-table` — consistent enterprise table behavior.
3. `@tanstack/react-virtual` — table/list virtualization for dense data.
4. `react-hook-form` — performant form state for complex ERP forms.
5. `zod` — runtime schema validation for form/input safety.
6. `@hookform/resolvers` — bridge between React Hook Form and Zod.
7. `radix-ui` primitives (selected packages) — accessible, consistent unstyled primitives.
8. `lucide-react` — single icon system across product.
9. `clsx` + `tailwind-merge` — reliable variant/class composition.
10. `react-error-boundary` — stable error boundaries around critical surfaces.
11. `@axe-core/react` (dev) — accessibility checks during development.
12. `@playwright/test` (dev) — E2E and visual regression baseline.

### 11.2 Install command (npm)
```bash
npm install @tanstack/react-query @tanstack/react-table @tanstack/react-virtual react-hook-form zod @hookform/resolvers lucide-react clsx tailwind-merge react-error-boundary @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-switch @radix-ui/react-label
npm install -D @axe-core/react @playwright/test
```

### 11.3 Estimated install size (must-haves)
Approximate download/addition size can vary by npm cache and lockfile state.

- Runtime must-haves: ~15–35 MB downloaded, ~35–80 MB on disk (including transitive deps).
- Dev must-haves (`@axe-core/react`, `@playwright/test`): ~8–20 MB downloaded for package install.
- If Playwright browsers are installed, add roughly **400–700 MB** extra (browser binaries).

**Practical expectation for full must-have setup:**
- Without browser binaries: ~45–100 MB total on disk increase.
- With Playwright browser binaries: ~450–800 MB total on disk increase.

### 11.4 Enforcement rule
- Only these must-haves are added first.
- Any new package request must show explicit ROI and overlap analysis.


### 11.5 Low-bandwidth install mode (internet-optimized)
Use this mode when internet usage is a constraint.

1. Install must-have runtime and dev packages first (without browser binaries).
2. Do **not** run Playwright browser install during baseline setup.
3. Enable Playwright browser download only in QA phases that actually run E2E/visual tests.
4. Prefer Chromium-only install unless cross-browser validation is required.
5. Reuse npm cache and lockfile in AI environments to avoid repeated downloads.

#### Suggested commands (bandwidth-aware)
```bash
# Step 1: packages only
npm install @tanstack/react-query @tanstack/react-table @tanstack/react-virtual react-hook-form zod @hookform/resolvers lucide-react clsx tailwind-merge react-error-boundary @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-switch @radix-ui/react-label
npm install -D @axe-core/react @playwright/test

# Step 2: optional, only when E2E/visual regression starts
npx playwright install chromium
```

#### Why Playwright is included at all
`@playwright/test` provides end-to-end test runner capabilities for real browser automation:
- opens real browser sessions (not jsdom mocks)
- runs critical workflow tests (login, create/edit/approve flows)
- supports visual regression snapshots
- can trace and record flaky failures for debugging

In this plan, Playwright is used to protect high-impact ERP workflows during aggressive UI rewrites.

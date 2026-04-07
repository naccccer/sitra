# Codex Prompts — AI-Native Aggressive ERP UI Rewrite

## How to use this file (single purpose)
This file is the **execution prompt pack** for the phased roadmap in `doc/ui-redesign.md`.
- Each phase in roadmap has a matching prompt here.
- Copy one prompt at a time into Codex/Cursor to execute that phase.
- Do not skip phase-close/final-close prompts.

## Prompt execution order
1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase-close prompt (after every phase)
8. Final-close prompt (after Phase 5)

Use these prompts in order. They are optimized for development-phase execution where legacy constraints are minimal.

## Phase 0 prompt — Decide rebuild map

```text
Act as principal product designer + UX architect + design-system lead.

Task:
1) Audit all active ERP routes and major modal workflows.
2) Tag each screen as: keep, refactor, rebuild, delete.
3) Prioritize by workflow impact and operator frequency.
4) Produce a cutover map: what gets rewritten first.

Output:
- screen inventory with keep/refactor/rebuild/delete
- component duplication map
- top 20 UX blockers
- phase-ready rebuild shortlist

Constraints:
- optimize for speed and consistency
- legacy compatibility is optional
- preserve RTL Persian UX
```

## Phase 1 prompt — Rewrite foundation and shell

```text
Act as design-system architect.

Task:
1) Define and implement tokens (color/type/spacing/radius/shadow/motion/z-index/state).
2) Standardize global shell, page header, toolbar, and global navigation patterns.
3) Standardize universal states: loading, empty, error, success, archived.
4) Replace divergent shell/nav patterns with one shared implementation.

Output:
- token spec + implementation checklist
- shared shell/page-template contracts
- migration map from old shell/nav to new

Constraints:
- no bespoke shell patterns
- single enterprise visual language
```

## Phase 2 prompt — Rewrite core transaction workflows

```text
Act as senior ERP UX lead focused on operator throughput.

Task:
1) Rewrite Sales orders workspace + create/edit flow using shared templates.
2) Rewrite Inventory operations workspace using same table/filter/action grammar.
3) Rewrite Accounting core transaction surfaces with consistent interaction model.
4) Optimize keyboard flow, bulk actions, and dense table scanability.

Output:
- rewritten workflow specs
- component mapping for each screen
- KPI targets (time/click/error reductions)
- release QA checklist

Constraints:
- prioritize high-frequency workflows
- remove obsolete UI paths where safe
```

## Phase 3 prompt — Rewrite admin/reference modules

```text
Act as UX modernization lead.

Task:
1) Rewrite Customers, HR, Users Access, and Master Data on shared directory/detail/settings templates.
2) Standardize modal behavior, form validation, and permission-action clarity.
3) Eliminate module-specific visual drift.

Output:
- module-by-module rewrite plan
- reused component matrix
- leftover debt list to delete

Constraints:
- no custom one-off UI patterns
- keep role behavior explicit and predictable
```

## Phase 4 prompt — Governance and enforcement

```text
Act as design-system governance owner.

Task:
1) Define enforcement policy for token/component compliance.
2) Add conformance checklist to PR workflow.
3) Define visual regression baseline and breakage response process.
4) Define component change policy and release notes format.

Output:
- governance policy
- PR conformance checklist
- visual regression process
- component contribution template

Constraints:
- block new bespoke primitives
- optimize for AI-only contributor workflow
```

## Phase 5 prompt — Continuous optimization loop

```text
Act as product UX optimization owner.

Task:
1) Define KPI dashboard for time-on-task, clicks, errors, UX incidents.
2) Create quarterly UX debt deletion cycle.
3) Create trigger rules for full pattern rewrites when metrics regress.

Output:
- KPI dashboard spec
- recurring optimization playbook
- rewrite trigger matrix

Constraints:
- tie every UX change to measurable operational outcomes
- preserve system-wide consistency
```


## Phase-close prompt — roadmap + docs refresh (run after every phase)

```text
Act as release documentation owner for ERP UI redesign.

Task:
1) Update roadmap and all related docs immediately after the completed phase.
2) Record what changed, what remains, and what is next.
3) Reconcile prompts and design-system documentation with implementation reality.

Required file updates (in same PR):
- docs/ROADMAP.md
- doc/ui-redesign.md
- doc/ui-redesign-prompts.md
- docs/design-system.md (if exists/affected)
- docs/workspace-templates.md (if exists/affected)
- docs/ui-audit.md (if exists/affected)

Output:
- phase-close changelog
- updated roadmap section
- updated prompt set for next phase
- unresolved-risk list and carry-over backlog

Constraints:
- no phase is considered complete without documentation refresh
- roadmap and docs must reflect the current state of truth
```

## Final-close prompt — end-of-program doc reconciliation

```text
Act as documentation and governance lead.

Task:
1) Reconcile all UI redesign docs at end of Phase 5.
2) Remove/archive outdated guidance.
3) Publish final consistency baseline and maintenance cadence.

Required outputs:
- final roadmap state in docs/ROADMAP.md
- final component contract alignment notes
- deprecated pattern archive list
- quarterly maintenance playbook

Constraints:
- no stale documentation left behind
- documents must be internally consistent
```


## Foundation setup prompt — install must-have packages only

```text
Act as frontend platform engineer.

Task:
1) Install only the approved must-have packages for ERP redesign foundation.
2) Report exact dependency changes and lockfile diff summary.
3) Estimate disk footprint added by runtime deps, dev deps, and Playwright browsers.

Install set (must-have only):
- @tanstack/react-query
- @tanstack/react-table
- @tanstack/react-virtual
- react-hook-form
- zod
- @hookform/resolvers
- lucide-react
- clsx
- tailwind-merge
- react-error-boundary
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-popover
- @radix-ui/react-tabs
- @radix-ui/react-tooltip
- @radix-ui/react-select
- @radix-ui/react-checkbox
- @radix-ui/react-switch
- @radix-ui/react-label
- dev: @axe-core/react, @playwright/test

Output:
- executed install commands
- package.json and lockfile change summary
- size estimate (without and with Playwright browser binaries)
- risk notes (if conflicts or peer warnings appear)

Constraints:
- do not add optional/nice-to-have packages
- keep package set minimal and enforceable
```


## Low-bandwidth setup prompt — minimize internet usage

```text
Act as frontend platform engineer in low-bandwidth mode.

Task:
1) Install must-have packages without downloading Playwright browser binaries.
2) Prepare project for future E2E tests, but defer browser install.
3) Report estimated network usage for package install and optional browser install.

Commands policy:
- Allow: npm install for approved package set
- Defer: `npx playwright install` until QA/E2E phase
- Optional later: `npx playwright install chromium` only

Output:
- executed commands
- estimated internet usage now vs later
- when to enable browser download in phase timeline

Constraints:
- optimize for low internet usage
- keep full capability available for future QA phases
```

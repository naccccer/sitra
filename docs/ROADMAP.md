# Sitra ERP Roadmap

This file is the active execution roadmap for follow-on work. It does not override `ARCHITECTURE.md`, `MODULE_CONTRACTS.md`, or `docs/code-map.md`.

## Operating assumptions
- All implementation work is expected to be agent-executable.
- Every slice must preserve modular boundaries, contract discipline, auth/CSRF behavior, and locked runtime enums.
- Every slice must be bounded, validation-backed, and small enough to hand off without hidden decisions.

## Phase 1: Source-of-Truth Compression
Objective:
Finish the documentation reset so the repo reads as one current-state system with no redesign-history or ADR trail.

In scope:
- Keep the authoritative doc set minimal and internally consistent.
- Remove references to deleted redesign-history and ADR paths.
- Rewrite design-system docs as timeless current-state contracts.
- Keep compatibility aliases documented only as current runtime behavior.

Out of scope:
- Runtime code changes.
- Schema, contract, or endpoint behavior changes.
- New feature work.

Read first:
- `ARCHITECTURE.md`
- `MODULE_CONTRACTS.md`
- `docs/code-map.md`
- `docs/guardrails.md`
- `README.md`
- `docs/ai-playbook.md`

Validation:
- repo-wide reference search for deleted history folders and ADR paths
- `rg "Ø|Ù|Û" docs *.md`

Acceptance criteria:
- No surviving docs point to deleted history folders or ADR paths.
- `README.md`, `AGENTS.md`, and `docs/ai-playbook.md` describe the same surviving doc set.
- `docs/ROADMAP.md` is the only active execution roadmap.

## Phase 2: Execution Hardening
Objective:
Remove ambiguity that slows or destabilizes AI delivery.

In scope:
- Tighten doc guidance around ownership, edit paths, and validation mode selection.
- Make `docs/golden-paths.md` the canonical smoke-check list for follow-on work.
- Define the minimum evidence every future change must leave behind: changed scope, validation run, and doc-sync status.

Out of scope:
- Large refactors.
- New module activation.
- Reintroducing history or alternate planning tracks.

Read first:
- `ARCHITECTURE.md`
- `docs/code-map.md`
- `docs/guardrails.md`
- `docs/golden-paths.md`
- `docs/ai-playbook.md`

Validation:
- `npm run verify:fast`
- Targeted `rg` checks for changed docs or touched workflow references

Acceptance criteria:
- An agent can determine what to edit, what not to edit, and how to validate without consulting deleted history.
- Golden paths are the default smoke targets for release-facing work.

## Phase 3: Structural Debt Burn-Down
Objective:
Reduce ambiguity and maintenance risk in the highest-friction implementation surfaces.

In scope:
- Split oversized files listed in `scripts/file-size-allowlist.json`.
- Reduce compatibility-only wording and surface area where runtime no longer needs it.
- Continue shared UI normalization only where current docs still show mixed contracts.

Out of scope:
- Contract-breaking rewrites.
- New domain expansion.
- Cross-module shortcuts that bypass ownership rules.

Read first:
- `ARCHITECTURE.md`
- `docs/code-map.md`
- `docs/design-system/foundation-shell-system.md`
- `docs/design-system/benchmark-workflow-system.md`
- `docs/design-system/data-entry-surface-system.md`

Validation:
- `npm run verify:fast`
- `npm run check:file-size`
- `npm run check:boundaries`

Acceptance criteria:
- High-risk files are smaller and easier to hand off.
- Shared UI rules and current docs match the real implementation shape.

## Phase 4: Contract and Workflow Hardening
Objective:
Make the highest-value operational paths easy to test and difficult to break accidentally.

In scope:
- Sales order create, update, and status flows.
- Customer directory, project, and contact flows.
- Owner module toggle flow.
- Additive contract tightening, smoke coverage, and runtime clarity improvements.

Out of scope:
- New modules.
- Non-additive API changes.
- Schema changes that are not required by the workflow hardening slice.

Read first:
- `MODULE_CONTRACTS.md`
- `docs/api-contracts-index.md`
- `docs/golden-paths.md`
- `docs/modules/sales.md`
- `docs/modules/customers.md`
- `docs/modules/kernel.md`

Validation:
- `npm run verify:safe`
- Manual smoke checks from `docs/golden-paths.md`

Acceptance criteria:
- Benchmark workflows have explicit smoke coverage targets.
- Contract-facing changes remain additive and are documented in the same change.

## Phase 5: Deliberate Expansion Only
Objective:
Hold expansion behind explicit contracts and ownership decisions.

In scope:
- Preconditions for any new domain or module activation.
- Explicit contract, route, ownership, and migration rules before activation.
- Continued enforcement that `production` stays inactive until those conditions are met.

Out of scope:
- Ad hoc module activation.
- Cross-module table sharing.
- Roadmap work that bypasses the earlier phases.

Read first:
- `ARCHITECTURE.md`
- `MODULE_CONTRACTS.md`
- `docs/code-map.md`
- `docs/guardrails.md`

Validation:
- `npm run verify:safe`
- Targeted ownership and contract doc review

Acceptance criteria:
- No new module work begins without explicit contracts, routes, ownership, and migration rules.
- Expansion work follows the same source-of-truth discipline established in Phases 1 through 4.

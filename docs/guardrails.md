# Guardrails and Enforcement

## Purpose
This file classifies repository rules by severity so AI agents and human contributors can distinguish non-negotiable constraints from default working conventions.

## Source of Truth Hierarchy
1. `ARCHITECTURE.md` - architecture, dependency rules, security invariants.
2. `MODULE_CONTRACTS.md` - public contracts and compatibility.
3. `docs/code-map.md` - current module ownership, status, and canonical edit paths.
4. `AGENTS.md` and `docs/ai-playbook.md` - workflow guidance.
5. `docs/ROADMAP.md` - execution sequencing and follow-on priorities only.

## Guardrail Classes

| Class | Meaning | Examples | Enforcement |
|---|---|---|---|
| Hard Guardrail | Must hold unless the governing architecture/contract docs are changed first. | Auth, CSRF, prepared SQL, contract-first boundaries, data ownership, locked roles/statuses. | Architecture review, PHP/runtime code, `check:boundaries`, lint, tests. |
| Repository Default | Standard path unless there is a documented repo-level reason to change it. | 300-line file budget, naming conventions, module-local service facades, canonical edit paths, doc updates for contract changes. | `check:file-size`, `check:naming`, lint, code review. |
| Temporary Rule | Applies to an active migration or execution slice. | Refactor execution steps, phased inventory work, bounded cleanup runbooks. | Human review; must not silently override architecture docs. |
| Stale/Conflicting Rule | Guidance that no longer matches current code, modules, or enforcement. | Outdated module lists, broken source-of-truth notes, incomplete lint coverage docs. | Fix in the same change when practical. |

## Current Audit Highlights
- The repo now has active `accounting`, `customers`, `human-resources`, and `inventory` modules in addition to the earlier baseline modules.
- `production` exists only as an inactive scaffold on frontend and backend.
- `docs/ROADMAP.md` is the active execution roadmap and must not override architecture, contracts, or ownership docs.
- The file-size budget already supports documented exceptions through `scripts/file-size-allowlist.json`.
- Boundary enforcement needs to cover alias-based module imports, not only relative imports.
- Naming rules are maintained directly in `docs/naming-conventions.md`; there is no separate ADR track for naming decisions.

## Tooling Notes
- `npm run check:boundaries`
  - Hard guardrail check for cross-module imports, cross-module backend requires, and cross-module table access.
- `npm run check:file-size`
  - Repository default with explicit allowlist support.
- `npm run check:naming`
  - Repository default for naming and namespace consistency.
- `npm run check:doc-contract-sync`
  - Requires contract-facing doc updates for backend/schema/schema-contract changes.

## Documentation Refresh Policy
Whenever current code and docs drift:
- fix the authoritative docs first
- refresh entrypoint docs in the same change
- keep inactive scaffolds explicitly labeled as inactive
- do not leave outdated module inventories in `README`, `AGENTS.md`, or module indexes

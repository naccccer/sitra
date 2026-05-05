# AI Playbook

## Read Order
1. `ARCHITECTURE.md`
2. `MODULE_CONTRACTS.md`
3. `docs/code-map.md`
4. `docs/guardrails.md`
5. `AGENTS.md`
6. `docs/ROADMAP.md`

## Canonical Commands
- Install: `npm ci --prefer-offline --no-audit --no-fund`
- Fast validation: `npm run verify:fast`
- Safe validation: `npm run verify:safe`
- Full tests: `npm run test:all`
- Contract types: `npm run contracts:types`

## Guardrail Summary
- Hard guardrails: security, auth/csrf, prepared SQL, contract-first boundaries, data ownership, locked statuses/roles.
- Repository defaults: file size, naming, canonical edit paths, module-local service facades, doc updates for contract-sensitive changes.
- Temporary rules: active migration or execution slices that must not override architecture docs.

## Working Pattern
1. Read the current ownership map before editing.
2. Change the owning module first.
3. Keep wrappers/adapters thin.
4. Update authoritative docs when contracts or module ownership guidance changes.
5. Pick `verify:fast` or `verify:safe` based on scope.

## AI Execution Assumptions
- Treat the repo as agent-executable by default: choose bounded slices, preserve modular boundaries, and leave validation evidence.
- Use `docs/ROADMAP.md` as the active sequencing document for follow-on work.
- Do not rely on redesign-history or ADR artifacts; current docs are the only source of truth.

## Documentation Refresh Stage
Include a doc sync pass whenever current code exposes drift in:
- active/inactive module lists
- source-of-truth notes
- canonical edit paths
- enforcement behavior vs documented policy

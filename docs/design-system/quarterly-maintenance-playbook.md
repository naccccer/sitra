# Quarterly Maintenance Playbook (Post-Redesign)

Updated: 2026-04-07
Cadence owner: Documentation and governance lead

## Cadence
- **Week 1:** KPI and incident review (time/click/error/UX incidents).
- **Week 2-3:** Debt deletion and conformance fixes.
- **Week 4:** Visual baseline update + documentation reconciliation.

## Required outputs each quarter
1. Updated KPI delta snapshot.
2. Removed/deprecated pattern list updates.
3. Conformance exceptions (if any) with sunset dates.
4. Updated docs where reality changed.

## Release gate checks
- PR checklist adoption rate = 100%.
- No new bespoke primitives merged.
- Visual regression diffs triaged for all perceptible UI changes.

## Escalation
- Repeated KPI regression or drift-score breach triggers full rewrite evaluation per `ux-optimization-playbook.md` trigger matrix.

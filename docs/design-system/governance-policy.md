# Design System Governance Policy (Post-Program)

Updated: 2026-04-08
Owner: Design-system governance owner

## 1) Enforcement policy for token/component compliance

### Policy levels
1. **Blocker (must fail PR)**
   - New bespoke page shell/template outside shared contracts.
   - New bespoke primitive when an existing shared primitive can be extended.
   - Hardcoded visual values where token exists (color/spacing/radius/shadow/motion/z-index/state).
2. **Warning (must be resolved before phase close)**
   - Temporary module-local wrapper introduced with documented sunset path.
   - Partial conformance in transitional migration PRs.
3. **Informational**
   - Documentation follow-ups that do not impact runtime behavior.

### Required compliance rules
- Use shared tokens from `src/index.css` for visual foundation values.
- Use `docs/design-system/foundation-shell-system.md` for shell/action/state contracts.
- Use `docs/design-system/benchmark-workflow-system.md` for benchmark workflow behavior and submission states.
- Use `docs/design-system/data-entry-surface-system.md` for table/form/modal grammar and confirmation behavior.
- Use shared UI primitives from `src/components/shared/ui/*` before adding new primitives.
- Keep module internals module-owned, but rendering grammar must compose from shared contracts.
- Every new component variant must document usage, states, and migration impact.
- Treat `docs/real-ui-ux/real-ui_ux-redesign-roadmap.md` as the canonical historical redesign record.

### Maintenance thresholds and rewrite triggers
- Track and review monthly:
  - New `window.confirm` usage count (target: `0`).
  - New module-local table/form/modal primitives that duplicate shared contracts (target: `0`).
  - Shared-primitive override hotspots requiring `!important` or large local class bundles (trigger review at `>= 3` active hotspots).
- Trigger a focused cleanup slice when any threshold is exceeded in two consecutive releases.

### AI-only workflow optimization
- Prefer extending existing component variants over creating new files.
- Keep diffs focused: one contract change + one adoption slice per PR.
- Include explicit deprecation/sunset notes for any temporary divergence.

---

## 2) PR conformance checklist (required)

Use `.github/PULL_REQUEST_TEMPLATE.md` checklist in every PR:
- Token usage compliance
- Primitive reuse compliance
- Universal state grammar compliance
- Permission/action clarity check
- Docs sync check (`docs/real-ui-ux/real-ui_ux-redesign-roadmap.md` + relevant design-system contract docs)
- Screenshot/visual evidence for perceptible UI changes

Any unchecked blocker item means PR is not merge-ready.

---

## 3) Visual regression baseline and breakage response

### Baseline definition
- Baseline screens: all module entry pages + high-frequency workspaces + auth + key modal states.
- Baseline state set per screen: default, loading, empty, error, success/archived (where applicable), permission-restricted.

### Process
1. Capture baseline snapshots at phase close.
2. For UI PRs, compare changed screens against baseline.
3. If diff is intentional, attach rationale + updated snapshot.
4. If diff is unintentional, block merge and revert/fix.

### Breakage response SLA
- **Severity 1 (workflow blocked / unreadable / wrong action semantics):** hotfix same day.
- **Severity 2 (major drift, not blocking):** fix in next patch release.
- **Severity 3 (minor cosmetic):** queue for debt cycle.

### Ownership
- PR author: first-pass diff triage.
- Reviewer/agent owner: policy conformance decision.
- Release owner: final baseline approval at phase close.

---

## 4) Component change policy + release notes format

### Component change policy
Each component-affecting PR must include:
1. Why existing primitive/variant was insufficient.
2. Contract delta (props, states, behavior).
3. Adoption impact (which modules affected now vs later).
4. Deprecation path for replaced patterns.

### Release notes format (UI/DS)
Use this structure:
- **Added:** new shared contracts/variants.
- **Changed:** behavior/style contract deltas.
- **Deprecated:** patterns scheduled for removal.
- **Removed:** deleted bespoke patterns.
- **Migration notes:** required updates for consuming modules.
- **Visual impact:** baseline snapshots updated (yes/no) + affected screens.

# AI-First Optimization Roadmap (Session-Bounded)

## Objective
- Reduce average Codex session usage by **40% within 30 days** while improving maintainability.
- Execute all optimization work through Codex (Cursor), with **one fresh session per phase**.
- Keep each phase tightly scoped, decision-complete, and fully trackable in this file.

## Baseline Snapshot (Fill Before Phase 1)
| Field | Value |
|---|---|
| Baseline Date | `YYYY-MM-DD` |
| Last 10 Sessions Average Usage | `<fill>` |
| Current Codex Model Profile | `gpt-5.3-codex + reasoning high` (update if changed) |
| Target Average Usage | `-40% from baseline` |
| Notes | `<fill>` |

## Operating Rules (AI-First)
- One phase equals one Codex session. Do not start two phases in one session.
- Session budget per phase: target `60-90 min`, max `~8 edited files`.
- No broad refactors. Only do work listed in the active phase checklist.
- Respect repository rules in `AGENTS.md` (module boundaries, CSRF/auth/PHP guards, file-size policy, validation modes).
- End-of-session is not complete until:
1. Phase checklist is updated in this roadmap.
2. Changelog row is appended.
3. Evidence links/notes are recorded.

## Phase Board

### Phase 1: Codex Cost Optimization
**Goal**: reduce session cost through model/rules/process tuning (no codebase cleanup yet).  
**Scope Lock**: config/process/docs only, minimal and reversible edits.

**Definition of Done (DoD)**
- Daily model profile and escalation rule are documented and applied.
- Prompt discipline template is added and used.
- Baseline vs post-change metrics are logged in this file.
- Phase 1 validation commands are executed.

**Checklist**
- [ ] Record baseline metrics in "Baseline Snapshot".
- [ ] Set default day-to-day mode to mini + low/medium reasoning (or codify the active equivalent profile).
- [ ] Add explicit escalation rule for high-risk tasks only (PHP/schema/API contracts/complex incident debugging).
- [ ] Add short session prompt discipline template (scope lock, file budget, required output format).
- [ ] Capture post-change 10-session average and calculate delta.
- [ ] Update changelog row for Phase 1.

**Validation Commands (Phase 1 only)**
```bash
git status --short
rg -n "Operating Rules|Phase 1|Post-Phase Update Protocol" optimizing_roadmap.md
```

**Required Evidence**
- Before/after average usage values.
- Final model/rule profile used.
- Any residual risk that may increase usage.

**Fresh Session Prompt (Copy/Paste)**
```text
You are in c:\xampp\htdocs\sitra. Execute Phase 1 from optimizing_roadmap.md only.
Scope: Codex cost optimization only (no unrelated refactor).
Rules:
- Keep changes minimal and reversible.
- Prefer config/process/docs updates.
- Respect AGENTS.md and existing repo rules.
Tasks:
1) Complete all Phase 1 checklist items.
2) Record baseline and post-change usage metrics.
3) Run phase validation commands only.
4) Update optimizing_roadmap.md:
   - mark Phase 1 tasks done/undone,
   - append one changelog row with evidence.
Output:
- changes made
- metric delta (%)
- residual risks
```

---

### Phase 2: Dead Code + Hotspot Cleanup
**Goal**: remove verified dead code and split 1-2 oversized hotspots with low regression risk.  
**Scope Lock**: targeted cleanup only; no architecture rewrite.

**Definition of Done (DoD)**
- Dead code candidates are removed with proof (no active references/runtime path).
- 1-2 oversized hotspots are split into smaller units.
- Module boundaries and file-size rules remain compliant.
- Phase 2 validation commands pass.

**Checklist**
- [ ] Select at most 2 hotspots for this session (from oversized or high-churn files).
- [ ] Remove only dead code with verification evidence (`rg`/imports/runtime path checks).
- [ ] Refactor selected hotspots incrementally (small PR-style changes).
- [ ] Keep edits within the session file budget (`~8 files` max).
- [ ] Run Phase 2 validation commands and capture results.
- [ ] Update changelog row for Phase 2.

**Validation Commands (Phase 2 only)**
```bash
npm run verify:fast
```

**Required Evidence**
- List of removed dead items.
- Hotspots touched and why they were chosen.
- Validation output summary.

**Fresh Session Prompt (Copy/Paste)**
```text
You are in c:\xampp\htdocs\sitra. Execute Phase 2 from optimizing_roadmap.md only.
Scope: verified dead code removal + targeted hotspot cleanup.
Rules:
- No broad refactor.
- Remove only code with verified no active references/runtime path.
- Keep file-size policy and module boundaries intact.
Tasks:
1) Complete Phase 2 checklist.
2) Remove dead code candidates with proof.
3) Refactor only selected hotspots in roadmap scope.
4) Run phase validation commands.
5) Update optimizing_roadmap.md:
   - checklist state,
   - changelog row with removed items and validation evidence.
Output:
- deleted/cleaned items
- hotspots improved
- checks result
- follow-up backlog
```

---

### Phase 3: Hard DB Cleanup
**Goal**: perform safe hard cleanup of approved legacy DB objects and sync docs/contracts.  
**Scope Lock**: only approved legacy inventory v1 cleanup + related sync.

**Approved Legacy Inventory V1 Tables**
- `inventory_warehouses`
- `inventory_items`
- `inventory_stock`
- `inventory_documents`
- `inventory_document_lines`
- `inventory_requests`
- `inventory_count_sessions`
- `inventory_count_lines`

**Definition of Done (DoD)**
- Quick DB snapshot is created before destructive actions and evidence logged.
- Approved legacy tables are removed via tracked migration/script.
- `database/schema.sql` and relevant docs/contracts are synchronized.
- Safe validation and smoke checks are completed.

**Checklist**
- [ ] Create quick DB snapshot before any destructive command.
- [ ] Verify snapshot restore on non-production target (or documented restore drill).
- [ ] Apply hard cleanup for approved legacy tables only.
- [ ] Sync affected schema/docs/contracts references.
- [ ] Run Phase 3 validation commands and smoke checks.
- [ ] Update changelog row for Phase 3 with snapshot and drop evidence.

**Validation Commands (Phase 3 only)**
```bash
npm run verify:safe
```

**Required Evidence**
- Snapshot filename/path and timestamp.
- Restore verification note.
- Dropped objects list.
- Validation + smoke check summary.

**Fresh Session Prompt (Copy/Paste)**
```text
You are in c:\xampp\htdocs\sitra. Execute Phase 3 from optimizing_roadmap.md only.
Scope: hard DB cleanup for approved legacy objects.
Critical safety:
- Create quick DB snapshot before destructive changes.
- Log snapshot evidence in roadmap.
Tasks:
1) Complete Phase 3 checklist exactly.
2) Drop only approved legacy inventory_v1 tables listed in roadmap.
3) Sync schema/docs/contracts references as required.
4) Run phase validation commands and smoke checks.
5) Update optimizing_roadmap.md:
   - checklist state,
   - changelog row with snapshot proof, dropped objects, validation evidence.
Output:
- snapshot proof
- dropped objects
- validation summary
- remaining risks
```

## Phase Completion Changelog
| Phase | Date | Session ID/Branch | Done By (AI) | Results | Validation | Risks/Follow-up | Evidence |
|---|---|---|---|---|---|---|---|
| Phase 1 | `YYYY-MM-DD` | `<fill>` | `Codex` | `Pending` | `Pending` | `Pending` | `Pending` |
| Phase 2 | `YYYY-MM-DD` | `<fill>` | `Codex` | `Pending` | `Pending` | `Pending` | `Pending` |
| Phase 3 | `YYYY-MM-DD` | `<fill>` | `Codex` | `Pending` | `Pending` | `Pending` | `Pending` |

## Post-Phase Update Protocol (Mandatory, 5 Steps)
- [ ] 1) Update the active phase checklist in this file (mark done/undone honestly).
- [ ] 2) Append or update the phase row in "Phase Completion Changelog".
- [ ] 3) Record concrete evidence: commands run, metrics, changed files, snapshot/drop info (when applicable).
- [ ] 4) Write residual risks and explicit next-step backlog for the next session.
- [ ] 5) Confirm the roadmap is now the source of truth before ending the session.

## Completion Gate
- This roadmap is considered active only if each completed phase has:
1. Updated checklist state.
2. Updated changelog entry.
3. Evidence notes.
- If a phase is partially done, mark it explicitly as partial in Results and carry remaining tasks forward.

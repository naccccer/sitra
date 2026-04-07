# UX Optimization Playbook (Phase 5)

Updated: 2026-04-07
Owner: Product UX optimization owner

## 1) KPI dashboard spec

### Dashboard goal
Tie every UX change to measurable operational outcomes while preserving system-wide consistency.

### KPI groups

#### A. Time-on-task
- `order_create_time_ms` (start form -> successful save)
- `order_find_to_open_time_ms` (search input -> details open)
- `inventory_operation_action_time_ms` (action click -> state updated)
- `voucher_entry_time_ms` (new voucher -> save success)

#### B. Click efficiency
- `clicks_per_task_p50`
- `clicks_per_task_p75`
- `clicks_to_primary_action`

#### C. Error quality
- `validation_error_rate`
- `recoverable_error_rate`
- `fatal_error_rate`
- `error_recovery_time_ms`

#### D. UX incidents
- `ux_incidents_per_1000_sessions`
- `incident_severity_mix` (S1/S2/S3)
- `incident_reopen_rate`

### Dimensions/filters
- Module (`sales`, `inventory`, `accounting`, `customers`, `human-resources`, `users-access`, `master-data`)
- Role (`admin`, `manager`, `sales`)
- Screen/workflow ID
- Release version

### Instrumentation contract
Each critical workflow emits:
- `task_start`
- `first_interaction`
- `submit_attempt`
- `submit_success`
- `submit_error`
- `cancel`

### KPI targets (quarterly)
- Time-on-task: **-20%** median for top workflows.
- Clicks/task (P75): **-15%**.
- Validation errors/session: **-25%**.
- UX incidents/1000 sessions: **-30%**.

---

## 2) Recurring optimization playbook (quarterly debt deletion cycle)

### Cadence
- **Week 1:** Baseline review + hotspot ranking.
- **Week 2–4:** Targeted optimization sprints (highest ROI workflows first).
- **Week 5:** Visual/interaction conformance audit.
- **Week 6:** Debt deletion PRs + documentation reconciliation.

### Quarterly workflow
1. Pull KPI deltas against prior quarter.
2. Rank top 10 workflows by operator volume x pain score.
3. Select top 3 modernization bets (one per major module cluster).
4. Ship with explicit before/after KPI hypotheses.
5. Validate 2-week post-release KPI movement.
6. Delete deprecated patterns and update docs in same PR.

### Required release artifact per optimization slice
- KPI hypothesis table (before/target/actual)
- Affected component contracts
- Removed patterns list
- Risk and rollback notes

---

## 3) Rewrite trigger matrix (full pattern rewrite rules)

| Trigger | Threshold | Action | Priority |
|---|---|---|---|
| Time regression | >15% increase in median task time for 2 consecutive releases | Full pattern rewrite proposal | P0 |
| Click inflation | >20% increase in P75 clicks/task | Workflow redesign sprint | P1 |
| Error spike | >25% rise in validation or recoverable errors | Form/interaction rewrite | P0 |
| Incident spike | >30% rise in UX incidents per 1000 sessions | End-to-end pattern audit + rewrite | P0 |
| Drift score breach | >10% screens failing conformance audit | Shared contract refactor cycle | P1 |
| Role confusion | >5% role-based action misfire rate | Permission-action UX rewrite | P0 |

### Escalation policy
- P0: triage within 24h, mitigation/hotfix plan same week.
- P1: include in next sprint planning.
- P2: queue in debt cycle backlog.

### Consistency guardrail
No rewrite may introduce bespoke primitives. Any new pattern must land in shared contracts first, then adopt module-by-module.

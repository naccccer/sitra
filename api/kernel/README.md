# Backend Kernel

Shared backend infrastructure primitives:
- auth/session/csrf helpers
- permission checks
- audit writers
- module registry helpers
- owner control guard (`ModuleGuard.php`)
- integration contracts for cross-module orchestration (transitional)

No business-domain rules should be implemented here.

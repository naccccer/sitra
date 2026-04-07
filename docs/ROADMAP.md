# Sitra ERP Roadmap

Updated: 2026-04-08
Purpose: future-only planning

This file is future-looking only. Do not use it as the source of truth for current architecture, contracts, module ownership, or active redesign execution.

Current truth locations:
- architecture and security: `ARCHITECTURE.md`
- contracts and compatibility: `MODULE_CONTRACTS.md`
- active ownership map: `docs/code-map.md`
- guardrails: `docs/guardrails.md`
- active redesign program: `docs/real-ui-ux/real-ui_ux-redesign-roadmap.md`

## Near-term roadmap themes
1. Execute the active UI and UX redesign program phase by phase from `docs/real-ui-ux/`.
2. Remove legacy redirect routes after redesign phases make them unnecessary.
3. Continue tightening shared UI governance so new bespoke patterns do not reappear.
4. Keep `production` inactive until explicit contracts, routes, and migration rules are defined.

## Validation gate
- Fast: `npm run verify:fast`
- Safe: `npm run verify:safe`
- Full: `npm run test:all`

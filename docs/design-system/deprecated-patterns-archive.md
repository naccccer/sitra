# Deprecated Pattern Archive (Final)

Updated: 2026-04-07

## Deprecated / disallowed patterns
1. Bespoke page-level shell wrappers outside `WorkspaceShellTemplate`.
2. Ad-hoc loading/empty/error blocks when `UniversalState` applies.
3. Hardcoded visual primitives where tokens already exist.
4. Module-specific top-level navigation wrappers duplicating shared contracts.
5. Untracked component variants without contract + migration notes.

## Replacement mapping
- Page shell -> `WorkspaceShellTemplate`
- State rendering -> `UniversalState`
- PR compliance -> `.github/PULL_REQUEST_TEMPLATE.md`
- Component change process -> `docs/design-system/component-contribution-template.md`

## Archive policy
- Deprecated patterns must not be introduced in new code.
- Existing legacy usages must be tracked as debt and removed in quarterly maintenance cycles.

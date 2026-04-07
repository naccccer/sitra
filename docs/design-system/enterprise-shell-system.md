# Enterprise Design System: Tokens + Shell Contracts

## 1) Token Spec (single enterprise visual language)

### Color tokens
- **Brand/core:** `--ui-primary`, `--ui-primary-contrast`, `--ui-accent`, `--ui-accent-strong`, `--ui-accent-muted`
- **Surfaces:** `--ui-bg`, `--ui-bg-accent`, `--ui-surface`, `--ui-surface-elevated`, `--ui-surface-muted`, `--ui-surface-glass`
- **Borders/text:** `--ui-border`, `--ui-border-soft`, `--ui-text`, `--ui-text-muted`, `--ui-focus`
- **Semantic states:**
  - info: `--ui-info-*`
  - success: `--ui-success-*`
  - warning: `--ui-warning-*`
  - danger: `--ui-danger-*`
  - loading: `--ui-state-loading-*`
  - empty: `--ui-state-empty-*`
  - archived: `--ui-state-archived-*`

### Type tokens
- `--type-xs`, `--type-sm`, `--type-md`, `--type-lg`, `--type-xl`, `--type-2xl`

### Spacing tokens
- `--space-0` through `--space-6`

### Radius tokens
- `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-2xl`

### Shadow tokens
- `--shadow-soft`, `--shadow-surface`, `--shadow-strong`, `--shadow-overlay`, `--shadow-accent`

### Motion tokens
- durations: `--motion-duration-fast`, `--motion-duration-base`, `--motion-duration-slow`
- easing: `--motion-easing-standard`
- aliases: `--motion-fast`, `--motion-base`
- accessibility: reduced motion fallback in `prefers-reduced-motion`

### Z-index tokens
- `--z-base`, `--z-dropdown`, `--z-shell-header`, `--z-shell-nav`, `--z-modal`, `--z-toast`

## 2) Shared shell/page-template contracts

### Shell contract
- **Main container:** `MainLayout`
- **Navigation rail:** `Sidebar` + `app-shell-nav`
- **Global header:** `Header` + `app-shell-header`
- **Page wrapper:** `app-shell`, `app-shell-content`
- **Page header visual contract:** `page-header-shell`

### Page template contract
- **Page intro/header:** `WorkspacePageHeader`
- **Page action/filter toolbar:** `WorkspaceToolbar`
- **Universal async/state rendering:** `UniversalState`

### Universal states contract
- `UniversalState` supports exactly:
  - `loading`
  - `empty`
  - `error`
  - `success`
  - `archived`

This is the single shared state primitive for page-level and table-level states.

## 3) Migration map (old shell/nav/state to shared implementation)

| Old pattern | New shared contract | Status |
|---|---|---|
| `z-30` header styling in `Header.jsx` | `app-shell-header` tokenized layer | migrated |
| bespoke header glass wrapper in `Header.jsx` | `page-header-shell` contract | migrated |
| hardcoded `z-40` sidebar layering in `Sidebar.jsx` | `app-shell-nav` tokenized layer | migrated |
| ad-hoc loading/error blocks in app bootstrap (`App.jsx`) | `UniversalState` (`loading` / `error`) | migrated |
| table-local custom loading/error/empty rendering in `DataTableState` | `UniversalState` (`loading` / `error` / `empty`) | migrated |
| state tone set without archived token | `InlineAlert tone="archived"` + archived tokens | migrated |

## 4) Implementation checklist

- [x] Add state/type/motion/z-index token families to root token set.
- [x] Add reduced-motion fallback behavior.
- [x] Add shell contract classes (`app-shell-nav`, `app-shell-header`, `page-header-shell`).
- [x] Introduce `UniversalState` component for standardized universal states.
- [x] Wire `UniversalState` into application hydration/error states.
- [x] Wire `UniversalState` into table-level state renderer (`DataTableState`).
- [x] Extend semantic alert contract with archived state tone.
- [ ] Incrementally migrate remaining module-local bespoke status banners to `UniversalState` / `InlineAlert` tokens.

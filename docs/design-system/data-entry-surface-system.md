# Shared Data-Entry and Data-Surface System

Scope: shared tables, forms, modals, and confirmation behavior

## Purpose
This contract defines the shared interaction grammar for dense operational screens.
It extends the shell/state rules in `foundation-shell-system.md` and the benchmark flow rules in `benchmark-workflow-system.md`.

## 1) Table grammar
- Use shared `DataTable*` primitives for all operational list surfaces.
- Keep row actions in a dedicated actions column (`DataTableActions`) with icon-only controls and explicit tooltip labels.
- Keep state rows (`DataTableState`) inside the table body; do not swap table chrome for ad-hoc empty cards.
- Preserve scanability with compact rows, stable column alignment, and tabular numerics for codes/counts/dates.
- Use row tone only for operational state (active/archived/selected/expanded), not decorative emphasis.
- Bulk or archive mode states must be surfaced in toolbars, not repeated per-row in decorative tags.

## 2) Form grammar
- Use shared `FormSection` and `FormField` to group related fields.
- Required-state treatment is explicit via the shared required marker; optional clarifications use hint tooltips.
- Validation timing:
  - Required-field checks happen on submit.
  - Field-level errors stay near the corresponding field via `FieldMessage`.
  - Global submission failures remain in one top-level inline alert.
- Submit states must disable duplicate submission and show progress labels (`در حال ...`).
- Avoid redundant helper paragraphs in modal bodies when tooltip hints provide sufficient context.

## 3) Modal grammar
- Use `ModalShell` for all secondary tasks.
- Structure:
  - Header: title + optional compact description.
  - Body: grouped fields/content with one primary task focus.
  - Footer: right-sized action set (cancel + primary) in consistent order.
- Close behavior:
  - Explicit close action is always visible.
  - Destructive actions requiring operator intent use `ConfirmDialog`; browser-native confirms are deprecated.
- Sizing:
  - `max-w-md` for confirmation and simple forms.
  - `max-w-lg`/`max-w-2xl` for multi-field or tabbed content.

## 4) Deprecated patterns
- Browser-native `window.confirm` on shared operational surfaces is deprecated.
- Unstructured modal form bodies with repeated local label/input styling are deprecated in favor of `FormSection` + `FormField`.

## 5) Representative adoption anchors
- Inventory archive panels (locations, lots) now use shared form grouping + shared confirmation modal.
- Human resources archive/delete actions now use shared confirmation modal.

## 6) Current exceptions
- Some inventory and accounting workflows still use bespoke overlays and local form markup.
- Program-wide `window.confirm` replacement is complete for active operational modules; remaining consistency work is table/form/modal wrapper normalization when those surfaces are touched.

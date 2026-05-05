# Benchmark Workflow System

Owner: Shared workflow runtime
Scope: benchmark workflow for sales order entry plus customer/project intake

## Runtime contract anchors
- Order-entry customer context surface: `src/modules/sales/components/customer/order-form/OrderCustomerContextPanel.jsx`
- Customer/project linkage modal: `src/modules/sales/components/customer/order-form/OrderCustomerLinkModal.jsx`
- Customer/project linkage state contract: `src/modules/sales/components/customer/order-form/useOrderCustomerLinks.js`
- Final review and submit modal: `src/modules/sales/components/customer/order-form/CheckoutModal.jsx`
- Submission result contract: `src/modules/sales/components/customer/order-form/orderFormSubmitter.js`

## Workflow rules
- Capture editable customer snapshot fields on the main order page before final confirmation.
- Keep customer/project/customer-contact selection in a dedicated modal; do not hide lookup or quick-create work inside the final confirmation step.
- Use shared primitives (`ModalShell`, `Button`, `Input`, `Select`, `InlineAlert`, `Tooltip`, `UniversalState`) for benchmark workflow surfaces before adding local one-off chrome.
- Customer/project linkage is workflow guidance, not a hard blocker:
  - Missing order snapshot name or phone blocks submission.
  - Missing linked customer or project warns the operator but does not block submission.
- Final confirmation modal is review-and-submit only:
  - summarize customer snapshot
  - summarize linkage state
  - summarize order count and total
  - show instructional success or failure copy

## State grammar for the benchmark flow
- `editing`
  - Keep edit mode explicit near the top of the page and preserve the cancel path.
- `link-warning`
  - Encourage customer/project linkage early, without forcing a detour.
- `validation-error`
  - Explain what must be corrected and send the operator back to the exact working surface.
- `request-error`
  - Keep the operator in context and preserve entered data for retry.
- `success`
  - Confirm what happened next:
    - tracking code when available
    - offline queue wording when not immediately synced
    - clear path back to the next order

## Guidance and chrome rules
- Optional explanation belongs behind tooltip/help affordances.
- Do not add extra wrapper cards around summary rows when a single workflow surface is already clear.
- Avoid decorative badges in top workflow toolbars; prefer compact plain-language status text.

## Current boundaries
- Configuration-specific sales overlays outside customer/project linking should move toward shared modal patterns when touched.
- Repo-wide confirmation behavior should continue using the shared confirmation contract rather than browser-native dialogs.
- Reusable table, form, and modal standards remain the shared contract for broader module adoption.

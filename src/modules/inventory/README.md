# Inventory Module

Inventory module for glass factory operations.

Scope:
- Warehouse master data (raw-input, finished-output)
- Inventory items with category-specific attributes
- Inventory documents: receipt, issue, transfer, adjustment
- Inventory requests (sales -> manager/admin approval)
- Inventory counting sessions (cycle/annual) with warehouse lock
- Inventory reports (stock, ledger, documents flow, variance, requests)
- Inventory V2 Phase 1 shell (`/inventory-v2`) with master-data scaffolds and role-aware tabs

Rules:
- Keep module logic inside `src/modules/inventory/*`.
- Use `inventoryApi` facade in module components.
- Respect RTL labels and workflow constraints from AGENTS.md.

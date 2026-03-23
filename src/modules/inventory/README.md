# Inventory Module

Inventory module for glass factory operations.

Scope:
- Inventory V2 UI and workflows on `/inventory`
- V2 master data (products, warehouses, locations, lots)
- V2 operations lifecycle (receipt, delivery, transfer, adjustment, production moves)
- V2 reservation and fulfillment flow integrated with operations
- V2 count/replenishment/report tabs and scaffolds

Rules:
- Keep module logic inside `src/modules/inventory/*`.
- Use `inventoryApi` facade in module components.
- Respect RTL labels and workflow constraints from AGENTS.md.

Evaluation dataset:
- Use `npm run db:seed-inventory-v2-mock` to load comprehensive Inventory V2 mock data
  (products, variants, warehouses, locations, lots, quants, operations, reservations, ledger).

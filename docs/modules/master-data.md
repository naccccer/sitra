# Master-Data Module

## Responsibility
- Own canonical operational reference data used by other modules.

## Owns
- Catalog model (glasses, connectors, operations, fees, rules).
- Catalog persistence and validation.

## Public Services
- `catalog_get`
- `catalog_save`

## Data Ownership
- Owns catalog-related records in `system_settings` and future dedicated tables.

## Interaction Rules
- Other modules consume catalog via contract, not direct table reads.
- All writes go through master-data services.


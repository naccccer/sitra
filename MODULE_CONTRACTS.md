# Sitra ERP Module Contracts

## Purpose
- This file defines stable contracts between modules in the Modular Monolith.
- Contracts are mandatory for backend services, endpoint adapters, and frontend module boundaries.
- If a contract changes, this file must be updated in the same change.

## Global Contract Rules
- Modules cannot read/write another module's private tables.
- Cross-module calls must go through public service contracts.
- Contracts must be versioned when breaking changes are unavoidable.
- During migration, legacy API payloads remain backward compatible.

## Contract Format
- Contract ID: unique name, e.g. `sales.release_order.v1`.
- Owner Module: module that owns behavior and data.
- Input DTO: validated shape.
- Output DTO: stable response shape.
- Side Effects: exact persisted changes and emitted events.
- Errors: deterministic error codes/messages.

## Kernel Contracts

### `kernel.auth_context.v1`
- Owner: `kernel`
- Input:
  - Request/session context.
- Output:
  - `user`: `{ id, username, role } | null`
  - `authenticated`: `boolean`
- Errors:
  - `401` when auth is required but missing.

### `kernel.permission_check.v1`
- Owner: `kernel`
- Input:
  - `role: string`
  - `action: string`
- Output:
  - `allowed: boolean`

### `kernel.audit_log.v1`
- Owner: `kernel`
- Input:
  - `actorId: string | null`
  - `action: string`
  - `entityType: string`
  - `entityId: string`
  - `changes: object`
  - `meta: object`
- Output:
  - `auditId: string`

### `kernel.module_registry.v1`
- Owner: `kernel`
- Input (`PATCH`):
  - `moduleId: string`
  - `enabled: boolean`
- Output:
  - `modules: array<{ id, label, enabled, phase, isProtected, dependsOn[], sortOrder, updatedAt, updatedByUserId }>`
- Side Effects:
  - Persist toggle in `module_registry`.
  - Append audit event `kernel.module_registry.updated`.
- Errors:
  - `403` `owner_required` when actor is not System Owner (`admin` + `APP_OWNER_UID`).
  - `409` `module_protected` when disabling protected modules.
  - `409` `module_dependency_blocked` when disabling a required dependency (`production -> inventory`).

### `kernel.module_gate.v1`
- Owner: `kernel`
- Input:
  - `moduleId: string`
- Output:
  - `allowed: boolean`
- Errors:
  - `403` with payload `{ code: 'module_disabled', module: <moduleId> }` when target module is disabled.

## Master Data Contracts

### `master_data.catalog_get.v1`
- Owner: `master-data`
- Input: none
- Output:
  - `catalog: object | null`

### `master_data.catalog_save.v1`
- Owner: `master-data`
- Input:
  - `catalog: object`
- Output:
  - `catalog: object`
- Side Effects:
  - Upsert `system_settings.setting_key = 'catalog'`.

## Sales Contracts

### `sales.order_create.v1`
- Owner: `sales`
- Input:
  - customer/order payload compatible with current `/api/orders.php` POST.
- Output:
  - `order: object`
- Side Effects:
  - Persist order row and order metadata.

### `sales.order_update.v1`
- Owner: `sales`
- Input:
  - payload compatible with current `/api/orders.php` PUT.
- Output:
  - `order: object`

### `sales.order_status_set.v1`
- Owner: `sales`
- Input:
  - `id: number`
  - `status: 'pending' | 'processing' | 'delivered' | 'archived'`
- Output:
  - `order: object`

### `sales.release_order_lines.v1`
- Owner: `sales`
- Input:
  - `orderId: number`
  - `lineNos?: number[]` (default = all releasable lines)
  - `enforceStockCheck?: boolean`
  - `lineOverrides?: { [lineNo]: { requiresDrilling?: boolean, orderRowKey?: string, templatePublicSlug?: string, publicTemplateUrl?: string } }`
- Output:
  - `workOrders: array`
- Side Effects:
  - Triggers `production.work_order_create_from_release.v1`.
  - Triggers `inventory.reserve_for_release.v1` (next phase).

## Production Contracts

### `production.work_order_create_from_release.v1`
- Owner: `production`
- Input:
  - `orderId: number`
  - `lineNos?: number[]`
  - `lineOverrides?: object`
- Output:
  - `workOrders: array`
- Side Effects:
  - Create work orders at order-line granularity.
  - Persist `order_lines` with:
    - `order_row_key` (`{orderNumber}-{row}` format)
    - `requires_drilling` (label alert trigger)
    - `public_template_url` / QR payload fields.

### `production.work_order_stage_set.v1`
- Owner: `production`
- Input:
  - `workOrderId: number`
  - `stage: string`
  - `stationKey?: string` (must be allowed by actor role mapping)
  - `consumeQty?: number` (optional consume from reservation)
- Output:
  - `workOrder: object`
  - `consumption?: reservation object`

### `production.station_presets_for_role.v1`
- Owner: `production`
- Input:
  - `role: string`
- Output:
  - `stationPresets: array<{ stationKey, label, defaultStage, printTemplatePreset, defaultLabelCopies }>`
- Side Effects:
  - none (read-only master data projection)

### `production.pattern_file_attach.v1`
- Owner: `production`
- Input:
  - `workOrderId: number`
  - `fileRef: object`
- Output:
  - `patternFile: object`

### `production.label_print.v1`
- Owner: `production`
- Input:
  - `workOrderId?: number`
  - `orderRowKey?: string`
  - `action: 'preview' | 'print'`
  - `copies?: number` (1..100, used for `print`)
- Output:
  - `labelData: object`
  - `action: 'preview' | 'print'`
  - `copies: number`
- Side Effects:
  - For `print`: increment `production_work_orders.label_print_count`.
  - For `print`: increment `order_lines.label_print_count`.
  - For `print`: append `production_work_order_events` with `label_printed`.
  - For `print`: append audit event `production.label.printed`.

## Inventory Contracts

### `inventory.reserve_for_release.v1`
- Owner: `inventory`
- Input:
  - `orderId: number`
  - `orderLineId: number`
  - `workOrderId: number`
  - `orderRowKey: string`
  - `qtyReserved: number`
- Output:
  - `reservation: object`
- Side Effects:
  - Upsert row in `inventory_stock_reservations`.
  - Insert stock ledger entry with `movement_type = reserve/release`.

### `inventory.stock_move.v1`
- Owner: `inventory`
- Input:
  - `itemId: number`
  - `type: 'in' | 'out' | 'adjust'`
  - `qty: number`
  - `reference: object`
- Output:
  - `movement: object`

### `inventory.consume_for_work_order.v1`
- Owner: `inventory`
- Input:
  - `workOrderId: number`
  - `consumeQty: number`
- Output:
  - `reservation: object`
- Side Effects:
  - Increase `qty_consumed` in reservation.
  - Insert `consume` movement in stock ledger.

## Users and Access Contracts

### `users_access.user_list.v1`
- Owner: `users-access`
- Input: none
- Output:
  - `users: array`

### `users_access.user_create.v1`
- Owner: `users-access`
- Input:
  - `username: string`
  - `password: string`
  - `role: string`
- Output:
  - `user: object`
- Errors:
  - `403` `owner_required_to_assign_admin_role` when non-owner tries to create `admin`.

### `users_access.user_update.v1`
- Owner: `users-access`
- Input:
  - `id: number`
  - mutable fields subset.
- Output:
  - `user: object`
- Errors:
  - `403` `owner_required_to_modify_admin_user` when non-owner edits an `admin` account.
  - `403` `owner_required_to_change_admin_role` when non-owner changes role to/from `admin`.

### `users_access.user_active_set.v1`
- Owner: `users-access`
- Input:
  - `id: number`
  - `isActive: boolean`
- Output:
  - `user: object`
- Errors:
  - `403` `owner_required_to_change_admin_activation` when non-owner activates/deactivates `admin`.

## API Adapter Mapping (Current)
- `/api/bootstrap.php`:
  - `kernel.auth_context.v1`
  - `kernel.module_registry.v1` (read projection only for Owner)
  - `master_data.catalog_get.v1`
  - sales read model (existing order shape)
- `/api/module_registry.php`:
  - `kernel.module_registry.v1`
- `/api/orders.php`:
  - `sales.order_create.v1`
  - `sales.order_update.v1`
  - `sales.order_status_set.v1`
- `/api/catalog.php`:
  - `master_data.catalog_get.v1`
  - `master_data.catalog_save.v1`
- `/api/users.php`:
  - users-access contracts listed above
- `/api/production.php`:
  - `production.work_order_create_from_release.v1`
  - `production.work_order_stage_set.v1` (`PATCH`)
  - `production.station_presets_for_role.v1` (`GET` embedded `stationPresets`)
- `/api/production_labels.php`:
  - `production.label_print.v1` (`GET` preview, `POST` preview/print)
- `/api/inventory.php`:
  - read model for:
    - reservations (`view=reservations`)
    - stock ledger (`view=ledger`)

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
- Output:
  - `workOrder: object`

### `production.pattern_file_attach.v1`
- Owner: `production`
- Input:
  - `workOrderId: number`
  - `fileRef: object`
- Output:
  - `patternFile: object`

## Inventory Contracts

### `inventory.reserve_for_release.v1`
- Owner: `inventory`
- Input:
  - `orderId: number`
  - `requirements: array`
- Output:
  - `reservations: array`

### `inventory.stock_move.v1`
- Owner: `inventory`
- Input:
  - `itemId: number`
  - `type: 'in' | 'out' | 'adjust'`
  - `qty: number`
  - `reference: object`
- Output:
  - `movement: object`

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

### `users_access.user_update.v1`
- Owner: `users-access`
- Input:
  - `id: number`
  - mutable fields subset.
- Output:
  - `user: object`

### `users_access.user_active_set.v1`
- Owner: `users-access`
- Input:
  - `id: number`
  - `isActive: boolean`
- Output:
  - `user: object`

## API Adapter Mapping (Current)
- `/api/bootstrap.php`:
  - `kernel.auth_context.v1`
  - `master_data.catalog_get.v1`
  - sales read model (existing order shape)
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

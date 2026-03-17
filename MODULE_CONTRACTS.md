# Sitra ERP Module Contracts

## Purpose
- Defines stable contracts between modules in the modular monolith.
- Any boundary change must update this file in the same change.
- Machine-readable endpoint schemas are maintained under `contracts/schemas/*.json`.
- Generated frontend typedefs are maintained in `src/types/api-contracts.generated.js`.

## Global Rules
- No direct cross-module table access.
- Cross-module calls must use public contracts/services.
- Breaking changes require version bumps.

## Kernel Contracts

### `kernel.auth_context.v1`
- Owner: `kernel`
- Output:
  - `user: { id, username, fullName, jobTitle, role } | null`
  - `authenticated: boolean`

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
  - actor/action/entity/payload metadata
- Output:
  - `auditId: string`

### `kernel.module_registry.v1`
- Owner: `kernel`
- Input (`PATCH`):
  - `moduleId: string`
  - `enabled: boolean`
- Output:
  - `module: { id, label, enabled, phase, isProtected, dependsOn, sortOrder, updatedAt, updatedByUserId }`

## Master Data Contracts

### `master_data.catalog_get.v1`
- Owner: `master-data`
- Output:
  - `catalog: object | null`

### `master_data.catalog_save.v1`
- Owner: `master-data`
- Input:
  - `catalog: object`
- Output:
  - `catalog: object`

### `master_data.profile_get.v1`
- Owner: `master-data`
- Output:
  - `profile: object`

### `master_data.profile_save.v1`
- Owner: `master-data`
- Input:
  - `profile: object`
- Output:
  - `profile: object`

## Sales Contracts

### `sales.order_create.v1`
- Owner: `sales`
- Input:
  - payload compatible with `/api/orders.php` POST
  - `clientRequestId?: string`
- Output:
  - `order: object`

### `sales.order_update.v1`
- Owner: `sales`
- Input:
  - payload compatible with `/api/orders.php` PUT
  - `clientRequestId?: string`
  - `expectedUpdatedAt?: string`
- Output:
  - `order: object`

### `sales.order_status_set.v1`
- Owner: `sales`
- Input:
  - `id: number`
  - `status: 'pending' | 'processing' | 'delivered' | 'archived'`
  - `clientRequestId?: string`
  - `expectedUpdatedAt?: string`
- Output:
  - `order: object`

## Customers Contracts

### `customers.customer_list.v1`
- Owner: `customers`
- Output:
  - `customers: array`

### `customers.customer_create.v1`
- Owner: `customers`
- Input:
  - `fullName: string`
  - `defaultPhone?: string`
  - `address?: string`
  - `notes?: string`
- Output:
  - `customer: object`

### `customers.customer_update.v1`
- Owner: `customers`
- Input:
  - `id: number`
  - mutable fields subset (`fullName`, `defaultPhone`, `address`, `notes`)
  - `applyToOrderHistory?: boolean`
- Output:
  - `customer: object`

### `customers.project_list.v1`
- Owner: `customers`
- Input:
  - `customerId?: number`
- Output:
  - `projects: array`

### `customers.project_create_update.v1`
- Owner: `customers`
- Input:
  - `customerId: number`
  - `name: string`
  - `targetCustomerId?: number` (project transfer)
- Output:
  - `project: object`

### `customers.project_contact_list_write.v1`
- Owner: `customers`
- Input:
  - `projectId: number`
- Output:
  - `contacts: array`

## Inventory Contracts

### `inventory.item_list_write.v1`
- Owner: `inventory`
- Input:
  - list filters for item queries
  - item payload for create/update (`title`, `category`, `baseUnit`, optional glass attributes and secondary unit ratio)
- Output:
  - `items: array`
  - `item: object`

### `inventory.document_create_post.v1`
- Owner: `inventory`
- Input:
  - document payload (`docType`, `sourceWarehouseId?`, `targetWarehouseId?`, `lines[]`, optional reference fields)
  - `action: 'post' | 'cancel'` for `PATCH`
- Output:
  - `document: object`

### `inventory.request_flow.v1`
- Owner: `inventory`
- Input:
  - request payload (`warehouseId`, `itemId`, `quantityBase`, `quantitySecondary`, `requestNotes?`)
  - `action: 'approve' | 'reject' | 'cancel'` for `PATCH`
- Output:
  - `request: object`
  - `document?: object` (auto-generated issue document on approve)

### `inventory.count_session.v1`
- Owner: `inventory`
- Input:
  - `action: 'start_session' | 'upsert_line' | 'close_session'`
  - session payload (`warehouseId`, `countType`, notes)
  - line payload (`sessionId`, `itemId`, counted quantities)
- Output:
  - `session: object`
  - `lines?: array`
  - `adjustmentDocumentId?: string | null`

### `inventory.report_query.v1`
- Owner: `inventory`
- Input:
  - `report: 'stock' | 'ledger' | 'documents' | 'count_variance' | 'requests'`
  - optional filters (`warehouseId`, `itemId`, `status`, `from`, `to`)
- Output:
  - `report: string`
  - `rows: array`

### `inventory.v2_products_master.v1`
- Owner: `inventory`
- Input:
  - list filters (`q`, `includeInactive`)
  - write payload (`productCode?`, `name`, `productType`, `uom`, `notes?`, `isActive?`)
- Output:
  - `products: array`
  - `product: object`

### `inventory.v2_warehouses_master.v1`
- Owner: `inventory`
- Input:
  - list filters (`q`, `includeInactive`)
  - write payload (`warehouseKey`, `name`, `notes?`, `isActive?`)
- Output:
  - `warehouses: array`
  - `warehouse: object`

### `inventory.v2_locations_master.v1`
- Owner: `inventory`
- Input:
  - list filters (`warehouseId?`, `includeInactive`)
  - write payload (`warehouseId`, `parentLocationId?`, `locationKey`, `name`, `usageType`, `notes?`, `isActive?`)
- Output:
  - `locations: array`
  - `location: object`

### `inventory.v2_lots_master.v1`
- Owner: `inventory`
- Input:
  - list filters (`productId?`, `includeInactive`)
  - write payload (`lotCode`, `productId`, `variantId?`, `expiryDate?`, `notes?`, `isActive?`)
- Output:
  - `lots: array`
  - `lot: object`

### `inventory.v2_operations.v1`
- Owner: `inventory`
- Endpoint: `/api/inventory_v2_operations.php`
- GET filters: `type`, `status`, `q`, `page`, `pageSize`, `sortBy`, `sortDir`
- POST input (create draft):
  - `operationType: 'receipt'|'delivery'|'transfer'|'production_move'|'adjustment'|'count'`
  - `sourceWarehouseId?: string|null` (required for delivery/transfer)
  - `targetWarehouseId?: string|null` (required for receipt/transfer/adjustment)
  - `referenceType?`, `referenceId?`, `referenceCode?`, `notes?`
  - `lines: array` — each item: `productId`, `quantityRequested`, `quantityDone?`, `uom?`, `sourceLocationId?`, `targetLocationId?`, `lotId?`, `variantId?`, `notes?`
- PUT input (update draft): `id`, plus same optional fields as POST plus `lines?`
- PATCH input (action): `id`, `action: 'submit'|'approve'|'post'|'cancel'`
- Output:
  - GET: `{ operations: array, total, page, pageSize }`
  - POST/PUT/PATCH: `{ operation: object }`
- Lifecycle: `draft` → `submitted` → `approved` → `posted` | `cancelled`
- Stock rule: posting delivery/transfer/negative-adjustment validates no-negative available quantity
- Ledger: posting writes immutable entries to `inventory_v2_stock_ledger`
- Schemas: `inventory.v2.operations.create.request.schema.json`, `inventory.v2.operations.action.request.schema.json`

## Users & Access Contracts

### `users_access.user_list.v1`
- Owner: `users-access`
- Output:
  - `users: array`

### `users_access.user_create.v1`
- Owner: `users-access`
- Input:
  - `username: string`
  - `fullName: string`
  - `jobTitle?: string | null`
  - `password: string`
  - `role: 'admin' | 'manager' | 'sales'`
- Output:
  - `user: object`

### `users_access.user_update.v1`
- Owner: `users-access`
- Input:
  - `id: number`
  - mutable fields subset (`username`, `fullName`, `jobTitle`, `role`, `password`)
- Output:
  - `user: object`

### `users_access.user_active_set.v1`
- Owner: `users-access`
- Input:
  - `id: number`
  - `isActive: boolean`
- Output:
  - `user: object`

### `users_access.role_permissions_get.v1`
- Owner: `users-access`
- Output:
  - `roles: string[]`
  - `permissionDefinitions: array`
  - `rolePermissions: object`

### `users_access.role_permissions_save.v1`
- Owner: `users-access`
- Input:
  - `rolePermissions: object`
- Output:
  - normalized permission matrix

## API Adapter Mapping
- `/api/bootstrap.php` -> kernel + read models
- `/api/orders.php` -> sales contracts
- `/api/customers.php` -> customers contracts
- `/api/customer_projects.php` -> customers contracts
- `/api/customer_project_contacts.php` -> customers contracts
- `/api/inventory_warehouses.php` -> inventory contracts
- `/api/inventory_items.php` -> inventory contracts
- `/api/inventory_documents.php` -> inventory contracts
- `/api/inventory_requests.php` -> inventory contracts
- `/api/inventory_counts.php` -> inventory contracts
- `/api/inventory_reports.php` -> inventory contracts
- `/api/inventory_v2_products.php` -> inventory v2 contracts
- `/api/inventory_v2_warehouses.php` -> inventory v2 contracts
- `/api/inventory_v2_locations.php` -> inventory v2 contracts
- `/api/inventory_v2_lots.php` -> inventory v2 contracts
- `/api/catalog.php` -> master-data catalog
- `/api/profile.php` -> master-data profile
- `/api/users.php` -> users-access user contracts
- `/api/role_permissions.php` -> users-access permission matrix
- `/api/module_registry.php` -> kernel module registry
- `/api/audit_logs.php` -> kernel audit read model

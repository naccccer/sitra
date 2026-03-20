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
- Compatibility read model for existing consumers.
- Output:
  - `customers: array`

### `customers.customer_directory.v1`
- Owner: `customers`
- Input:
  - `q?: string`
  - `isActive?: boolean`
  - `customerType?: 'individual' | 'company'`
  - `hasDue?: boolean`
  - `page?: number`
  - `pageSize?: number`
- Output:
  - `customers: array`
  - `pagination: { page, pageSize, total }`
- Directory rows include:
  - customer identity fields (`id`, `customerCode`, `fullName`, `customerType`)
  - CRM profile fields (`companyName`, `nationalId`, `economicCode`, `email`, `province`, `city`, `creditLimit`, `paymentTermDays`)
  - operational summary (`defaultPhone`, `isActive`, `activeProjectsCount`, `activeContactsCount`, `activeOrdersCount`, `totalAmount`, `paidAmount`, `dueAmount`, `createdAt`, `updatedAt`)

### `customers.customer_create.v1`
- Owner: `customers`
- Input:
  - `fullName: string`
  - `defaultPhone?: string`
  - `address?: string`
  - `notes?: string`
  - CRM fields (`customerCode?`, `customerType?`, `companyName?`, `nationalId?`, `economicCode?`, `email?`, `province?`, `city?`, `creditLimit?`, `paymentTermDays?`)
- Output:
  - `customer: object`

### `customers.customer_update.v1`
- Owner: `customers`
- Input:
  - `id: number`
  - mutable fields subset (`fullName`, `defaultPhone`, `address`, `notes`)
  - CRM fields (`customerCode?`, `customerType?`, `companyName?`, `nationalId?`, `economicCode?`, `email?`, `province?`, `city?`, `creditLimit?`, `paymentTermDays?`)
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
  - `operationType: 'receipt'|'delivery'|'transfer'|'production_move'|'production_consume'|'production_output'|'adjustment'|'count'`
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
- Phase 3: `production_consume` deducts from source warehouse; `production_output` adds to target warehouse
- Phase 3: delivery posting fulfills matching active reservations automatically

### `inventory.v2_reservations.v1`
- Owner: `inventory`
- Endpoint: `/api/inventory_v2_reservations.php`
- GET filters: `status`, `referenceType`, `referenceId`, `productId`, `page`, `pageSize`
- POST input (create reservation):
  - `productId: string|number`
  - `warehouseId: string|number`
  - `locationId: string|number`
  - `quantityReserved: number` (> 0)
  - `variantId?`, `lotId?`, `referenceType?`, `referenceId?`, `referenceCode?`, `notes?`
- PATCH input (action): `id`, `action: 'release'`
- Output:
  - GET: `{ reservations: array, total, page, pageSize }`
  - POST/PATCH: `{ reservation: object }`
- Stock rule: creation checks available quantity; increments `quantity_reserved` in quants
- Lifecycle: `active` → `fulfilled` (auto on delivery post) | `released` (manual)
- Ledger: `reserve` entry on creation; `release` entry on release or fulfillment
- Schema: `inventory.v2.reservations.create.request.schema.json`

### `inventory.v2_replenishment.v1`
- Owner: `inventory`
- Endpoint: `/api/inventory_v2_replenishment.php`
- GET (list rules): returns `{ rules: array }` — active min/max rules
- GET (suggestions): `?action=suggest` — returns `{ suggestions: array }` filtered to products below min_qty
- POST input (create rule): `productId, warehouseId, minQty, maxQty, notes?`
- PUT input (update rule): `id, minQty?, maxQty?, notes?`
- PATCH input (soft-delete): `{ id }` — deactivates the rule
- Auth: GET requires `inventory.v2_reports.read`; POST/PUT/PATCH require `inventory.v2_settings.write` + CSRF
- Schema: `inventory.v2.replenishment.rules.upsert.request.schema.json`

### `inventory.v2_reports.v1`
- Owner: `inventory`
- Endpoint: `/api/inventory_v2_reports.php`
- Method: GET only
- Query params: `report` (required: `on_hand|cardex|operations`), optional `productId`, `warehouseId`, `dateFrom`, `dateTo`
- `on_hand`: joins quants + products + warehouses + locations; returns per-location stock summary
- `cardex`: queries stock_ledger with optional product/warehouse/date filters; limit 300 rows
- `operations`: aggregates operation_headers by type+status with count and date range
- Auth: requires `inventory.v2_reports.read`
- Schema: `inventory.v2.reports.query.request.schema.json`

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

## Accounting Payroll Contracts

### `accounting.payroll.v1`
- Owner: `accounting`
- Endpoint: `/api/acc_payroll.php`
- Entities: `period`, `employee`, `payslip`
- Permission gates:
  - `accounting.payroll.read` for list/detail reads
  - `accounting.payroll.write` for period, employee, and payslip create/update plus payslip cancel
  - `accounting.payroll.approve` for approving draft payslips
  - `accounting.payroll.issue` for issuing approved payslips
  - `accounting.payroll.payments` or `accounting.payroll.record_payment` for recording payments
- Input (`GET`):
  - `entity?: 'period' | 'employee'`
  - `id?: string | number`
  - `status?`, `q?`, `page?`, `pageSize?`, `employeeId?`, `periodId?`, `periodKey?`, `isActive?`
- Input (`POST` / `PUT`):
  - `entity?: 'period' | 'employee' | 'payslip'`
  - period:
    - `periodId?: string | number`
    - `periodKey?: string`
    - `year?: number`
    - `month?: number`
    - `title?: string`
    - `startDate?: string`
    - `endDate?: string`
    - `payDate?: string`
    - `status?: 'open' | 'issued' | 'closed'`
  - employee:
    - `id?: string | number` on `PUT`
    - `employeeCode: string`
    - `firstName: string`
    - `lastName: string`
    - `personnelNo?: string`
    - `nationalId?: string`
    - `mobile?: string`
    - `bankName?: string`
    - `bankAccountNo?: string`
    - `bankSheba?: string`
    - `baseSalary?: number`
    - `defaultInputs?: array | object`
    - `notes?: string`
    - `isActive?: boolean`
  - payslip:
    - `id?: string | number` on `PUT`
    - `employeeId: string | number`
    - `periodId?: string | number`
    - `periodKey?: string`
    - `year?: number`
    - `month?: number`
    - `inputs?: array | object`
    - `notes?: string`
- Input (`PATCH` action):
  - `id: string | number`
  - `action: 'approve' | 'issue' | 'record_payment' | 'cancel'`
  - `amount?: number`
  - `paymentMethod?: string`
  - `paymentDate?: string`
  - `accountId?: string | number`
  - `referenceNo?: string`
  - `notes?: string`
- Output:
  - GET period: `{ period }` or `{ periods }`
  - GET employee: `{ employee }` or `{ employees }`
  - GET payslip detail: `{ payslip }`
  - GET payslip list: `{ payslips, total, page, pageSize, totalPages }`
  - POST/PUT: `{ period }`, `{ employee }`, or `{ payslip }`
  - PATCH: `{ payslip }`
- Response roots commonly: `period`, `employee`, `payslip`, `periods`, `employees`, `payslips`
- Workflow: `draft` -> `approved` -> `issued` -> `cancelled`
- Settings: `GET|POST /api/acc_settings.php?key=accounting.payroll.settings`
- Schemas: `accounting.payroll.create.request.schema.json`, `accounting.payroll.update.request.schema.json`, `accounting.payroll.action.request.schema.json`, `accounting.payroll.import.request.schema.json`

### `accounting.payroll.import.v1`
- Owner: `accounting`
- Endpoint: `/api/acc_payroll_import.php`
- Permission gates:
  - `accounting.payroll.write` or `accounting.payroll.import` for batch imports
- Input (`POST`):
  - `periodId?: string | number`
  - `periodKey?: string`
  - `year?: number`
  - `month?: number`
  - `title?: string`
  - `startDate?: string`
  - `endDate?: string`
  - `payDate?: string`
  - `rows: array`
- `rows` entry:
  - `employeeId: string | number`
  - `employeeCode?: string`
  - `inputs?: array | object`
  - `notes?: string`
- Output:
  - `{ success, period, created, updated, results, warnings, errors }`
- Import workflow: resolves the payroll period first, then matches each row by employee id or employee code, creates or updates draft payslips, and records row-level warnings/errors
- Schema: `accounting.payroll.import.request.schema.json`

## API Adapter Mapping
- `/api/bootstrap.php` -> kernel + read models
- `/api/orders.php` -> sales contracts
- `/api/customers.php` -> customers contracts
- `/api/customer_projects.php` -> customers contracts
- `/api/customer_project_contacts.php` -> customers contracts
- `/api/inventory_v2_products.php` -> inventory v2 contracts
- `/api/inventory_v2_warehouses.php` -> inventory v2 contracts
- `/api/inventory_v2_locations.php` -> inventory v2 contracts
- `/api/inventory_v2_lots.php` -> inventory v2 contracts
- `/api/inventory_v2_operations.php` -> inventory v2 contracts
- `/api/inventory_v2_reservations.php` -> inventory v2 contracts
- `/api/inventory_v2_replenishment.php` -> inventory v2 replenishment contracts
- `/api/inventory_v2_reports.php` -> inventory v2 reports contracts
- `/api/acc_payroll.php` -> accounting payroll contracts
- `/api/acc_payroll_import.php` -> accounting payroll import contracts
- `/api/catalog.php` -> master-data catalog
- `/api/profile.php` -> master-data profile
- `/api/users.php` -> users-access user contracts
- `/api/role_permissions.php` -> users-access permission matrix
- `/api/module_registry.php` -> kernel module registry
- `/api/audit_logs.php` -> kernel audit read model

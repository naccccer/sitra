# Sitra ERP Module Contracts

## Purpose
- Defines stable contracts between modules in the modular monolith.
- Any boundary change must update this file in the same change.

## Global Rules
- No direct cross-module table access.
- Cross-module calls must use public contracts/services.
- Breaking changes require version bumps.

## Kernel Contracts

### `kernel.auth_context.v1`
- Owner: `kernel`
- Output:
  - `user: { id, username, role } | null`
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

## Users & Access Contracts

### `users_access.user_list.v1`
- Owner: `users-access`
- Output:
  - `users: array`

### `users_access.user_create.v1`
- Owner: `users-access`
- Input:
  - `username: string`
  - `password: string`
  - `role: 'admin' | 'manager' | 'sales'`
- Output:
  - `user: object`

### `users_access.user_update.v1`
- Owner: `users-access`
- Input:
  - `id: number`
  - mutable fields subset
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
- `/api/catalog.php` -> master-data catalog
- `/api/profile.php` -> master-data profile
- `/api/users.php` -> users-access user contracts
- `/api/role_permissions.php` -> users-access permission matrix
- `/api/module_registry.php` -> kernel module registry
- `/api/audit_logs.php` -> kernel audit read model

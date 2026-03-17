<?php
declare(strict_types=1);

/**
 * Unit tests for api/common/permissions.php
 *
 * Tests pure functions only â€” no database required.
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../../api/common/module_registry.php';
require_once __DIR__ . '/../../api/common/permissions.php';

// ------------------------------------------------------------------
// app_permission_definitions
// ------------------------------------------------------------------

test_suite('app_permission_definitions');

$defs = app_permission_definitions();
test_assert(is_array($defs), 'returns an array');
test_assert(count($defs) > 0, 'returns at least one permission');

$keys = array_column($defs, 'key');
test_assert_contains('sales.orders.read', $keys, 'contains sales.orders.read');
test_assert_contains('customers.read', $keys, 'contains customers.read');
test_assert_contains('customers.write', $keys, 'contains customers.write');
test_assert_contains('inventory.v2_products.read', $keys, 'contains inventory.v2_products.read');
test_assert_contains('inventory.v2_operations.write', $keys, 'contains inventory.v2_operations.write');
test_assert_contains('inventory.v2_reports.read', $keys, 'contains inventory.v2_reports.read');
test_assert_contains('master_data.catalog.write', $keys, 'contains master_data.catalog.write');
test_assert_contains('users_access.users.write', $keys, 'contains users_access.users.write');
test_assert_contains('kernel.audit.read', $keys, 'contains kernel.audit.read');
test_assert_contains('profile.read', $keys, 'contains profile.read');
test_assert_contains('profile.write', $keys, 'contains profile.write');

foreach ($defs as $def) {
    test_assert(
        isset($def['key'], $def['module'], $def['label']) && $def['key'] !== '',
        "definition for '{$def['key']}' has key, module, label"
    );
}

// ------------------------------------------------------------------
// app_permission_catalog
// ------------------------------------------------------------------

test_suite('app_permission_catalog');

$catalog = app_permission_catalog();
test_assert(is_array($catalog), 'returns array');
test_assert(count($catalog) === count(array_unique($catalog)), 'no duplicate keys');
test_assert_contains('sales.orders.read', $catalog, 'includes sales.orders.read');

// ------------------------------------------------------------------
// app_default_role_permissions_matrix
// ------------------------------------------------------------------

test_suite('app_default_role_permissions_matrix');

$matrix = app_default_role_permissions_matrix();
test_assert(isset($matrix['admin'], $matrix['manager'], $matrix['sales']), 'has admin, manager, sales');
test_assert(is_array($matrix['admin']), 'admin permissions is array');
test_assert(is_array($matrix['sales']), 'sales permissions is array');

// Admin should have all permissions
$allPerms = app_permission_catalog();
foreach ($allPerms as $perm) {
    test_assert_contains($perm, $matrix['admin'], "admin has {$perm}");
}

// Sales should not have catalog write
test_assert(
    !in_array('master_data.catalog.write', $matrix['sales'], true),
    'sales role does not have master_data.catalog.write'
);

// Sales should have orders.read
test_assert_contains('sales.orders.read', $matrix['sales'], 'sales has sales.orders.read');

// Manager should have users_access.users.write
test_assert_contains('users_access.users.write', $matrix['manager'], 'manager has users_access.users.write');
test_assert_contains('customers.write', $matrix['manager'], 'manager has customers.write');
test_assert_contains('customers.read', $matrix['sales'], 'sales has customers.read');
test_assert_contains('inventory.v2_operations.read', $matrix['sales'], 'sales has inventory.v2_operations.read');

// ------------------------------------------------------------------
// app_normalize_role_permissions_matrix
// ------------------------------------------------------------------

test_suite('app_normalize_role_permissions_matrix');

// Non-array input â†’ defaults
$normalized = app_normalize_role_permissions_matrix(null);
test_assert(isset($normalized['admin'], $normalized['manager'], $normalized['sales']), 'non-array falls back to defaults');

// Valid input: custom matrix with only known permissions
$customInput = [
    'admin' => ['sales.orders.read'],
    'manager' => ['sales.orders.read', 'master_data.catalog.read'],
    'sales' => ['sales.orders.read'],
];
$result = app_normalize_role_permissions_matrix($customInput);
test_assert_count(1, $result['admin'], 'custom admin has 1 permission');
test_assert_count(2, $result['manager'], 'custom manager has 2 permissions');

// Unknown permission is stripped
$withUnknown = [
    'admin' => ['sales.orders.read', 'nonexistent.permission'],
    'manager' => [],
    'sales' => [],
];
$stripped = app_normalize_role_permissions_matrix($withUnknown);
test_assert_count(1, $stripped['admin'], 'unknown permission is stripped from matrix');

// Duplicates are deduplicated
$withDupes = [
    'admin' => ['sales.orders.read', 'sales.orders.read', 'sales.orders.create'],
    'manager' => [],
    'sales' => [],
];
$deduped = app_normalize_role_permissions_matrix($withDupes);
test_assert_count(2, $deduped['admin'], 'duplicate permissions are deduplicated');

// ------------------------------------------------------------------
// app_role_permissions (without DB â€” uses defaults)
// ------------------------------------------------------------------

test_suite('app_role_permissions');

$adminPerms = app_role_permissions('admin');
test_assert(is_array($adminPerms), 'admin permissions is array');
test_assert(count($adminPerms) > 0, 'admin has permissions');

$salesPerms = app_role_permissions('sales');
test_assert_contains('sales.orders.read', $salesPerms, 'sales has sales.orders.read');

$invalidPerms = app_role_permissions('nonexistent-role');
test_assert_equals([], $invalidPerms, 'invalid role returns empty array');

$emptyPerms = app_role_permissions('');
test_assert_equals([], $emptyPerms, 'empty role returns empty array');

// ------------------------------------------------------------------
// app_user_has_permission
// ------------------------------------------------------------------

test_suite('app_user_has_permission');

$adminUser = ['id' => '1', 'role' => 'admin', 'username' => 'admin'];
$salesUser = ['id' => '2', 'role' => 'sales', 'username' => 'alice'];

test_assert_true(
    app_user_has_permission($adminUser, 'sales.orders.read'),
    'admin has sales.orders.read'
);
test_assert_true(
    app_user_has_permission($adminUser, 'master_data.catalog.write'),
    'admin has master_data.catalog.write'
);
test_assert_true(
    app_user_has_permission($salesUser, 'sales.orders.read'),
    'sales user has sales.orders.read'
);
test_assert_true(
    app_user_has_permission($salesUser, 'customers.read'),
    'sales user has customers.read'
);
test_assert_false(
    app_user_has_permission($salesUser, 'master_data.catalog.write'),
    'sales user does not have master_data.catalog.write'
);
test_assert_false(
    app_user_has_permission(null, 'sales.orders.read'),
    'null user has no permissions'
);
test_assert_false(
    app_user_has_permission($adminUser, ''),
    'empty permission key returns false'
);

// ------------------------------------------------------------------
// app_permissions_without_kernel_control
// ------------------------------------------------------------------

test_suite('app_permissions_without_kernel_control');

$withKernel = ['sales.orders.read', 'kernel.module_registry.write', 'profile.read'];
$filtered = app_permissions_without_kernel_control($withKernel);
test_assert(!in_array('kernel.module_registry.write', $filtered, true), 'strips kernel.module_registry.write');
test_assert_contains('sales.orders.read', $filtered, 'keeps sales.orders.read');
test_assert_contains('profile.read', $filtered, 'keeps profile.read');

// ------------------------------------------------------------------
// app_module_capabilities
// ------------------------------------------------------------------

test_suite('app_module_capabilities');

$caps = app_module_capabilities('admin');
test_assert(isset(
    $caps['canAccessDashboard'],
    $caps['canManageOrders'],
    $caps['canManageCustomers'],
    $caps['canManageCatalog'],
    $caps['canManageUsers'],
    $caps['canViewAuditLogs'],
    $caps['canManageProfile'],
    $caps['canAccessInventory'],
    $caps['canManageInventory'],
), 'capabilities object has all expected keys');
test_assert_true($caps['canAccessDashboard'], 'admin canAccessDashboard');
test_assert_true($caps['canManageCatalog'], 'admin canManageCatalog');
test_assert_true($caps['canManageUsers'], 'admin canManageUsers');
test_assert_true($caps['canManageCustomers'], 'admin canManageCustomers');
test_assert_true($caps['canAccessInventory'], 'admin canAccessInventory');
test_assert_true($caps['canManageInventory'], 'admin canManageInventory');
test_assert_false($caps['canManageSystemSettings'], 'canManageSystemSettings always false');

$salesCaps = app_module_capabilities('sales');
test_assert_true($salesCaps['canManageOrders'], 'sales canManageOrders');
test_assert_true($salesCaps['canManageCustomers'], 'sales canManageCustomers');
test_assert_true($salesCaps['canAccessInventory'], 'sales canAccessInventory');
test_assert_false($salesCaps['canManageCatalog'], 'sales cannot manage catalog (no write)');
test_assert_false($salesCaps['canManageUsers'], 'sales cannot manage users');
test_assert_false($salesCaps['canManageInventory'], 'sales cannot manage inventory');

$unknownCaps = app_module_capabilities('nonexistent');
test_assert_false($unknownCaps['canAccessDashboard'], 'unknown role has no capabilities');

$salesDisabledModules = [
    ['id' => 'auth', 'enabled' => true],
    ['id' => 'users-access', 'enabled' => true],
    ['id' => 'sales', 'enabled' => false],
    ['id' => 'inventory', 'enabled' => true],
    ['id' => 'master-data', 'enabled' => true],
];
$salesCapsWhenDisabled = app_module_capabilities('sales', $salesDisabledModules);
test_assert_false($salesCapsWhenDisabled['canManageOrders'], 'sales module disabled removes canManageOrders');
test_assert_false($salesCapsWhenDisabled['canAccessDashboard'], 'sales module disabled removes dashboard access');

$masterDataDisabledModules = [
    ['id' => 'auth', 'enabled' => true],
    ['id' => 'users-access', 'enabled' => true],
    ['id' => 'sales', 'enabled' => true],
    ['id' => 'customers', 'enabled' => false],
    ['id' => 'inventory', 'enabled' => false],
    ['id' => 'master-data', 'enabled' => false],
];
$adminCapsWhenMasterDataDisabled = app_module_capabilities('admin', $masterDataDisabledModules);
test_assert_false($adminCapsWhenMasterDataDisabled['canManageCatalog'], 'master-data disabled removes canManageCatalog');
test_assert_false($adminCapsWhenMasterDataDisabled['canManageProfile'], 'master-data disabled removes canManageProfile');
test_assert_false($adminCapsWhenMasterDataDisabled['canManageCustomers'], 'customers disabled removes canManageCustomers');
test_assert_false($adminCapsWhenMasterDataDisabled['canAccessInventory'], 'inventory disabled removes canAccessInventory');

// Print machine-readable summary for the runner
$r = test_summary();
echo "RESULTS:passed={$r['passed']},failed={$r['failed']}\n";
exit($r['failed'] > 0 ? 1 : 0);

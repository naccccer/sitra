<?php
declare(strict_types=1);

/**
 * Unit tests for api/common/module_registry.php (pure functions only).
 *
 * No database required.
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../../api/common/module_registry.php';

// ------------------------------------------------------------------
// app_user_roles
// ------------------------------------------------------------------

test_suite('app_user_roles');

$roles = app_user_roles();
test_assert(is_array($roles), 'returns array');
test_assert_contains('admin', $roles, 'includes admin');
test_assert_contains('manager', $roles, 'includes manager');
test_assert_contains('sales', $roles, 'includes sales');

// ------------------------------------------------------------------
// app_is_valid_user_role
// ------------------------------------------------------------------

test_suite('app_is_valid_user_role');

test_assert_true(app_is_valid_user_role('admin'), 'admin is valid');
test_assert_true(app_is_valid_user_role('manager'), 'manager is valid');
test_assert_true(app_is_valid_user_role('sales'), 'sales is valid');
test_assert_false(app_is_valid_user_role('superadmin'), 'superadmin is not valid');
test_assert_false(app_is_valid_user_role(''), 'empty string is not valid');
test_assert_false(app_is_valid_user_role('Admin'), 'role check is case-sensitive');

// ------------------------------------------------------------------
// app_module_registry_seed_rows
// ------------------------------------------------------------------

test_suite('app_module_registry_seed_rows');

$seeds = app_module_registry_seed_rows();
test_assert(is_array($seeds), 'returns array');
test_assert(count($seeds) >= 5, 'has at least 5 seed modules');

$moduleKeys = array_column($seeds, 'module_key');
test_assert_contains('auth', $moduleKeys, 'includes auth module');
test_assert_contains('sales', $moduleKeys, 'includes sales module');
test_assert_contains('customers', $moduleKeys, 'includes customers module');
test_assert_contains('inventory', $moduleKeys, 'includes inventory module');
test_assert_contains('master-data', $moduleKeys, 'includes master-data module');
test_assert_contains('users-access', $moduleKeys, 'includes users-access module');

foreach ($seeds as $seed) {
    test_assert(
        isset($seed['module_key'], $seed['label'], $seed['phase'], $seed['is_enabled'], $seed['is_protected'], $seed['sort_order']),
        "seed row for '{$seed['module_key']}' has all required fields"
    );
}

// auth and users-access must be protected
$seedByKey = array_column($seeds, null, 'module_key');
test_assert($seedByKey['auth']['is_protected'] === 1, 'auth module is protected');
test_assert($seedByKey['users-access']['is_protected'] === 1, 'users-access module is protected');

// ------------------------------------------------------------------
// app_module_registry_seed_fallback
// ------------------------------------------------------------------

test_suite('app_module_registry_seed_fallback');

$fallback = app_module_registry_seed_fallback();
test_assert(is_array($fallback), 'returns array');

foreach ($fallback as $module) {
    test_assert(
        isset($module['id'], $module['label'], $module['enabled'], $module['phase'], $module['isProtected'], $module['dependsOn']),
        "fallback module '{$module['id']}' has all response keys"
    );
    test_assert(is_bool($module['enabled']), "module '{$module['id']}' enabled is bool");
    test_assert(is_bool($module['isProtected']), "module '{$module['id']}' isProtected is bool");
    test_assert(is_array($module['dependsOn']), "module '{$module['id']}' dependsOn is array");
}

// ------------------------------------------------------------------
// app_module_registry_enabled_map
// ------------------------------------------------------------------

test_suite('app_module_registry_enabled_map');

$modules = [
    ['id' => 'sales', 'enabled' => true],
    ['id' => 'master-data', 'enabled' => false],
    ['id' => 'auth', 'enabled' => true],
];
$map = app_module_registry_enabled_map($modules);
test_assert_true($map['sales'], 'sales is enabled');
test_assert_false($map['master-data'], 'master-data is disabled');
test_assert_true($map['auth'], 'auth is enabled');

// Non-array entries are skipped
$withGarbage = [
    ['id' => 'sales', 'enabled' => true],
    'not-an-array',
    ['id' => '', 'enabled' => true],  // empty id
];
$cleanMap = app_module_registry_enabled_map($withGarbage);
test_assert(isset($cleanMap['sales']), 'valid entry included');
test_assert(!isset($cleanMap['']), 'empty id not included');

// ------------------------------------------------------------------
// app_module_dependency_map
// ------------------------------------------------------------------

test_suite('app_module_dependency_map');

$deps = app_module_dependency_map();
test_assert(is_array($deps), 'returns array');
test_assert(isset($deps['sales']), 'sales dependency entry exists');
test_assert_contains('customers', $deps['sales'], 'sales depends on customers');

// ------------------------------------------------------------------
// app_module_registry (no DB â€” seed fallback)
// ------------------------------------------------------------------

test_suite('app_module_registry (no DB)');

$registry = app_module_registry(null);
test_assert(is_array($registry), 'returns array without DB');
test_assert(count($registry) >= 5, 'has at least 5 modules without DB');

$ids = array_column($registry, 'id');
test_assert_contains('auth', $ids, 'includes auth without DB');
test_assert_contains('sales', $ids, 'includes sales without DB');
test_assert_contains('customers', $ids, 'includes customers without DB');
test_assert_contains('inventory', $ids, 'includes inventory without DB');

// Print machine-readable summary for the runner
$r = test_summary();
echo "RESULTS:passed={$r['passed']},failed={$r['failed']}\n";
exit($r['failed'] > 0 ? 1 : 0);

<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/../../kernel/ModuleGuard.php';

app_handle_preflight(['GET', 'POST']);
$method = app_require_method(['GET', 'POST']);
app_require_module_enabled($pdo, 'users-access');

if ($method === 'GET') {
    $actor = app_require_permission('users_access.users.read', $pdo);
    $roles = app_user_roles();
    if (!app_kernel_is_owner($actor)) {
        $roles = array_values(array_filter($roles, static fn (string $role): bool => $role !== 'admin'));
    }
    app_json([
        'success' => true,
        'roles' => $roles,
        'permissionDefinitions' => app_permission_definitions(),
        'rolePermissions' => app_read_role_permissions_matrix($pdo),
    ]);
}

$actor = app_require_permission('users_access.users.write', $pdo);
app_require_csrf();

$payload = app_read_json_body();
if (!array_key_exists('rolePermissions', $payload) || !is_array($payload['rolePermissions'])) {
    app_json([
        'success' => false,
        'error' => 'rolePermissions object is required.',
    ], 400);
}

$hasKernelControlPermission = false;
$reservedPermissions = array_fill_keys(app_kernel_control_permissions(), true);
foreach ($payload['rolePermissions'] as $rolePermissions) {
    if (!is_array($rolePermissions)) {
        continue;
    }
    foreach ($rolePermissions as $permission) {
        $key = trim((string)$permission);
        if ($key !== '' && isset($reservedPermissions[$key])) {
            $hasKernelControlPermission = true;
            break 2;
        }
    }
}

if ($hasKernelControlPermission && !app_kernel_is_owner($actor)) {
    app_json([
        'success' => false,
        'error' => 'Access denied.',
        'code' => 'owner_required_for_kernel_control_permissions',
    ], 403);
}

$saved = app_save_role_permissions_matrix($pdo, $payload['rolePermissions']);
app_audit_log(
    $pdo,
    'users_access.role_permissions.updated',
    'system_settings',
    'role_permissions',
    [
        'rolePermissions' => $saved,
    ],
    $actor
);

app_json([
    'success' => true,
    'roles' => app_kernel_is_owner($actor)
        ? app_user_roles()
        : array_values(array_filter(app_user_roles(), static fn (string $role): bool => $role !== 'admin')),
    'permissionDefinitions' => app_permission_definitions(),
    'rolePermissions' => $saved,
]);

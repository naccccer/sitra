<?php
declare(strict_types=1);

function app_permission_definitions(): array
{
    return [
        ['key' => 'sales.orders.read', 'module' => 'sales', 'label' => 'مشاهده سفارش‌ها'],
        ['key' => 'sales.orders.create', 'module' => 'sales', 'label' => 'ایجاد سفارش'],
        ['key' => 'sales.orders.update', 'module' => 'sales', 'label' => 'ویرایش سفارش'],
        ['key' => 'sales.orders.status', 'module' => 'sales', 'label' => 'تغییر وضعیت سفارش'],
        ['key' => 'sales.orders.delete', 'module' => 'sales', 'label' => 'حذف سفارش بایگانی‌شده'],
        ['key' => 'master_data.catalog.read', 'module' => 'master-data', 'label' => 'مشاهده لیست قیمت'],
        ['key' => 'master_data.catalog.write', 'module' => 'master-data', 'label' => 'ویرایش لیست قیمت'],
        ['key' => 'users_access.users.read', 'module' => 'users-access', 'label' => 'مشاهده کاربران'],
        ['key' => 'users_access.users.write', 'module' => 'users-access', 'label' => 'مدیریت کاربران و جدول دسترسی'],
        ['key' => 'kernel.audit.read', 'module' => 'kernel', 'label' => 'مشاهده لاگ ممیزی'],
        ['key' => 'profile.read', 'module' => 'master-data', 'label' => 'مشاهده پروفایل کسب‌وکار'],
        ['key' => 'profile.write', 'module' => 'master-data', 'label' => 'ویرایش پروفایل کسب‌وکار'],
    ];
}

function app_kernel_control_permissions(): array
{
    return ['kernel.module_registry.write'];
}

function app_permissions_without_kernel_control(array $permissions): array
{
    $reserved = array_fill_keys(app_kernel_control_permissions(), true);
    $normalized = [];

    foreach ($permissions as $permission) {
        $key = trim((string)$permission);
        if ($key === '' || isset($reserved[$key])) {
            continue;
        }
        $normalized[$key] = true;
    }

    return array_values(array_keys($normalized));
}

function app_permission_catalog(): array
{
    $keys = [];
    foreach (app_permission_definitions() as $definition) {
        $key = trim((string)($definition['key'] ?? ''));
        if ($key === '') {
            continue;
        }
        $keys[$key] = true;
    }

    return array_values(array_keys($keys));
}

function app_default_role_permissions_matrix(): array
{
    $all = app_permission_catalog();

    return [
        'admin' => $all,
        'manager' => [
            'sales.orders.read',
            'sales.orders.create',
            'sales.orders.update',
            'sales.orders.status',
            'sales.orders.delete',
            'master_data.catalog.read',
            'master_data.catalog.write',
            'users_access.users.read',
            'users_access.users.write',
            'kernel.audit.read',
            'profile.read',
            'profile.write',
        ],
        'sales' => [
            'sales.orders.read',
            'sales.orders.create',
            'sales.orders.update',
            'sales.orders.status',
            'master_data.catalog.read',
            'profile.read',
        ],
    ];
}

function app_normalize_role_permissions_matrix($input): array
{
    $defaults = app_default_role_permissions_matrix();
    if (!is_array($input)) {
        return $defaults;
    }

    $knownPermissions = array_fill_keys(app_permission_catalog(), true);
    $normalized = [];
    foreach (app_user_roles() as $role) {
        $candidate = $input[$role] ?? $defaults[$role] ?? [];
        if (!is_array($candidate)) {
            $candidate = $defaults[$role] ?? [];
        }

        $rolePermissions = [];
        foreach ($candidate as $permission) {
            $key = trim((string)$permission);
            if ($key === '' || !isset($knownPermissions[$key])) {
                continue;
            }
            $rolePermissions[$key] = true;
        }

        $normalized[$role] = array_values(array_keys($rolePermissions));
    }

    return $normalized;
}

function app_read_role_permissions_matrix(PDO $pdo): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $defaults = app_default_role_permissions_matrix();
    try {
        app_ensure_system_settings_table($pdo);
        $stmt = $pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key = :k LIMIT 1');
        $stmt->execute(['k' => 'role_permissions']);
        $row = $stmt->fetch();
        if (!$row || !isset($row['setting_value'])) {
            $cache = $defaults;
            return $cache;
        }

        $decoded = json_decode((string)$row['setting_value'], true);
        $cache = app_normalize_role_permissions_matrix($decoded);
        return $cache;
    } catch (Throwable $e) {
        $cache = $defaults;
        return $cache;
    }
}

function app_save_role_permissions_matrix(PDO $pdo, $input): array
{
    $normalized = app_normalize_role_permissions_matrix($input);
    $encoded = json_encode($normalized, JSON_UNESCAPED_UNICODE);
    if ($encoded === false) {
        throw new RuntimeException('Unable to serialize role permissions matrix.');
    }

    app_ensure_system_settings_table($pdo);
    $stmt = $pdo->prepare(
        'INSERT INTO system_settings (setting_key, setting_value)
         VALUES (:key, :value)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP'
    );
    $stmt->execute([
        'key' => 'role_permissions',
        'value' => $encoded,
    ]);

    return $normalized;
}

function app_role_permissions(string $role, ?PDO $pdo = null): array
{
    $normalizedRole = trim($role);
    if (!app_is_valid_user_role($normalizedRole)) {
        return [];
    }

    $matrix = $pdo !== null ? app_read_role_permissions_matrix($pdo) : app_default_role_permissions_matrix();
    $permissions = $matrix[$normalizedRole] ?? [];
    if (!is_array($permissions)) {
        return [];
    }

    return array_values($permissions);
}

function app_user_permissions(?array $user, ?PDO $pdo = null): array
{
    if ($user === null) {
        return [];
    }

    return app_role_permissions((string)($user['role'] ?? ''), $pdo);
}

function app_user_has_permission(?array $user, string $permission, ?PDO $pdo = null): bool
{
    $permissionKey = trim($permission);
    if ($permissionKey === '') {
        return false;
    }

    return in_array($permissionKey, app_user_permissions($user, $pdo), true);
}

function app_require_permission(string $permission, ?PDO $pdo = null): array
{
    $user = app_require_auth();
    if (!app_user_has_permission($user, $permission, $pdo)) {
        app_json([
            'success' => false,
            'error' => 'Access denied.',
        ], 403);
    }

    return $user;
}

function app_require_any_permission(array $permissions, ?PDO $pdo = null): array
{
    $user = app_require_auth();
    foreach ($permissions as $permission) {
        if (!is_string($permission)) {
            continue;
        }
        if (app_user_has_permission($user, $permission, $pdo)) {
            return $user;
        }
    }

    app_json([
        'success' => false,
        'error' => 'Access denied.',
    ], 403);
}

function app_module_capabilities(?string $role, ?array $modules = null, ?PDO $pdo = null): array
{
    $permissions = app_permissions_without_kernel_control(app_role_permissions((string)$role, $pdo));
    $capabilities = [
        'canAccessDashboard' => in_array('sales.orders.read', $permissions, true),
        'canManageOrders' => in_array('sales.orders.read', $permissions, true),
        'canManageCatalog' => in_array('master_data.catalog.write', $permissions, true),
        'canManageUsers' => in_array('users_access.users.write', $permissions, true),
        'canViewAuditLogs' => in_array('kernel.audit.read', $permissions, true),
        'canManageProfile' => in_array('profile.write', $permissions, true),
        'canManageSystemSettings' => false,
    ];

    if (!is_array($modules)) {
        return $capabilities;
    }

    $enabledMap = app_module_registry_enabled_map($modules);
    $salesEnabled = $enabledMap['sales'] ?? true;
    $masterDataEnabled = $enabledMap['master-data'] ?? true;
    $usersAccessEnabled = $enabledMap['users-access'] ?? true;

    $capabilities['canAccessDashboard'] = $capabilities['canAccessDashboard'] && $salesEnabled;
    $capabilities['canManageOrders'] = $capabilities['canManageOrders'] && $salesEnabled;
    $capabilities['canManageCatalog'] = $capabilities['canManageCatalog'] && $masterDataEnabled;
    $capabilities['canManageProfile'] = $capabilities['canManageProfile'] && $masterDataEnabled;
    $capabilities['canManageUsers'] = $capabilities['canManageUsers'] && $usersAccessEnabled;

    return $capabilities;
}

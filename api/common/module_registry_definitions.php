<?php
declare(strict_types=1);

function app_user_roles(): array
{
    return ['admin', 'manager', 'sales'];
}

function app_is_valid_user_role(string $role): bool
{
    return in_array($role, app_user_roles(), true);
}

function app_module_registry_seed_rows(): array
{
    return [
        [
            'module_key' => 'auth',
            'label' => 'احراز هویت',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 1,
            'sort_order' => 10,
        ],
        [
            'module_key' => 'users-access',
            'label' => 'کاربران و دسترسی',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 1,
            'sort_order' => 20,
        ],
        [
            'module_key' => 'sales',
            'label' => 'فروش',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 0,
            'sort_order' => 30,
        ],
        [
            'module_key' => 'customers',
            'label' => 'مشتریان',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 0,
            'sort_order' => 35,
        ],
        [
            'module_key' => 'human-resources',
            'label' => 'منابع انسانی',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 0,
            'sort_order' => 45,
        ],
        [
            'module_key' => 'inventory',
            'label' => 'انبار',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 0,
            'sort_order' => 38,
        ],
        [
            'module_key' => 'master-data',
            'label' => 'داده‌های پایه',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 0,
            'sort_order' => 40,
        ],
        [
            'module_key' => 'accounting',
            'label' => 'حسابداری',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 0,
            'sort_order' => 50,
        ],
    ];
}

function app_module_dependency_map(): array
{
    return [
        'sales' => ['customers'],
    ];
}

function app_module_registry_row_to_response(array $row): array
{
    $moduleId = (string)($row['module_key'] ?? '');
    $dependencyMap = app_module_dependency_map();

    return [
        'id' => $moduleId,
        'label' => (string)($row['label'] ?? ''),
        'enabled' => ((int)($row['is_enabled'] ?? 0)) === 1,
        'phase' => (string)($row['phase'] ?? 'active'),
        'isProtected' => ((int)($row['is_protected'] ?? 0)) === 1,
        'dependsOn' => array_values($dependencyMap[$moduleId] ?? []),
        'sortOrder' => (int)($row['sort_order'] ?? 100),
        'updatedAt' => (string)($row['updated_at'] ?? ''),
        'updatedByUserId' => isset($row['updated_by_user_id']) ? (string)$row['updated_by_user_id'] : null,
    ];
}

function app_module_registry_seed_fallback(): array
{
    return array_map('app_module_registry_row_to_response', app_module_registry_seed_rows());
}

function app_module_registry_enabled_map(array $modules): array
{
    $map = [];
    foreach ($modules as $module) {
        if (!is_array($module)) {
            continue;
        }
        $id = trim((string)($module['id'] ?? ''));
        if ($id === '') {
            continue;
        }
        $map[$id] = (bool)($module['enabled'] ?? false);
    }
    return $map;
}

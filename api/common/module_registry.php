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
            'label' => 'Auth',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 1,
            'sort_order' => 10,
        ],
        [
            'module_key' => 'users-access',
            'label' => 'Users Access',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 1,
            'sort_order' => 20,
        ],
        [
            'module_key' => 'sales',
            'label' => 'Sales',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 0,
            'sort_order' => 30,
        ],
        [
            'module_key' => 'master-data',
            'label' => 'Master Data',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 0,
            'sort_order' => 40,
        ],
    ];
}

function app_module_dependency_map(): array
{
    return [];
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
        'updatedByUserId' => $row['updated_by_user_id'] !== null ? (string)$row['updated_by_user_id'] : null,
    ];
}

function app_module_registry_seed_fallback(): array
{
    return array_map('app_module_registry_row_to_response', app_module_registry_seed_rows());
}

function app_ensure_module_registry_table(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    app_ensure_users_table($pdo);

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS module_registry (
            module_key VARCHAR(64) NOT NULL,
            label VARCHAR(120) NOT NULL,
            phase VARCHAR(40) NOT NULL DEFAULT 'active',
            is_enabled TINYINT(1) NOT NULL DEFAULT 1,
            is_protected TINYINT(1) NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 100,
            updated_by_user_id INT UNSIGNED NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (module_key),
            KEY idx_module_registry_enabled (is_enabled),
            KEY idx_module_registry_sort (sort_order),
            CONSTRAINT fk_module_registry_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $seedStmt = $pdo->prepare(
        'INSERT INTO module_registry (module_key, label, phase, is_enabled, is_protected, sort_order)
         VALUES (:module_key, :label, :phase, :is_enabled, :is_protected, :sort_order)
         ON DUPLICATE KEY UPDATE
            label = VALUES(label),
            phase = VALUES(phase),
            is_protected = VALUES(is_protected),
            sort_order = VALUES(sort_order)'
    );

    foreach (app_module_registry_seed_rows() as $seed) {
        $seedStmt->execute($seed);
    }

    $pdo->exec(
        "DELETE FROM module_registry
         WHERE module_key NOT IN ('auth', 'users-access', 'sales', 'master-data')"
    );
}

function app_module_registry(?PDO $pdo = null): array
{
    if ($pdo === null) {
        return app_module_registry_seed_fallback();
    }

    try {
        app_ensure_module_registry_table($pdo);
        $stmt = $pdo->query(
            'SELECT module_key, label, phase, is_enabled, is_protected, sort_order, updated_at, updated_by_user_id
             FROM module_registry
             ORDER BY sort_order ASC, module_key ASC'
        );
        $rows = $stmt ? $stmt->fetchAll() : [];
        if (!is_array($rows) || $rows === []) {
            return app_module_registry_seed_fallback();
        }

        return array_map('app_module_registry_row_to_response', $rows);
    } catch (Throwable $e) {
        return app_module_registry_seed_fallback();
    }
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

function app_module_registry_find(PDO $pdo, string $moduleKey): ?array
{
    $moduleId = trim($moduleKey);
    if ($moduleId === '') {
        return null;
    }

    $modules = app_module_registry($pdo);
    foreach ($modules as $module) {
        if (!is_array($module)) {
            continue;
        }
        if ((string)($module['id'] ?? '') === $moduleId) {
            return $module;
        }
    }

    return null;
}

function app_is_module_enabled(PDO $pdo, string $moduleKey): bool
{
    $module = app_module_registry_find($pdo, $moduleKey);
    if ($module === null) {
        return true;
    }

    return (bool)($module['enabled'] ?? false);
}

function app_require_module_enabled(PDO $pdo, string $moduleKey): void
{
    if (app_is_module_enabled($pdo, $moduleKey)) {
        return;
    }

    app_json([
        'success' => false,
        'error' => 'Module is disabled.',
        'code' => 'module_disabled',
        'module' => $moduleKey,
    ], 403);
}

function app_module_registry_update_enabled(PDO $pdo, string $moduleKey, bool $enabled, ?array $actor = null): array
{
    app_ensure_module_registry_table($pdo);
    $moduleId = trim($moduleKey);
    if ($moduleId === '') {
        return [
            'success' => false,
            'status' => 400,
            'error' => 'moduleId is required.',
            'code' => 'module_id_required',
        ];
    }

    $modules = app_module_registry($pdo);
    $moduleById = [];
    foreach ($modules as $module) {
        if (!is_array($module)) {
            continue;
        }
        $id = (string)($module['id'] ?? '');
        if ($id === '') {
            continue;
        }
        $moduleById[$id] = $module;
    }

    $current = $moduleById[$moduleId] ?? null;
    if ($current === null) {
        return [
            'success' => false,
            'status' => 404,
            'error' => 'Module not found.',
            'code' => 'module_not_found',
        ];
    }

    if (!$enabled && (bool)($current['isProtected'] ?? false)) {
        return [
            'success' => false,
            'status' => 409,
            'error' => 'Protected modules cannot be disabled.',
            'code' => 'module_protected',
            'module' => $moduleId,
        ];
    }

    if (!$enabled) {
        foreach (app_module_dependency_map() as $dependentModule => $dependencies) {
            if (!in_array($moduleId, $dependencies, true)) {
                continue;
            }

            $dependentEnabled = (bool)($moduleById[$dependentModule]['enabled'] ?? false);
            if ($dependentEnabled) {
                return [
                    'success' => false,
                    'status' => 409,
                    'error' => 'Cannot disable module because an active dependent module requires it.',
                    'code' => 'module_dependency_blocked',
                    'module' => $moduleId,
                    'dependentModule' => $dependentModule,
                ];
            }
        }
    }

    $currentEnabled = (bool)($current['enabled'] ?? false);
    if ($currentEnabled !== $enabled) {
        $stmt = $pdo->prepare(
            'UPDATE module_registry
             SET is_enabled = :is_enabled,
                 updated_by_user_id = :updated_by_user_id,
                 updated_at = CURRENT_TIMESTAMP
             WHERE module_key = :module_key'
        );
        $stmt->execute([
            'is_enabled' => $enabled ? 1 : 0,
            'updated_by_user_id' => isset($actor['id']) && (string)$actor['id'] !== '' ? (int)$actor['id'] : null,
            'module_key' => $moduleId,
        ]);

        app_audit_log(
            $pdo,
            'kernel.module_registry.updated',
            'module_registry',
            $moduleId,
            [
                'moduleId' => $moduleId,
                'enabled' => $enabled,
            ],
            $actor
        );
    }

    $updated = app_module_registry_find($pdo, $moduleId);
    if ($updated === null) {
        $updated = array_merge($current, ['enabled' => $enabled]);
    }

    return [
        'success' => true,
        'module' => $updated,
    ];
}

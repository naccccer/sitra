<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/../../kernel/ModuleGuard.php';

app_handle_preflight(['GET', 'PATCH']);
$method = app_require_method(['GET', 'PATCH']);
$actor = app_kernel_require_owner();

if ($method === 'GET') {
    app_json([
        'success' => true,
        'modules' => app_module_registry($pdo),
        'dependencies' => app_module_dependency_map(),
    ]);
}

app_require_csrf();
$payload = app_read_json_body();
$moduleId = trim((string)($payload['moduleId'] ?? $payload['id'] ?? ''));
$enabledRaw = $payload['enabled'] ?? null;

if ($moduleId === '') {
    app_json([
        'success' => false,
        'error' => 'moduleId is required.',
        'code' => 'module_id_required',
    ], 400);
}

if (!is_bool($enabledRaw)) {
    app_json([
        'success' => false,
        'error' => 'enabled must be boolean.',
        'code' => 'enabled_boolean_required',
    ], 400);
}

$result = app_module_registry_update_enabled($pdo, $moduleId, $enabledRaw, $actor);
if (!($result['success'] ?? false)) {
    app_json([
        'success' => false,
        'error' => (string)($result['error'] ?? 'Module update failed.'),
        'code' => (string)($result['code'] ?? 'module_update_failed'),
        'module' => $moduleId,
        'dependentModule' => $result['dependentModule'] ?? null,
    ], (int)($result['status'] ?? 400));
}

app_json([
    'success' => true,
    'module' => $result['module'] ?? null,
    'modules' => app_module_registry($pdo),
    'dependencies' => app_module_dependency_map(),
]);

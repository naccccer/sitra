<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET', 'POST']);
$method = app_require_method(['GET', 'POST']);
app_require_module_enabled($pdo, 'master-data');

if ($method === 'GET') {
    app_json([
        'success' => true,
        'profile' => app_read_profile($pdo),
    ]);
}

$actor = app_require_permission('profile.write', $pdo);
app_require_csrf();
$payload = app_read_json_body();
$source = is_array($payload) ? $payload : [];

try {
    $saved = app_save_profile($pdo, $source);
} catch (Throwable $e) {
    app_json([
        'success' => false,
        'error' => 'Profile could not be saved.',
    ], 500);
}

app_audit_log(
    $pdo,
    'master_data.profile.updated',
    'system_settings',
    'profile',
    [
        'brandName' => (string)($saved['brandName'] ?? ''),
        'panelSubtitle' => (string)($saved['panelSubtitle'] ?? ''),
        'phone' => (string)($saved['phone'] ?? ''),
    ],
    $actor
);

app_json([
    'success' => true,
    'profile' => $saved,
]);

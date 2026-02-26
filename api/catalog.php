<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../config/db.php';

app_handle_preflight(['GET', 'POST']);
$method = app_require_method(['GET', 'POST']);

if ($method === 'GET') {
    $catalog = app_read_catalog($pdo);
    app_json([
        'success' => true,
        'catalog' => $catalog,
    ]);
}

app_require_auth(['admin', 'manager']);
app_require_csrf();
$catalog = app_read_json_body();
if (!is_array($catalog) || count($catalog) === 0) {
    app_json([
        'success' => false,
        'error' => 'Catalog payload is required.',
    ], 400);
}

$catalogJson = json_encode($catalog, JSON_UNESCAPED_UNICODE);
if ($catalogJson === false) {
    app_json([
        'success' => false,
        'error' => 'Catalog serialization failed.',
    ], 400);
}

app_ensure_system_settings_table($pdo);
$stmt = $pdo->prepare('INSERT INTO system_settings (setting_key, setting_value) VALUES (:key, :value) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP');
$stmt->execute([
    'key' => 'catalog',
    'value' => $catalogJson,
]);

app_json([
    'success' => true,
    'catalog' => $catalog,
]);

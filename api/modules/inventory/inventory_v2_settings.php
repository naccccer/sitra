<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET', 'POST']);
$method = app_require_method(['GET', 'POST']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_system_settings_table($pdo);

$actor = $method === 'GET'
    ? app_require_auth(['admin', 'manager', 'sales'])
    : app_require_auth(['admin', 'manager']);

$allowedKeys = ['uom_options'];
$payload = $method === 'POST' ? app_read_json_body() : [];
$key = app_inventory_v2_normalize_text($method === 'GET' ? ($_GET['key'] ?? '') : ($payload['key'] ?? ''));
if ($key === '' || !in_array($key, $allowedKeys, true)) {
    app_json(['success' => false, 'error' => 'Unknown inventory setting key.'], 400);
}

if ($method === 'GET') {
    app_inventory_v2_require_permission($actor, 'inventory.v2_settings.read', $pdo);

    $stmt = $pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key = :key LIMIT 1');
    $stmt->execute(['key' => 'inventory.v2.' . $key]);
    $row = $stmt->fetch();
    $decoded = null;
    if ($row && isset($row['setting_value'])) {
        $decoded = json_decode((string)$row['setting_value'], true);
    }
    app_json(['success' => true, 'key' => $key, 'value' => is_array($decoded) ? $decoded : []]);
}

app_inventory_v2_require_permission($actor, 'inventory.v2_settings.write', $pdo);
app_require_csrf();
$value = $payload['value'] ?? [];
if (!is_array($value)) {
    app_json(['success' => false, 'error' => 'Value must be an array.'], 400);
}

$normalized = [];
foreach ($value as $item) {
    $unit = app_inventory_v2_normalize_text((string)$item);
    if ($unit !== '' && !in_array($unit, $normalized, true)) {
        $normalized[] = $unit;
    }
}
if (count($normalized) === 0) {
    app_json(['success' => false, 'error' => 'At least one unit is required.'], 400);
}

$stmt = $pdo->prepare(
    'INSERT INTO system_settings (setting_key, setting_value)
     VALUES (:key, :value)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP'
);
$stmt->execute([
    'key' => 'inventory.v2.' . $key,
    'value' => json_encode($normalized, JSON_UNESCAPED_UNICODE),
]);

app_audit_log($pdo, 'inventory.vtwo_settings.updated', 'system_settings', 'inventory.v2.' . $key, [], $actor);
app_json(['success' => true, 'key' => $key, 'value' => $normalized]);

<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/accounting_helpers.php';

app_handle_preflight(['GET', 'POST']);
$method = app_require_method(['GET', 'POST']);
app_require_module_enabled($pdo, 'accounting');
app_ensure_accounting_schema($pdo);

$actor = app_require_auth(['admin', 'manager']);

function acc_settings_permission_for_key(string $key, string $method): string
{
    if (str_starts_with($key, 'accounting.payroll.')) {
        return 'accounting.payroll.settings';
    }
    return $method === 'GET' ? 'accounting.settings.read' : 'accounting.settings.write';
}

if ($method === 'GET') {
    $key = acc_normalize_text($_GET['key'] ?? '');
    if ($key === '') {
        app_json(['success' => false, 'error' => 'Missing key.'], 400);
    }
    if (!acc_is_allowed_setting_key($key)) {
        app_json(['success' => false, 'error' => 'Unknown accounting setting key.'], 400);
    }

    acc_require_permission($actor, acc_settings_permission_for_key($key, 'GET'), $pdo);

    try {
        $value = acc_read_setting_value($pdo, $key);
    } catch (Throwable $e) {
        app_json(['success' => false, 'error' => 'DB error.'], 500);
    }

    app_json(['success' => true, 'key' => $key, 'value' => $value]);
}

app_require_csrf();
$payload = app_read_json_body();
$key = acc_normalize_text($payload['key'] ?? '');
$value = isset($payload['value']) ? (string)$payload['value'] : '';

if ($key === '') {
    app_json(['success' => false, 'error' => 'Missing key.'], 400);
}
if (!acc_is_allowed_setting_key($key)) {
    app_json(['success' => false, 'error' => 'Unknown accounting setting key.'], 400);
}

acc_require_permission($actor, acc_settings_permission_for_key($key, 'POST'), $pdo);

try {
    app_ensure_system_settings_table($pdo);
    $stmt = $pdo->prepare(
        'INSERT INTO system_settings (setting_key, setting_value)
         VALUES (:key, :value)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP'
    );
    $stmt->execute(['key' => $key, 'value' => $value]);
} catch (Throwable $e) {
    app_json(['success' => false, 'error' => 'DB error.'], 500);
}

app_json(['success' => true, 'key' => $key]);

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

// ─── GET ──────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    acc_require_permission($actor, 'accounting.settings.read', $pdo);

    $key = acc_normalize_text($_GET['key'] ?? '');
    if ($key === '') {
        app_json(['success' => false, 'error' => 'Missing key.'], 400);
    }

    // Only allow accounting.* keys
    if (!str_starts_with($key, 'accounting.')) {
        app_json(['success' => false, 'error' => 'Invalid key.'], 400);
    }

    try {
        $stmt = $pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key = :k LIMIT 1');
        $stmt->execute(['k' => $key]);
        $row = $stmt->fetch();
    } catch (Throwable $e) {
        app_json(['success' => false, 'error' => 'DB error.'], 500);
    }

    app_json(['success' => true, 'key' => $key, 'value' => $row ? (string)$row['setting_value'] : null]);
}

// ─── POST ─────────────────────────────────────────────────────────────────────
acc_require_permission($actor, 'accounting.settings.write', $pdo);
app_require_csrf();

$payload = app_read_json_body();
$key     = acc_normalize_text($payload['key'] ?? '');
$value   = isset($payload['value']) ? (string)$payload['value'] : '';

if ($key === '') {
    app_json(['success' => false, 'error' => 'Missing key.'], 400);
}
if (!str_starts_with($key, 'accounting.')) {
    app_json(['success' => false, 'error' => 'Invalid key prefix.'], 400);
}

try {
    app_ensure_system_settings_table($pdo);
    $stmt = $pdo->prepare(
        'INSERT INTO system_settings (setting_key, setting_value)
         VALUES (:k, :v)
         ON DUPLICATE KEY UPDATE setting_value = :v2'
    );
    $stmt->execute(['k' => $key, 'v' => $value, 'v2' => $value]);
} catch (Throwable $e) {
    app_json(['success' => false, 'error' => 'DB error: ' . $e->getMessage()], 500);
}

app_json(['success' => true]);

<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../config/db.php';

app_handle_preflight(['GET', 'POST']);
$method = app_require_method(['GET', 'POST']);

if ($method === 'GET') {
    app_json([
        'success' => true,
        'profile' => app_read_profile($pdo),
    ]);
}

app_require_auth(['admin', 'manager']);
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

app_json([
    'success' => true,
    'profile' => $saved,
]);

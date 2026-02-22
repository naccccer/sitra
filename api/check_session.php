<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';

app_handle_preflight(['GET']);
app_require_method(['GET']);

$user = app_current_user();

app_json([
    'success' => true,
    'authenticated' => $user !== null,
    'role' => $user['role'] ?? null,
    'username' => $user['username'] ?? null,
]);

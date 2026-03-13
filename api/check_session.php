<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../config/db.php';

app_handle_preflight(['GET']);
app_require_method(['GET']);
app_require_module_enabled($pdo, 'auth');

$user = app_current_user();

app_json([
    'success' => true,
    'authenticated' => $user !== null,
    'role' => $user['role'] ?? null,
    'username' => $user['username'] ?? null,
    'fullName' => $user['fullName'] ?? null,
    'jobTitle' => $user['jobTitle'] ?? null,
]);

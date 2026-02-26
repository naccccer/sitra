<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/users_shared.php';
require_once __DIR__ . '/users_handlers.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
$currentUser = app_require_auth(['admin', 'manager']);
if ($method !== 'GET') {
    app_require_csrf();
}
app_ensure_users_table($pdo);
$hasIsActive = app_users_is_active_column($pdo);

switch ($method) {
    case 'GET':
        app_users_handle_get($pdo, $hasIsActive);
        break;
    case 'POST':
        app_users_handle_post($pdo, $hasIsActive);
        break;
    case 'PUT':
        app_users_handle_put($pdo, $hasIsActive);
        break;
    case 'PATCH':
        app_users_handle_patch($pdo, $hasIsActive, $currentUser);
        break;
}

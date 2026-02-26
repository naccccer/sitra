<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/orders_shared.php';
require_once __DIR__ . '/orders_handlers.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
app_ensure_orders_table($pdo);

if ($method !== 'GET') {
    app_require_csrf();
}

switch ($method) {
    case 'GET':
        app_sales_orders_handle_get($pdo);
        break;
    case 'POST':
        app_sales_orders_handle_post($pdo);
        break;
    case 'PUT':
        app_sales_orders_handle_put($pdo);
        break;
    case 'DELETE':
        app_sales_orders_handle_delete($pdo);
        break;
    case 'PATCH':
        app_sales_orders_handle_patch($pdo);
        break;
}

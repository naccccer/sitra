<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/../../kernel/inventory_release_contract.php';
require_once __DIR__ . '/work_orders_shared.php';
require_once __DIR__ . '/work_orders_handlers.php';

app_handle_preflight(['GET', 'POST', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PATCH']);
app_require_module_enabled($pdo, 'production');

if ($method !== 'GET') {
    app_require_csrf();
}

if ($method === 'GET') {
    app_production_work_orders_handle_get($pdo);
}

if ($method === 'POST') {
    app_production_work_orders_handle_post($pdo);
}

if ($method === 'PATCH') {
    app_production_work_orders_handle_patch($pdo);
}

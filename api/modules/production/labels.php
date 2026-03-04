<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/../../kernel/inventory_release_contract.php';
require_once __DIR__ . '/work_orders_shared.php';
require_once __DIR__ . '/labels_shared.php';
require_once __DIR__ . '/labels_handlers.php';

app_handle_preflight(['GET', 'POST']);
$method = app_require_method(['GET', 'POST']);
app_require_module_enabled($pdo, 'production');

if ($method === 'POST') {
    app_require_csrf();
    app_production_labels_handle_post($pdo);
}

if ($method === 'GET') {
    app_production_labels_handle_get($pdo);
}

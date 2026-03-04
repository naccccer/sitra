<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/../../kernel/inventory_release_contract.php';
require_once __DIR__ . '/stock_handlers.php';

app_handle_preflight(['GET']);
$method = app_require_method(['GET']);
app_require_module_enabled($pdo, 'inventory');

if ($method === 'GET') {
    app_inventory_stock_handle_get($pdo);
}

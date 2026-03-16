<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET']);
app_require_method(['GET']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_inventory_schema($pdo);
app_require_permission('inventory.warehouses.read', $pdo);

$includeInactive = app_inventory_bool($_GET['includeInactive'] ?? false, false);
$sql = 'SELECT * FROM inventory_warehouses';
if (!$includeInactive) {
    $sql .= ' WHERE is_active = 1';
}
$sql .= ' ORDER BY id ASC';

$stmt = $pdo->query($sql);
$rows = $stmt ? $stmt->fetchAll() : [];

app_json([
    'success' => true,
    'warehouses' => array_map('app_inventory_warehouse_from_row', $rows),
]);

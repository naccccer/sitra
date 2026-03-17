<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/../../common/inventory_v2_schema_ext.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_inventory_v2_schema_ext($pdo);

$actor = app_require_auth(['admin', 'manager']);
if ($method === 'GET') {
    app_inventory_v2_require_permission($actor, 'inventory.v2_reports.read', $pdo);
} else {
    app_inventory_v2_require_permission($actor, 'inventory.v2_settings.write', $pdo);
    app_require_csrf();
}

if ($method === 'GET') {
    $action = app_inventory_v2_normalize_text($_GET['action'] ?? '');

    if ($action === 'suggest') {
        $sql = "
            SELECT
                r.id AS rule_id,
                p.id AS product_id,
                p.name AS product_name,
                p.uom,
                w.id AS warehouse_id,
                w.name AS warehouse_name,
                r.min_qty,
                r.max_qty,
                COALESCE(SUM(q.quantity_on_hand - q.quantity_reserved), 0) AS available_qty,
                GREATEST(0, r.max_qty - COALESCE(SUM(q.quantity_on_hand - q.quantity_reserved), 0)) AS suggested_qty
            FROM inventory_v2_replenishment_rules r
            JOIN inventory_v2_products p ON p.id = r.product_id
            JOIN inventory_v2_warehouses w ON w.id = r.warehouse_id
            LEFT JOIN inventory_v2_quants q
                ON q.product_id = r.product_id AND q.warehouse_id = r.warehouse_id
            WHERE r.is_active = 1
            GROUP BY r.id, p.id, p.name, p.uom, w.id, w.name, r.min_qty, r.max_qty
            HAVING available_qty < r.min_qty
            ORDER BY p.name
        ";
        $stmt = $pdo->query($sql);
        $rows = $stmt->fetchAll() ?: [];

        $suggestions = array_map(static function (array $row): array {
            return [
                'ruleId' => (string)$row['rule_id'],
                'productId' => (string)$row['product_id'],
                'productName' => (string)$row['product_name'],
                'uom' => (string)$row['uom'],
                'warehouseId' => (string)$row['warehouse_id'],
                'warehouseName' => (string)$row['warehouse_name'],
                'minQty' => (string)$row['min_qty'],
                'maxQty' => (string)$row['max_qty'],
                'availableQty' => (string)$row['available_qty'],
                'suggestedQty' => (string)$row['suggested_qty'],
            ];
        }, $rows);

        app_json(['success' => true, 'suggestions' => $suggestions]);
    }

    $stmt = $pdo->prepare(
        'SELECT * FROM inventory_v2_replenishment_rules WHERE is_active = 1 ORDER BY id ASC'
    );
    $stmt->execute();
    $rows = $stmt->fetchAll() ?: [];

    app_json([
        'success' => true,
        'rules' => array_map('app_inventory_v2_replenishment_rule_from_row', $rows),
    ]);
}

$payload = app_read_json_body();

if ($method === 'POST') {
    $productId = app_inventory_v2_parse_id($payload['productId'] ?? null);
    $warehouseId = app_inventory_v2_parse_id($payload['warehouseId'] ?? null);
    $minQty = max(0.0, (float)($payload['minQty'] ?? 0));
    $maxQty = max(0.0, (float)($payload['maxQty'] ?? 0));
    $notes = app_inventory_v2_normalize_text($payload['notes'] ?? '');

    if ($productId === null || $warehouseId === null) {
        app_json(['success' => false, 'error' => 'productId and warehouseId are required.'], 400);
    }
    if ($maxQty < $minQty) {
        app_json(['success' => false, 'error' => 'maxQty must be >= minQty.'], 400);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO inventory_v2_replenishment_rules
         (product_id, warehouse_id, min_qty, max_qty, notes, is_active)
         VALUES (:product_id, :warehouse_id, :min_qty, :max_qty, :notes, 1)'
    );
    $stmt->execute([
        'product_id' => $productId,
        'warehouse_id' => $warehouseId,
        'min_qty' => $minQty,
        'max_qty' => $maxQty,
        'notes' => $notes !== '' ? $notes : null,
    ]);

    $id = (int)$pdo->lastInsertId();
    $fetch = $pdo->prepare('SELECT * FROM inventory_v2_replenishment_rules WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();

    app_audit_log($pdo, 'inventory.vtwo_replenishment.created', 'inventory_v2_replenishment_rule', (string)$id, [], $actor);
    app_json(['success' => true, 'rule' => $row ? app_inventory_v2_replenishment_rule_from_row($row) : null], 201);
}

if ($method === 'PUT') {
    $id = app_inventory_v2_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
    }

    $currentStmt = $pdo->prepare('SELECT * FROM inventory_v2_replenishment_rules WHERE id = :id LIMIT 1');
    $currentStmt->execute(['id' => $id]);
    $current = $currentStmt->fetch();
    if (!$current) {
        app_json(['success' => false, 'error' => 'Rule not found.'], 404);
    }

    $minQty = max(0.0, (float)($payload['minQty'] ?? $current['min_qty']));
    $maxQty = max(0.0, (float)($payload['maxQty'] ?? $current['max_qty']));
    $notes = app_inventory_v2_normalize_text($payload['notes'] ?? ($current['notes'] ?? ''));

    if ($maxQty < $minQty) {
        app_json(['success' => false, 'error' => 'maxQty must be >= minQty.'], 400);
    }

    $pdo->prepare(
        'UPDATE inventory_v2_replenishment_rules
         SET min_qty = :min_qty, max_qty = :max_qty, notes = :notes, updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    )->execute(['id' => $id, 'min_qty' => $minQty, 'max_qty' => $maxQty, 'notes' => $notes !== '' ? $notes : null]);

    $fetch = $pdo->prepare('SELECT * FROM inventory_v2_replenishment_rules WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();

    app_audit_log($pdo, 'inventory.vtwo_replenishment.updated', 'inventory_v2_replenishment_rule', (string)$id, [], $actor);
    app_json(['success' => true, 'rule' => $row ? app_inventory_v2_replenishment_rule_from_row($row) : null]);
}

// PATCH = soft-delete (deactivate)
$id = app_inventory_v2_parse_id($payload['id'] ?? null);
if ($id === null) {
    app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
}

$pdo->prepare(
    'UPDATE inventory_v2_replenishment_rules SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = :id'
)->execute(['id' => $id]);

app_audit_log($pdo, 'inventory.vtwo_replenishment.deleted', 'inventory_v2_replenishment_rule', (string)$id, [], $actor);
app_json(['success' => true]);

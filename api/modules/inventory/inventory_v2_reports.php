<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET']);
$method = app_require_method(['GET']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_inventory_v2_schema($pdo);

$actor = app_require_auth(['admin', 'manager']);
app_inventory_v2_require_permission($actor, 'inventory.v2_reports.read', $pdo);

$report = app_inventory_v2_normalize_text($_GET['report'] ?? 'on_hand');
$productId = app_inventory_v2_parse_id($_GET['productId'] ?? null);
$warehouseId = app_inventory_v2_parse_id($_GET['warehouseId'] ?? null);
$dateFrom = app_inventory_v2_normalize_text($_GET['dateFrom'] ?? '');
$dateTo = app_inventory_v2_normalize_text($_GET['dateTo'] ?? '');

if ($report === 'on_hand') {
    $where = [];
    $params = [];

    if ($warehouseId !== null) {
        $where[] = 'q.warehouse_id = :warehouse_id';
        $params['warehouse_id'] = $warehouseId;
    }
    if ($productId !== null) {
        $where[] = 'q.product_id = :product_id';
        $params['product_id'] = $productId;
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "
        SELECT
            p.name AS product_name,
            p.uom,
            w.name AS warehouse_name,
            l.name AS location_name,
            q.quantity_on_hand,
            q.quantity_reserved,
            (q.quantity_on_hand - q.quantity_reserved) AS quantity_available
        FROM inventory_v2_quants q
        JOIN inventory_v2_products p ON p.id = q.product_id
        JOIN inventory_v2_warehouses w ON w.id = q.warehouse_id
        JOIN inventory_v2_locations l ON l.id = q.location_id
        {$whereClause}
        ORDER BY p.name, w.name, l.name
        LIMIT 500
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    $result = array_map(static function (array $row): array {
        return [
            'productName' => (string)$row['product_name'],
            'uom' => (string)$row['uom'],
            'warehouseName' => (string)$row['warehouse_name'],
            'locationName' => (string)$row['location_name'],
            'quantityOnHand' => (string)$row['quantity_on_hand'],
            'quantityReserved' => (string)$row['quantity_reserved'],
            'quantityAvailable' => (string)$row['quantity_available'],
        ];
    }, $rows);

    app_json(['success' => true, 'report' => 'on_hand', 'rows' => $result]);
}

if ($report === 'cardex') {
    $where = ['1=1'];
    $params = [];

    if ($productId !== null) {
        $where[] = 'sl.product_id = :product_id';
        $params['product_id'] = $productId;
    }
    if ($warehouseId !== null) {
        $where[] = 'sl.warehouse_id = :warehouse_id';
        $params['warehouse_id'] = $warehouseId;
    }
    if ($dateFrom !== '') {
        $where[] = 'DATE(sl.created_at) >= :date_from';
        $params['date_from'] = $dateFrom;
    }
    if ($dateTo !== '') {
        $where[] = 'DATE(sl.created_at) <= :date_to';
        $params['date_to'] = $dateTo;
    }

    $whereClause = 'WHERE ' . implode(' AND ', $where);

    $sql = "
        SELECT
            sl.created_at,
            sl.movement_type,
            p.name AS product_name,
            w.name AS warehouse_name,
            sl.quantity_on_hand_delta,
            sl.quantity_reserved_delta,
            sl.reference_type,
            sl.reference_code,
            oh.operation_no
        FROM inventory_v2_stock_ledger sl
        JOIN inventory_v2_products p ON p.id = sl.product_id
        JOIN inventory_v2_warehouses w ON w.id = sl.warehouse_id
        LEFT JOIN inventory_v2_operation_headers oh ON oh.id = sl.operation_id
        {$whereClause}
        ORDER BY sl.created_at DESC
        LIMIT 300
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    $result = array_map(static function (array $row): array {
        return [
            'createdAt' => app_format_order_timestamp($row['created_at']),
            'movementType' => (string)$row['movement_type'],
            'productName' => (string)$row['product_name'],
            'warehouseName' => (string)$row['warehouse_name'],
            'quantityOnHandDelta' => (string)$row['quantity_on_hand_delta'],
            'quantityReservedDelta' => (string)$row['quantity_reserved_delta'],
            'referenceType' => (string)($row['reference_type'] ?? ''),
            'referenceCode' => (string)($row['reference_code'] ?? ''),
            'operationNo' => $row['operation_no'] !== null ? (string)$row['operation_no'] : null,
        ];
    }, $rows);

    app_json(['success' => true, 'report' => 'cardex', 'rows' => $result]);
}

if ($report === 'operations') {
    $sql = "
        SELECT
            operation_type,
            status,
            COUNT(*) AS count,
            MIN(created_at) AS earliest,
            MAX(created_at) AS latest
        FROM inventory_v2_operation_headers
        GROUP BY operation_type, status
        ORDER BY operation_type, status
    ";

    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll() ?: [];

    $result = array_map(static function (array $row): array {
        return [
            'operationType' => (string)$row['operation_type'],
            'status' => (string)$row['status'],
            'count' => (string)$row['count'],
            'earliest' => app_format_order_timestamp($row['earliest']),
            'latest' => app_format_order_timestamp($row['latest']),
        ];
    }, $rows);

    app_json(['success' => true, 'report' => 'operations', 'rows' => $result]);
}

app_json(['success' => false, 'error' => 'Unknown report type.'], 400);

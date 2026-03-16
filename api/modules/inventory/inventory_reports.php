<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET']);
app_require_method(['GET']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_inventory_schema($pdo);
app_require_permission('inventory.reports.read', $pdo);

$report = app_inventory_normalize_text($_GET['report'] ?? 'stock');
$warehouseId = app_inventory_parse_id($_GET['warehouseId'] ?? null);
$itemId = app_inventory_parse_id($_GET['itemId'] ?? null);
$status = app_inventory_normalize_text($_GET['status'] ?? '');
$from = app_inventory_normalize_text($_GET['from'] ?? '');
$to = app_inventory_normalize_text($_GET['to'] ?? '');

if ($report === 'stock') {
    $where = [];
    $params = [];
    if ($warehouseId !== null) {
        $where[] = 's.warehouse_id = :warehouse_id';
        $params['warehouse_id'] = $warehouseId;
    }
    if ($itemId !== null) {
        $where[] = 's.item_id = :item_id';
        $params['item_id'] = $itemId;
    }

    $sql = 'SELECT s.*, w.name AS warehouse_name, i.title AS item_title, i.base_unit, i.secondary_unit
            FROM inventory_stock s
            INNER JOIN inventory_warehouses w ON w.id = s.warehouse_id
            INNER JOIN inventory_items i ON i.id = s.item_id';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY w.id ASC, i.id ASC LIMIT 1000';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    app_json([
        'success' => true,
        'report' => 'stock',
        'rows' => array_map(static function (array $row): array {
            return [
                'warehouseId' => (string)($row['warehouse_id'] ?? ''),
                'warehouseName' => (string)($row['warehouse_name'] ?? ''),
                'itemId' => (string)($row['item_id'] ?? ''),
                'itemTitle' => (string)($row['item_title'] ?? ''),
                'quantityBase' => (float)($row['quantity_base'] ?? 0),
                'quantitySecondary' => (float)($row['quantity_secondary'] ?? 0),
                'baseUnit' => (string)($row['base_unit'] ?? ''),
                'secondaryUnit' => (string)($row['secondary_unit'] ?? ''),
                'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
            ];
        }, $rows),
    ]);
}

if ($report === 'ledger' || $report === 'documents') {
    $where = ['d.status = :posted_status'];
    $params = ['posted_status' => 'posted'];

    if ($warehouseId !== null) {
        $where[] = '(d.source_warehouse_id = :warehouse_id OR d.target_warehouse_id = :warehouse_id)';
        $params['warehouse_id'] = $warehouseId;
    }
    if ($itemId !== null) {
        $where[] = 'l.item_id = :item_id';
        $params['item_id'] = $itemId;
    }
    if ($from !== '') {
        $where[] = 'd.created_at >= :from_date';
        $params['from_date'] = $from;
    }
    if ($to !== '') {
        $where[] = 'd.created_at <= :to_date';
        $params['to_date'] = $to;
    }

    $sql = 'SELECT d.id AS document_id, d.doc_no, d.doc_type, d.status, d.source_warehouse_id, d.target_warehouse_id,
                   d.reference_type, d.reference_id, d.reference_code, d.created_at, d.posted_at,
                   l.id AS line_id, l.item_id, l.quantity_base, l.quantity_secondary,
                   i.title AS item_title
            FROM inventory_documents d
            INNER JOIN inventory_document_lines l ON l.document_id = d.id
            INNER JOIN inventory_items i ON i.id = l.item_id';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY d.id DESC, l.id ASC LIMIT 1000';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    app_json([
        'success' => true,
        'report' => $report,
        'rows' => array_map(static function (array $row): array {
            return [
                'documentId' => (string)($row['document_id'] ?? ''),
                'docNo' => (string)($row['doc_no'] ?? ''),
                'docType' => (string)($row['doc_type'] ?? ''),
                'status' => (string)($row['status'] ?? ''),
                'sourceWarehouseId' => isset($row['source_warehouse_id']) ? (string)$row['source_warehouse_id'] : null,
                'targetWarehouseId' => isset($row['target_warehouse_id']) ? (string)$row['target_warehouse_id'] : null,
                'referenceType' => (string)($row['reference_type'] ?? ''),
                'referenceId' => (string)($row['reference_id'] ?? ''),
                'referenceCode' => (string)($row['reference_code'] ?? ''),
                'itemId' => (string)($row['item_id'] ?? ''),
                'itemTitle' => (string)($row['item_title'] ?? ''),
                'quantityBase' => (float)($row['quantity_base'] ?? 0),
                'quantitySecondary' => (float)($row['quantity_secondary'] ?? 0),
                'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
                'postedAt' => app_format_order_timestamp($row['posted_at'] ?? null),
            ];
        }, $rows),
    ]);
}

if ($report === 'count_variance') {
    $where = [];
    $params = [];

    if ($warehouseId !== null) {
        $where[] = 's.warehouse_id = :warehouse_id';
        $params['warehouse_id'] = $warehouseId;
    }
    if ($itemId !== null) {
        $where[] = 'l.item_id = :item_id';
        $params['item_id'] = $itemId;
    }

    $sql = 'SELECT s.id AS session_id, s.warehouse_id, s.count_type, s.status, s.started_at, s.closed_at,
                   l.item_id, l.system_quantity_base, l.system_quantity_secondary, l.counted_quantity_base, l.counted_quantity_secondary, l.diff_quantity_base, l.diff_quantity_secondary,
                   i.title AS item_title
            FROM inventory_count_sessions s
            INNER JOIN inventory_count_lines l ON l.session_id = s.id
            INNER JOIN inventory_items i ON i.id = l.item_id';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY s.id DESC, l.id ASC LIMIT 1000';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    app_json([
        'success' => true,
        'report' => 'count_variance',
        'rows' => $rows,
    ]);
}

if ($report === 'requests') {
    $where = [];
    $params = [];
    if ($status !== '') {
        $where[] = 'r.status = :status';
        $params['status'] = $status;
    }

    $sql = 'SELECT r.*, i.title AS item_title, w.name AS warehouse_name
            FROM inventory_requests r
            LEFT JOIN inventory_items i ON i.id = r.item_id
            LEFT JOIN inventory_warehouses w ON w.id = r.warehouse_id';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY r.id DESC LIMIT 500';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    app_json([
        'success' => true,
        'report' => 'requests',
        'rows' => array_map(static function (array $row): array {
            return [
                'id' => (string)($row['id'] ?? ''),
                'status' => (string)($row['status'] ?? ''),
                'warehouseName' => (string)($row['warehouse_name'] ?? ''),
                'itemTitle' => (string)($row['item_title'] ?? ''),
                'quantityBase' => (float)($row['quantity_base'] ?? 0),
                'quantitySecondary' => (float)($row['quantity_secondary'] ?? 0),
                'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
                'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
            ];
        }, $rows),
    ]);
}

app_json(['success' => false, 'error' => 'Unsupported report type.'], 400);

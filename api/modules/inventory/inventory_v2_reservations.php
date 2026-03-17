<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET', 'POST', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PATCH']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_inventory_v2_schema($pdo);

$actor = app_require_auth(['admin', 'manager', 'sales']);
if ($method === 'GET') {
    app_inventory_v2_require_permission($actor, 'inventory.v2_operations.read', $pdo);
} else {
    app_inventory_v2_require_permission($actor, 'inventory.v2_operations.write', $pdo);
    app_require_csrf();
}

function inv_v2_res_fetch(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(
        'SELECT r.*, p.name AS product_name, w.name AS warehouse_name
         FROM inventory_v2_reservations r
         LEFT JOIN inventory_v2_products p ON p.id = r.product_id
         LEFT JOIN inventory_v2_warehouses w ON w.id = r.warehouse_id
         WHERE r.id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ? app_inventory_v2_reservation_from_row($row) : null;
}

// ─── GET ─────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $status   = app_inventory_v2_normalize_text($_GET['status'] ?? '');
    $refType  = app_inventory_v2_normalize_text($_GET['referenceType'] ?? '');
    $refId    = app_inventory_v2_normalize_text($_GET['referenceId'] ?? '');
    $prodId   = app_inventory_v2_parse_id($_GET['productId'] ?? null);
    $page     = max(1, (int)($_GET['page'] ?? 1));
    $pageSize = min(100, max(10, (int)($_GET['pageSize'] ?? 20)));
    $offset   = ($page - 1) * $pageSize;

    $where  = [];
    $params = [];
    $validStatuses = ['active', 'fulfilled', 'released', 'expired'];
    if ($status !== '' && in_array($status, $validStatuses, true)) {
        $where[] = 'r.status = :status';
        $params['status'] = $status;
    }
    if ($refType !== '') {
        $where[] = 'r.reference_type = :ref_type';
        $params['ref_type'] = $refType;
    }
    if ($refId !== '') {
        $where[] = 'r.reference_id = :ref_id';
        $params['ref_id'] = $refId;
    }
    if ($prodId !== null) {
        $where[] = 'r.product_id = :pid';
        $params['pid'] = $prodId;
    }
    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM inventory_v2_reservations r {$whereSql}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $sql = "SELECT r.*, p.name AS product_name, w.name AS warehouse_name
            FROM inventory_v2_reservations r
            LEFT JOIN inventory_v2_products p ON p.id = r.product_id
            LEFT JOIN inventory_v2_warehouses w ON w.id = r.warehouse_id
            {$whereSql}
            ORDER BY r.created_at DESC
            LIMIT {$pageSize} OFFSET {$offset}";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    app_json([
        'success'      => true,
        'reservations' => array_map('app_inventory_v2_reservation_from_row', $rows),
        'total'        => $total,
        'page'         => $page,
        'pageSize'     => $pageSize,
    ]);
}

$payload = app_read_json_body();

// ─── POST ─────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $productId  = app_inventory_v2_parse_id($payload['productId'] ?? null);
    $variantId  = app_inventory_v2_parse_id($payload['variantId'] ?? null);
    $lotId      = app_inventory_v2_parse_id($payload['lotId'] ?? null);
    $warehouseId = app_inventory_v2_parse_id($payload['warehouseId'] ?? null);
    $locationId = app_inventory_v2_parse_id($payload['locationId'] ?? null);
    $qty        = (float)($payload['quantityReserved'] ?? 0);
    $refType    = app_inventory_v2_normalize_text($payload['referenceType'] ?? '');
    $refId      = app_inventory_v2_normalize_text($payload['referenceId'] ?? '');
    $refCode    = app_inventory_v2_normalize_text($payload['referenceCode'] ?? '');
    $notes      = app_inventory_v2_normalize_text($payload['notes'] ?? '');
    if (!$productId || !$warehouseId || !$locationId || $qty <= 0) {
        app_json(['success' => false, 'error' => 'productId, warehouseId, locationId and quantityReserved > 0 are required.'], 400);
    }
    $avail = app_inventory_v2_get_available_qty($pdo, $productId, $variantId, $warehouseId, $locationId, $lotId);
    if ($avail < $qty - 0.0005) {
        app_json(['success' => false, 'error' => "Insufficient available stock. Available: {$avail}, Requested: {$qty}."], 422);
    }
    $pdo->beginTransaction();
    try {
        $reservationNo = app_inventory_v2_generate_reservation_no($pdo);
        $ins = $pdo->prepare(
            'INSERT INTO inventory_v2_reservations
             (reservation_no, product_id, variant_id, lot_id, warehouse_id, location_id,
              quantity_reserved, status, reference_type, reference_id, reference_code,
              notes, created_by_user_id)
             VALUES (:no,:pid,:vid,:lid,:wid,:loc_id,:qty,\'active\',:rt,:ri,:rc,:notes,:uid)'
        );
        $ins->execute([
            'no'    => $reservationNo,
            'pid'   => $productId,
            'vid'   => $variantId,
            'lid'   => $lotId,
            'wid'   => $warehouseId,
            'loc_id' => $locationId,
            'qty'   => $qty,
            'rt'    => $refType !== '' ? $refType : null,
            'ri'    => $refId !== '' ? $refId : null,
            'rc'    => $refCode !== '' ? $refCode : null,
            'notes' => $notes !== '' ? $notes : null,
            'uid'   => (int)$actor['id'],
        ]);
        $resId = (int)$pdo->lastInsertId();
        app_inventory_v2_adjust_reserved($pdo, $productId, $variantId, $warehouseId, $locationId, $lotId, $qty);
        app_inventory_v2_write_ledger($pdo, [
            'operation_id'  => null,
            'line_id'       => null,
            'movement_type' => 'reserve',
            'product_id'    => $productId,
            'variant_id'    => $variantId,
            'lot_id'        => $lotId,
            'warehouse_id'  => $warehouseId,
            'location_id'   => $locationId,
            'qty_delta'     => $qty,
            'ref_type'      => $refType !== '' ? $refType : null,
            'ref_id'        => $refId !== '' ? $refId : null,
            'ref_code'      => $refCode !== '' ? $refCode : null,
            'actor_id'      => (int)$actor['id'],
        ]);
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        app_json(['success' => false, 'error' => 'Failed to create reservation.'], 500);
    }
    app_audit_log($pdo, 'inventory.vtwo_reservations.created', 'inventory_v2_reservation', (string)$resId, ['reservationNo' => $reservationNo], $actor);
    app_json(['success' => true, 'reservation' => inv_v2_res_fetch($pdo, $resId)], 201);
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
$id     = app_inventory_v2_parse_id($payload['id'] ?? null);
$action = app_inventory_v2_normalize_text($payload['action'] ?? '');
if ($id === null || $action === '') {
    app_json(['success' => false, 'error' => 'id and action are required.'], 400);
}
$resStmt = $pdo->prepare('SELECT * FROM inventory_v2_reservations WHERE id = :id LIMIT 1');
$resStmt->execute(['id' => $id]);
$res = $resStmt->fetch();
if (!$res) {
    app_json(['success' => false, 'error' => 'Reservation not found.'], 404);
}
if ($action !== 'release') {
    app_json(['success' => false, 'error' => 'Invalid action. Use: release'], 400);
}
if ($res['status'] !== 'active') {
    app_json(['success' => false, 'error' => 'Only active reservations can be released.'], 422);
}
$pdo->beginTransaction();
try {
    $pdo->prepare(
        'UPDATE inventory_v2_reservations SET status = \'released\', updated_at = CURRENT_TIMESTAMP WHERE id = :id'
    )->execute(['id' => $id]);
    $resQty = (float)$res['quantity_reserved'];
    app_inventory_v2_adjust_reserved($pdo, (int)$res['product_id'], isset($res['variant_id']) ? (int)$res['variant_id'] : null, (int)$res['warehouse_id'], (int)$res['location_id'], isset($res['lot_id']) ? (int)$res['lot_id'] : null, -$resQty);
    app_inventory_v2_write_ledger($pdo, [
        'operation_id'  => null,
        'line_id'       => null,
        'movement_type' => 'release',
        'product_id'    => (int)$res['product_id'],
        'variant_id'    => isset($res['variant_id']) ? (int)$res['variant_id'] : null,
        'lot_id'        => isset($res['lot_id']) ? (int)$res['lot_id'] : null,
        'warehouse_id'  => (int)$res['warehouse_id'],
        'location_id'   => (int)$res['location_id'],
        'qty_delta'     => -$resQty,
        'ref_type'      => $res['reference_type'] ?? null,
        'ref_id'        => $res['reference_id'] ?? null,
        'ref_code'      => $res['reference_code'] ?? null,
        'actor_id'      => (int)$actor['id'],
    ]);
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    app_json(['success' => false, 'error' => 'Failed to release reservation.'], 500);
}
app_audit_log($pdo, 'inventory.vtwo_reservations.released', 'inventory_v2_reservation', (string)$id, [], $actor);
app_json(['success' => true, 'reservation' => inv_v2_res_fetch($pdo, $id)]);

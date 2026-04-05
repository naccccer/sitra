<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_inventory_v2_schema($pdo);

$actor = $method === 'GET'
    ? app_require_auth(['admin', 'manager', 'sales'])
    : app_require_auth(['admin', 'manager']);
if ($method === 'GET') {
    app_inventory_v2_require_permission($actor, 'inventory.v2_lots.read', $pdo);
} else {
    app_inventory_v2_require_permission($actor, 'inventory.v2_lots.write', $pdo);
    app_require_csrf();
}

function app_inventory_v2_lots_payload(array $payload, ?array $current = null): array
{
    $lotCode = app_inventory_v2_normalize_text($payload['lotCode'] ?? ($current['lot_code'] ?? ''));
    $productId = app_inventory_v2_parse_id($payload['productId'] ?? ($current['product_id'] ?? null));
    $variantId = app_inventory_v2_parse_id($payload['variantId'] ?? ($current['variant_id'] ?? null));
    $expiryDate = app_inventory_v2_normalize_text($payload['expiryDate'] ?? ($current['expiry_date'] ?? ''));
    $notes = app_inventory_v2_normalize_text($payload['notes'] ?? ($current['notes'] ?? ''));

    if ($lotCode === '' || $productId === null) {
        app_json(['success' => false, 'error' => 'lotCode and productId are required.'], 400);
    }

    if ($expiryDate === '') {
        $expiryDate = null;
    }

    return [
        'lot_code' => $lotCode,
        'product_id' => $productId,
        'variant_id' => $variantId,
        'expiry_date' => $expiryDate,
        'notes' => $notes !== '' ? $notes : null,
    ];
}

if ($method === 'GET') {
    $productId = app_inventory_v2_parse_id($_GET['productId'] ?? null);
    $includeArchived = app_inventory_v2_parse_archive_filter($_GET);

    $sql = 'SELECT * FROM inventory_v2_lots';
    $where = [];
    $params = [];

    if ($productId !== null) {
        $where[] = 'product_id = :product_id';
        $params['product_id'] = $productId;
    }
    if (!$includeArchived) {
        $where[] = 'is_active = 1';
    }

    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY id DESC LIMIT 500';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    app_json([
        'success' => true,
        'lots' => array_map('app_inventory_v2_lot_from_row', $rows),
    ]);
}

$payload = app_read_json_body();
if ($method === 'POST') {
    $data = app_inventory_v2_lots_payload($payload, null);

    $insert = $pdo->prepare(
        'INSERT INTO inventory_v2_lots
         (lot_code, product_id, variant_id, expiry_date, notes, is_active)
         VALUES (:lot_code, :product_id, :variant_id, :expiry_date, :notes, 1)'
    );
    $insert->execute($data);

    $id = (int)$pdo->lastInsertId();
    $fetch = $pdo->prepare('SELECT * FROM inventory_v2_lots WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();

    app_audit_log($pdo, 'inventory.vtwo_lots.created', 'inventory_v2_lot', (string)$id, ['lotCode' => $data['lot_code']], $actor);
    app_json(['success' => true, 'lot' => $row ? app_inventory_v2_lot_from_row($row) : null], 201);
}

if ($method === 'PUT') {
    $id = app_inventory_v2_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
    }

    $currentStmt = $pdo->prepare('SELECT * FROM inventory_v2_lots WHERE id = :id LIMIT 1');
    $currentStmt->execute(['id' => $id]);
    $current = $currentStmt->fetch();
    if (!$current) {
        app_json(['success' => false, 'error' => 'Lot not found.'], 404);
    }

    $data = app_inventory_v2_lots_payload($payload, $current);
    $data['id'] = $id;

    $update = $pdo->prepare(
        'UPDATE inventory_v2_lots
         SET lot_code = :lot_code,
             product_id = :product_id,
             variant_id = :variant_id,
             expiry_date = :expiry_date,
             notes = :notes,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $update->execute($data);

    $fetch = $pdo->prepare('SELECT * FROM inventory_v2_lots WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();

    app_audit_log($pdo, 'inventory.vtwo_lots.updated', 'inventory_v2_lot', (string)$id, ['lotCode' => $data['lot_code']], $actor);
    app_json(['success' => true, 'lot' => $row ? app_inventory_v2_lot_from_row($row) : null]);
}

$id = app_inventory_v2_parse_id($payload['id'] ?? null);
if ($id === null) {
    app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
}
$fetch = $pdo->prepare('SELECT * FROM inventory_v2_lots WHERE id = :id LIMIT 1');
$fetch->execute(['id' => $id]);
$current = $fetch->fetch();
if (!$current) {
    app_json(['success' => false, 'error' => 'Lot not found.'], 404);
}

$action = app_inventory_v2_resolve_entity_action($payload);
if ($action === 'delete') {
    app_inventory_v2_require_archived_for_delete($current, 'Lot');

    $dependencies = [
        'stock snapshots' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_quants WHERE lot_id = :id', ['id' => $id]),
        'stock ledger entries' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_stock_ledger WHERE lot_id = :id', ['id' => $id]),
        'reservations' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_reservations WHERE lot_id = :id', ['id' => $id]),
        'operation lines' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_operation_lines WHERE lot_id = :id', ['id' => $id]),
    ];

    foreach ($dependencies as $label => $count) {
        if ($count > 0) {
            app_json(['success' => false, 'error' => "Archived lot cannot be deleted because it still has related {$label}."], 409);
        }
    }

    $delete = $pdo->prepare('DELETE FROM inventory_v2_lots WHERE id = :id');
    $delete->execute(['id' => $id]);

    app_audit_log($pdo, 'inventory.vtwo_lots.deleted', 'inventory_v2_lot', (string)$id, ['lotCode' => (string)($current['lot_code'] ?? '')], $actor);
    app_json(['success' => true, 'deletedId' => (string)$id]);
}

$isActive = $action === 'restore';
$patch = $pdo->prepare('UPDATE inventory_v2_lots SET is_active = :is_active, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
$patch->execute(['id' => $id, 'is_active' => $isActive ? 1 : 0]);

$fetch->execute(['id' => $id]);
$row = $fetch->fetch();
if (!$row) {
    app_json(['success' => false, 'error' => 'Lot not found.'], 404);
}

$auditEvent = $isActive ? 'inventory.vtwo_lots.restored' : 'inventory.vtwo_lots.archived';
app_audit_log($pdo, $auditEvent, 'inventory_v2_lot', (string)$id, ['isActive' => $isActive], $actor);
app_json(['success' => true, 'lot' => app_inventory_v2_lot_from_row($row)]);



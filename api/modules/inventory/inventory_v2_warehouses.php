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
    app_inventory_v2_require_permission($actor, 'inventory.v2_warehouses.read', $pdo);
} else {
    app_inventory_v2_require_permission($actor, 'inventory.v2_warehouses.write', $pdo);
    app_require_csrf();
}

function app_inventory_v2_warehouses_payload(array $payload, ?array $current = null): array
{
    $warehouseKey = app_inventory_v2_normalize_text($payload['warehouseKey'] ?? ($current['warehouse_key'] ?? ''));
    $name = app_inventory_v2_normalize_text($payload['name'] ?? ($current['name'] ?? ''));
    $notes = app_inventory_v2_normalize_text($payload['notes'] ?? ($current['notes'] ?? ''));

    if ($warehouseKey === '' || $name === '') {
        app_json(['success' => false, 'error' => 'warehouseKey and name are required.'], 400);
    }

    return [
        'warehouse_key' => $warehouseKey,
        'name' => $name,
        'notes' => $notes !== '' ? $notes : null,
    ];
}

if ($method === 'GET') {
    $q = app_inventory_v2_normalize_text($_GET['q'] ?? '');
    $includeArchived = app_inventory_v2_parse_archive_filter($_GET);

    $where = [];
    $params = [];
    if (!$includeArchived) {
        $where[] = 'is_active = 1';
    }
    if ($q !== '') {
        $where[] = '(name LIKE :q OR warehouse_key LIKE :q)';
        $params['q'] = '%' . $q . '%';
    }

    $sql = 'SELECT * FROM inventory_v2_warehouses';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY id ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    app_json([
        'success' => true,
        'warehouses' => array_map('app_inventory_v2_warehouse_from_row', $rows),
    ]);
}

$payload = app_read_json_body();
if ($method === 'POST') {
    $data = app_inventory_v2_warehouses_payload($payload, null);

    $insert = $pdo->prepare(
        'INSERT INTO inventory_v2_warehouses (warehouse_key, name, notes, is_active)
         VALUES (:warehouse_key, :name, :notes, 1)'
    );
    $insert->execute($data);

    $id = (int)$pdo->lastInsertId();
    $fetch = $pdo->prepare('SELECT * FROM inventory_v2_warehouses WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();

    app_audit_log($pdo, 'inventory.vtwo_warehouses.created', 'inventory_v2_warehouse', (string)$id, ['name' => $data['name']], $actor);
    app_json(['success' => true, 'warehouse' => $row ? app_inventory_v2_warehouse_from_row($row) : null], 201);
}

if ($method === 'PUT') {
    $id = app_inventory_v2_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
    }

    $currentStmt = $pdo->prepare('SELECT * FROM inventory_v2_warehouses WHERE id = :id LIMIT 1');
    $currentStmt->execute(['id' => $id]);
    $current = $currentStmt->fetch();
    if (!$current) {
        app_json(['success' => false, 'error' => 'Warehouse not found.'], 404);
    }

    $data = app_inventory_v2_warehouses_payload($payload, $current);
    $data['id'] = $id;

    $update = $pdo->prepare(
        'UPDATE inventory_v2_warehouses
         SET warehouse_key = :warehouse_key,
             name = :name,
             notes = :notes,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $update->execute($data);

    $fetch = $pdo->prepare('SELECT * FROM inventory_v2_warehouses WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();

    app_audit_log($pdo, 'inventory.vtwo_warehouses.updated', 'inventory_v2_warehouse', (string)$id, ['name' => $data['name']], $actor);
    app_json(['success' => true, 'warehouse' => $row ? app_inventory_v2_warehouse_from_row($row) : null]);
}

$id = app_inventory_v2_parse_id($payload['id'] ?? null);
if ($id === null) {
    app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
}
$fetch = $pdo->prepare('SELECT * FROM inventory_v2_warehouses WHERE id = :id LIMIT 1');
$fetch->execute(['id' => $id]);
$current = $fetch->fetch();
if (!$current) {
    app_json(['success' => false, 'error' => 'Warehouse not found.'], 404);
}

$action = app_inventory_v2_resolve_entity_action($payload);
if ($action === 'delete') {
    app_inventory_v2_require_archived_for_delete($current, 'Warehouse');

    $dependencies = [
        'locations' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_locations WHERE warehouse_id = :id', ['id' => $id]),
        'stock snapshots' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_quants WHERE warehouse_id = :id', ['id' => $id]),
        'stock ledger entries' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_stock_ledger WHERE warehouse_id = :id', ['id' => $id]),
        'reservations' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_reservations WHERE warehouse_id = :id', ['id' => $id]),
        'operation headers' => app_inventory_v2_count_related_rows(
            $pdo,
            'SELECT COUNT(*) FROM inventory_v2_operation_headers WHERE source_warehouse_id = :source_id OR target_warehouse_id = :target_id',
            ['source_id' => $id, 'target_id' => $id]
        ),
    ];

    foreach ($dependencies as $label => $count) {
        if ($count > 0) {
            app_json(['success' => false, 'error' => "Archived warehouse cannot be deleted because it still has related {$label}."], 409);
        }
    }

    $delete = $pdo->prepare('DELETE FROM inventory_v2_warehouses WHERE id = :id');
    $delete->execute(['id' => $id]);

    app_audit_log($pdo, 'inventory.vtwo_warehouses.deleted', 'inventory_v2_warehouse', (string)$id, ['name' => (string)($current['name'] ?? '')], $actor);
    app_json(['success' => true, 'deletedId' => (string)$id]);
}

$isActive = $action === 'restore';
$patch = $pdo->prepare('UPDATE inventory_v2_warehouses SET is_active = :is_active, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
$patch->execute(['id' => $id, 'is_active' => $isActive ? 1 : 0]);

$fetch->execute(['id' => $id]);
$row = $fetch->fetch();
if (!$row) {
    app_json(['success' => false, 'error' => 'Warehouse not found.'], 404);
}

$auditEvent = $isActive ? 'inventory.vtwo_warehouses.restored' : 'inventory.vtwo_warehouses.archived';
app_audit_log($pdo, $auditEvent, 'inventory_v2_warehouse', (string)$id, ['isActive' => $isActive], $actor);
app_json(['success' => true, 'warehouse' => app_inventory_v2_warehouse_from_row($row)]);



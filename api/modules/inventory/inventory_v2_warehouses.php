<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_inventory_v2_schema($pdo);

$actor = app_require_auth(['admin', 'manager']);
if ($method === 'GET') {
    app_inventory_v2_require_permission($actor, 'inventory.vtwo_warehouses.read', $pdo);
} else {
    app_inventory_v2_require_permission($actor, 'inventory.vtwo_warehouses.write', $pdo);
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
    $includeInactive = app_inventory_v2_parse_bool($_GET['includeInactive'] ?? false, false);

    $where = [];
    $params = [];
    if (!$includeInactive) {
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
$isActive = app_inventory_v2_parse_bool($payload['isActive'] ?? true, true);

$patch = $pdo->prepare('UPDATE inventory_v2_warehouses SET is_active = :is_active, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
$patch->execute(['id' => $id, 'is_active' => $isActive ? 1 : 0]);

$fetch = $pdo->prepare('SELECT * FROM inventory_v2_warehouses WHERE id = :id LIMIT 1');
$fetch->execute(['id' => $id]);
$row = $fetch->fetch();
if (!$row) {
    app_json(['success' => false, 'error' => 'Warehouse not found.'], 404);
}

app_audit_log($pdo, 'inventory.vtwo_warehouses.active_changed', 'inventory_v2_warehouse', (string)$id, ['isActive' => $isActive], $actor);
app_json(['success' => true, 'warehouse' => app_inventory_v2_warehouse_from_row($row)]);

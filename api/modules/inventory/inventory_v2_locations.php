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
    app_inventory_v2_require_permission($actor, 'inventory.vtwo_locations.read', $pdo);
} else {
    app_inventory_v2_require_permission($actor, 'inventory.vtwo_locations.write', $pdo);
    app_require_csrf();
}

function app_inventory_v2_locations_payload(array $payload, ?array $current = null): array
{
    $warehouseId = app_inventory_v2_parse_id($payload['warehouseId'] ?? ($current['warehouse_id'] ?? null));
    $parentLocationId = app_inventory_v2_parse_id($payload['parentLocationId'] ?? ($current['parent_location_id'] ?? null));
    $locationKey = app_inventory_v2_normalize_text($payload['locationKey'] ?? ($current['location_key'] ?? ''));
    $name = app_inventory_v2_normalize_text($payload['name'] ?? ($current['name'] ?? ''));
    $usageType = app_inventory_v2_normalize_text($payload['usageType'] ?? ($current['usage_type'] ?? 'internal'));
    $notes = app_inventory_v2_normalize_text($payload['notes'] ?? ($current['notes'] ?? ''));

    if ($warehouseId === null || $locationKey === '' || $name === '') {
        app_json(['success' => false, 'error' => 'warehouseId, locationKey and name are required.'], 400);
    }

    $allowedUsage = ['internal', 'supplier', 'customer', 'inventory', 'production'];
    if (!in_array($usageType, $allowedUsage, true)) {
        app_json(['success' => false, 'error' => 'Invalid usageType.'], 400);
    }

    return [
        'warehouse_id' => $warehouseId,
        'parent_location_id' => $parentLocationId,
        'location_key' => $locationKey,
        'name' => $name,
        'usage_type' => $usageType,
        'notes' => $notes !== '' ? $notes : null,
    ];
}

if ($method === 'GET') {
    $warehouseId = app_inventory_v2_parse_id($_GET['warehouseId'] ?? null);
    $includeInactive = app_inventory_v2_parse_bool($_GET['includeInactive'] ?? false, false);

    $sql = 'SELECT * FROM inventory_v2_locations';
    $where = [];
    $params = [];

    if ($warehouseId !== null) {
        $where[] = 'warehouse_id = :warehouse_id';
        $params['warehouse_id'] = $warehouseId;
    }
    if (!$includeInactive) {
        $where[] = 'is_active = 1';
    }

    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY warehouse_id ASC, id ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    app_json([
        'success' => true,
        'locations' => array_map('app_inventory_v2_location_from_row', $rows),
    ]);
}

$payload = app_read_json_body();
if ($method === 'POST') {
    $data = app_inventory_v2_locations_payload($payload, null);

    $insert = $pdo->prepare(
        'INSERT INTO inventory_v2_locations
         (warehouse_id, parent_location_id, location_key, name, usage_type, notes, is_active)
         VALUES (:warehouse_id, :parent_location_id, :location_key, :name, :usage_type, :notes, 1)'
    );
    $insert->execute($data);

    $id = (int)$pdo->lastInsertId();
    $fetch = $pdo->prepare('SELECT * FROM inventory_v2_locations WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();

    app_audit_log($pdo, 'inventory.vtwo_locations.created', 'inventory_v2_location', (string)$id, ['name' => $data['name']], $actor);
    app_json(['success' => true, 'location' => $row ? app_inventory_v2_location_from_row($row) : null], 201);
}

if ($method === 'PUT') {
    $id = app_inventory_v2_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
    }

    $currentStmt = $pdo->prepare('SELECT * FROM inventory_v2_locations WHERE id = :id LIMIT 1');
    $currentStmt->execute(['id' => $id]);
    $current = $currentStmt->fetch();
    if (!$current) {
        app_json(['success' => false, 'error' => 'Location not found.'], 404);
    }

    $data = app_inventory_v2_locations_payload($payload, $current);
    if ((int)$data['parent_location_id'] === $id) {
        app_json(['success' => false, 'error' => 'parentLocationId cannot reference itself.'], 400);
    }
    $data['id'] = $id;

    $update = $pdo->prepare(
        'UPDATE inventory_v2_locations
         SET warehouse_id = :warehouse_id,
             parent_location_id = :parent_location_id,
             location_key = :location_key,
             name = :name,
             usage_type = :usage_type,
             notes = :notes,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $update->execute($data);

    $fetch = $pdo->prepare('SELECT * FROM inventory_v2_locations WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();

    app_audit_log($pdo, 'inventory.vtwo_locations.updated', 'inventory_v2_location', (string)$id, ['name' => $data['name']], $actor);
    app_json(['success' => true, 'location' => $row ? app_inventory_v2_location_from_row($row) : null]);
}

$id = app_inventory_v2_parse_id($payload['id'] ?? null);
if ($id === null) {
    app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
}
$isActive = app_inventory_v2_parse_bool($payload['isActive'] ?? true, true);

$patch = $pdo->prepare('UPDATE inventory_v2_locations SET is_active = :is_active, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
$patch->execute(['id' => $id, 'is_active' => $isActive ? 1 : 0]);

$fetch = $pdo->prepare('SELECT * FROM inventory_v2_locations WHERE id = :id LIMIT 1');
$fetch->execute(['id' => $id]);
$row = $fetch->fetch();
if (!$row) {
    app_json(['success' => false, 'error' => 'Location not found.'], 404);
}

app_audit_log($pdo, 'inventory.vtwo_locations.active_changed', 'inventory_v2_location', (string)$id, ['isActive' => $isActive], $actor);
app_json(['success' => true, 'location' => app_inventory_v2_location_from_row($row)]);

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
    app_inventory_v2_require_permission($actor, 'inventory.v2_products.read', $pdo);
} else {
    app_inventory_v2_require_permission($actor, 'inventory.v2_products.write', $pdo);
    app_require_csrf();
}

function app_inventory_v2_products_payload(array $payload, ?array $current = null): array
{
    $name = app_inventory_v2_normalize_text($payload['name'] ?? ($current['name'] ?? ''));
    $productType = app_inventory_v2_normalize_text($payload['productType'] ?? ($current['product_type'] ?? 'stockable'));
    $uom = app_inventory_v2_normalize_text($payload['uom'] ?? ($current['uom'] ?? ''));
    if ($name === '' || $uom === '') {
        app_json(['success' => false, 'error' => 'name and uom are required.'], 400);
    }

    $allowedTypes = ['stockable', 'consumable', 'service'];
    if (!in_array($productType, $allowedTypes, true)) {
        app_json(['success' => false, 'error' => 'Invalid productType.'], 400);
    }

    $productCode = app_inventory_v2_normalize_text($payload['productCode'] ?? ($current['product_code'] ?? ''));
    $notes = app_inventory_v2_normalize_text($payload['notes'] ?? ($current['notes'] ?? ''));

    return [
        'product_code' => $productCode !== '' ? $productCode : null,
        'name' => $name,
        'product_type' => $productType,
        'uom' => $uom,
        'notes' => $notes !== '' ? $notes : null,
    ];
}

if ($method === 'GET') {
    $q = app_inventory_v2_normalize_text($_GET['q'] ?? '');
    $includeArchived = app_inventory_v2_parse_archive_filter($_GET);

    $sql = 'SELECT * FROM inventory_v2_products';
    $where = [];
    $params = [];

    if (!$includeArchived) {
        $where[] = 'is_active = 1';
    }
    if ($q !== '') {
        $where[] = '(name LIKE :q OR COALESCE(product_code, "") LIKE :q)';
        $params['q'] = '%' . $q . '%';
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
        'products' => array_map('app_inventory_v2_product_from_row', $rows),
    ]);
}

$payload = app_read_json_body();
if ($method === 'POST') {
    $data = app_inventory_v2_products_payload($payload, null);

    $stmt = $pdo->prepare(
        'INSERT INTO inventory_v2_products
         (product_code, name, product_type, uom, notes, is_active)
         VALUES (:product_code, :name, :product_type, :uom, :notes, 1)'
    );
    $stmt->execute($data);

    $id = (int)$pdo->lastInsertId();
    $fetch = $pdo->prepare('SELECT * FROM inventory_v2_products WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();

    app_audit_log($pdo, 'inventory.vtwo_products.created', 'inventory_v2_product', (string)$id, ['name' => $data['name']], $actor);
    app_json(['success' => true, 'product' => $row ? app_inventory_v2_product_from_row($row) : null], 201);
}

if ($method === 'PUT') {
    $id = app_inventory_v2_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
    }

    $currentStmt = $pdo->prepare('SELECT * FROM inventory_v2_products WHERE id = :id LIMIT 1');
    $currentStmt->execute(['id' => $id]);
    $current = $currentStmt->fetch();
    if (!$current) {
        app_json(['success' => false, 'error' => 'Product not found.'], 404);
    }

    $data = app_inventory_v2_products_payload($payload, $current);
    $data['id'] = $id;

    $update = $pdo->prepare(
        'UPDATE inventory_v2_products
         SET product_code = :product_code,
             name = :name,
             product_type = :product_type,
             uom = :uom,
             notes = :notes,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $update->execute($data);

    $fetch = $pdo->prepare('SELECT * FROM inventory_v2_products WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();

    app_audit_log($pdo, 'inventory.vtwo_products.updated', 'inventory_v2_product', (string)$id, ['name' => $data['name']], $actor);
    app_json(['success' => true, 'product' => $row ? app_inventory_v2_product_from_row($row) : null]);
}

$id = app_inventory_v2_parse_id($payload['id'] ?? null);
if ($id === null) {
    app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
}
$fetch = $pdo->prepare('SELECT * FROM inventory_v2_products WHERE id = :id LIMIT 1');
$fetch->execute(['id' => $id]);
$current = $fetch->fetch();
if (!$current) {
    app_json(['success' => false, 'error' => 'Product not found.'], 404);
}

$action = app_inventory_v2_resolve_entity_action($payload);
if ($action === 'delete') {
    app_inventory_v2_require_archived_for_delete($current, 'Product');

    $dependencies = [
        'variants' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_variants WHERE product_id = :id', ['id' => $id]),
        'lots' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_lots WHERE product_id = :id', ['id' => $id]),
        'stock snapshots' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_quants WHERE product_id = :id', ['id' => $id]),
        'operation lines' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_operation_lines WHERE product_id = :id', ['id' => $id]),
        'stock ledger entries' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_stock_ledger WHERE product_id = :id', ['id' => $id]),
        'reservations' => app_inventory_v2_count_related_rows($pdo, 'SELECT COUNT(*) FROM inventory_v2_reservations WHERE product_id = :id', ['id' => $id]),
    ];

    foreach ($dependencies as $label => $count) {
        if ($count > 0) {
            app_json(['success' => false, 'error' => "Archived product cannot be deleted because it still has related {$label}."], 409);
        }
    }

    $delete = $pdo->prepare('DELETE FROM inventory_v2_products WHERE id = :id');
    $delete->execute(['id' => $id]);

    app_audit_log($pdo, 'inventory.vtwo_products.deleted', 'inventory_v2_product', (string)$id, ['name' => (string)($current['name'] ?? '')], $actor);
    app_json(['success' => true, 'deletedId' => (string)$id]);
}

$isActive = $action === 'restore';
$patch = $pdo->prepare('UPDATE inventory_v2_products SET is_active = :is_active, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
$patch->execute(['id' => $id, 'is_active' => $isActive ? 1 : 0]);

$fetch->execute(['id' => $id]);
$row = $fetch->fetch();
if (!$row) {
    app_json(['success' => false, 'error' => 'Product not found.'], 404);
}

$auditEvent = $isActive ? 'inventory.vtwo_products.restored' : 'inventory.vtwo_products.archived';
app_audit_log($pdo, $auditEvent, 'inventory_v2_product', (string)$id, ['isActive' => $isActive], $actor);
app_json(['success' => true, 'product' => app_inventory_v2_product_from_row($row)]);



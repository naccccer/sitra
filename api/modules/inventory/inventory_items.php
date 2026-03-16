<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_inventory_schema($pdo);

if ($method === 'GET') {
    app_require_permission('inventory.items.read', $pdo);
} else {
    $actor = app_require_permission('inventory.items.write', $pdo);
    app_require_csrf();
}

function app_inventory_items_read_payload(array $payload, ?array $current = null): array
{
    $title = app_inventory_normalize_text($payload['title'] ?? ($current['title'] ?? ''));
    $category = app_inventory_normalize_text($payload['category'] ?? ($current['category'] ?? ''));
    $sku = app_inventory_normalize_text($payload['sku'] ?? ($current['sku'] ?? ''));
    $baseUnit = app_inventory_normalize_text($payload['baseUnit'] ?? ($current['base_unit'] ?? ''));
    $secondaryUnit = app_inventory_normalize_text($payload['secondaryUnit'] ?? ($current['secondary_unit'] ?? ''));
    $secondaryPerBase = app_inventory_parse_decimal($payload['secondaryPerBase'] ?? ($current['secondary_per_base'] ?? null), 0);

    if ($title === '') {
        app_json(['success' => false, 'error' => 'title is required.'], 400);
    }
    if (!app_inventory_has_choice($category, app_inventory_item_categories())) {
        app_json(['success' => false, 'error' => 'Invalid category.'], 400);
    }
    if ($baseUnit === '') {
        app_json(['success' => false, 'error' => 'baseUnit is required.'], 400);
    }

    $glassWidthMm = app_inventory_parse_decimal($payload['glassWidthMm'] ?? ($current['glass_width_mm'] ?? null), 0);
    $glassHeightMm = app_inventory_parse_decimal($payload['glassHeightMm'] ?? ($current['glass_height_mm'] ?? null), 0);
    $glassThicknessMm = app_inventory_parse_decimal($payload['glassThicknessMm'] ?? ($current['glass_thickness_mm'] ?? null), 0);
    $glassColor = app_inventory_normalize_text($payload['glassColor'] ?? ($current['glass_color'] ?? ''));

    if ($category === 'raw_glass') {
        if ($glassWidthMm <= 0 || $glassHeightMm <= 0 || $glassThicknessMm <= 0 || $glassColor === '') {
            app_json(['success' => false, 'error' => 'raw_glass items require width/height/thickness/color.'], 400);
        }
    } else {
        $glassWidthMm = 0;
        $glassHeightMm = 0;
        $glassThicknessMm = 0;
        $glassColor = '';
    }

    if ($secondaryUnit === '') {
        $secondaryUnit = '';
        $secondaryPerBase = 0;
    } elseif ($secondaryPerBase <= 0) {
        app_json(['success' => false, 'error' => 'secondaryPerBase must be > 0 when secondaryUnit exists.'], 400);
    }

    return [
        'sku' => $sku !== '' ? $sku : null,
        'title' => $title,
        'category' => $category,
        'glass_width_mm' => $glassWidthMm > 0 ? $glassWidthMm : null,
        'glass_height_mm' => $glassHeightMm > 0 ? $glassHeightMm : null,
        'glass_thickness_mm' => $glassThicknessMm > 0 ? $glassThicknessMm : null,
        'glass_color' => $glassColor !== '' ? $glassColor : null,
        'base_unit' => $baseUnit,
        'secondary_unit' => $secondaryUnit !== '' ? $secondaryUnit : null,
        'secondary_per_base' => $secondaryUnit !== '' ? $secondaryPerBase : null,
        'notes' => app_inventory_normalize_text($payload['notes'] ?? ($current['notes'] ?? '')),
    ];
}

if ($method === 'GET') {
    $q = app_inventory_normalize_text($_GET['q'] ?? '');
    $category = app_inventory_normalize_text($_GET['category'] ?? '');
    $isActiveRaw = app_inventory_normalize_text($_GET['isActive'] ?? '');

    $where = [];
    $params = [];
    if ($q !== '') {
        $where[] = '(title LIKE :q OR COALESCE(sku, "") LIKE :q)';
        $params['q'] = '%' . $q . '%';
    }
    if ($category !== '') {
        $where[] = 'category = :category';
        $params['category'] = $category;
    }
    if ($isActiveRaw !== '') {
        $where[] = 'is_active = :is_active';
        $params['is_active'] = app_inventory_bool($isActiveRaw, true) ? 1 : 0;
    }

    $sql = 'SELECT * FROM inventory_items';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY id DESC LIMIT 500';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    app_json([
        'success' => true,
        'items' => array_map('app_inventory_item_from_row', $rows),
    ]);
}

$payload = app_read_json_body();

if ($method === 'POST') {
    $data = app_inventory_items_read_payload($payload, null);

    $insert = $pdo->prepare(
        'INSERT INTO inventory_items
         (sku, title, category, glass_width_mm, glass_height_mm, glass_thickness_mm, glass_color, base_unit, secondary_unit, secondary_per_base, notes, is_active)
         VALUES
         (:sku, :title, :category, :glass_width_mm, :glass_height_mm, :glass_thickness_mm, :glass_color, :base_unit, :secondary_unit, :secondary_per_base, :notes, 1)'
    );
    $insert->execute($data);

    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM inventory_items WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();

    app_audit_log($pdo, 'inventory.item.created', 'inventory_item', (string)$id, ['title' => $data['title']], $actor);
    app_json(['success' => true, 'item' => $row ? app_inventory_item_from_row($row) : null], 201);
}

if ($method === 'PUT') {
    $id = app_inventory_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
    }

    $currentStmt = $pdo->prepare('SELECT * FROM inventory_items WHERE id = :id LIMIT 1');
    $currentStmt->execute(['id' => $id]);
    $current = $currentStmt->fetch();
    if (!$current) {
        app_json(['success' => false, 'error' => 'Item not found.'], 404);
    }

    $data = app_inventory_items_read_payload($payload, $current);
    $data['id'] = $id;

    $update = $pdo->prepare(
        'UPDATE inventory_items
         SET sku = :sku,
             title = :title,
             category = :category,
             glass_width_mm = :glass_width_mm,
             glass_height_mm = :glass_height_mm,
             glass_thickness_mm = :glass_thickness_mm,
             glass_color = :glass_color,
             base_unit = :base_unit,
             secondary_unit = :secondary_unit,
             secondary_per_base = :secondary_per_base,
             notes = :notes,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $update->execute($data);

    $refresh = $pdo->prepare('SELECT * FROM inventory_items WHERE id = :id LIMIT 1');
    $refresh->execute(['id' => $id]);
    $row = $refresh->fetch();

    app_audit_log($pdo, 'inventory.item.updated', 'inventory_item', (string)$id, ['title' => $data['title']], $actor);
    app_json(['success' => true, 'item' => $row ? app_inventory_item_from_row($row) : null]);
}

$id = app_inventory_parse_id($payload['id'] ?? null);
if ($id === null) {
    app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
}
$isActive = app_inventory_bool($payload['isActive'] ?? true, true);

$patch = $pdo->prepare('UPDATE inventory_items SET is_active = :is_active, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
$patch->execute([
    'id' => $id,
    'is_active' => $isActive ? 1 : 0,
]);

$stmt = $pdo->prepare('SELECT * FROM inventory_items WHERE id = :id LIMIT 1');
$stmt->execute(['id' => $id]);
$row = $stmt->fetch();
if (!$row) {
    app_json(['success' => false, 'error' => 'Item not found.'], 404);
}

app_audit_log($pdo, 'inventory.item.active.changed', 'inventory_item', (string)$id, ['isActive' => $isActive], $actor);
app_json(['success' => true, 'item' => app_inventory_item_from_row($row)]);

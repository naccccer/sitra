<?php
declare(strict_types=1);

function app_inventory_v2_parse_id($value): ?int
{
    $raw = trim((string)$value);
    if ($raw === '' || !ctype_digit($raw)) {
        return null;
    }
    $id = (int)$raw;
    return $id > 0 ? $id : null;
}

function app_inventory_v2_parse_bool($value, bool $fallback = false): bool
{
    if (is_bool($value)) {
        return $value;
    }
    $raw = strtolower(trim((string)$value));
    if (in_array($raw, ['1', 'true', 'yes', 'on'], true)) {
        return true;
    }
    if (in_array($raw, ['0', 'false', 'no', 'off'], true)) {
        return false;
    }
    return $fallback;
}

function app_inventory_v2_normalize_text($value): string
{
    return trim((string)$value);
}

function app_inventory_v2_require_permission(array $actor, string $permission, PDO $pdo): void
{
    if (!app_user_has_permission($actor, $permission, $pdo)) {
        app_json(['success' => false, 'error' => 'Access denied.'], 403);
    }
}

function app_inventory_v2_parse_archive_filter(array $query): bool
{
    if (array_key_exists('includeArchived', $query)) {
        return app_inventory_v2_parse_bool($query['includeArchived'], false);
    }
    return app_inventory_v2_parse_bool($query['includeInactive'] ?? false, false);
}

function app_inventory_v2_resolve_entity_action(array $payload): string
{
    $action = app_inventory_v2_normalize_text($payload['action'] ?? '');
    if (in_array($action, ['archive', 'restore', 'delete'], true)) {
        return $action;
    }

    if (array_key_exists('isActive', $payload)) {
        return app_inventory_v2_parse_bool($payload['isActive'], true) ? 'restore' : 'archive';
    }

    return 'archive';
}

function app_inventory_v2_require_archived_for_delete(array $current, string $entityLabel): void
{
    $isActive = ((int)($current['is_active'] ?? 0)) === 1;
    if ($isActive) {
        app_json(['success' => false, 'error' => "{$entityLabel} must be archived before deletion."], 422);
    }
}

function app_inventory_v2_count_related_rows(PDO $pdo, string $sql, array $params): int
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int)$stmt->fetchColumn();
}

function app_inventory_v2_product_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'productCode' => (string)($row['product_code'] ?? ''),
        'name' => (string)($row['name'] ?? ''),
        'productType' => (string)($row['product_type'] ?? ''),
        'uom' => (string)($row['uom'] ?? ''),
        'notes' => (string)($row['notes'] ?? ''),
        'isActive' => ((int)($row['is_active'] ?? 0)) === 1,
        'isArchived' => ((int)($row['is_active'] ?? 0)) !== 1,
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

function app_inventory_v2_warehouse_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'warehouseKey' => (string)($row['warehouse_key'] ?? ''),
        'name' => (string)($row['name'] ?? ''),
        'notes' => (string)($row['notes'] ?? ''),
        'isActive' => ((int)($row['is_active'] ?? 0)) === 1,
        'isArchived' => ((int)($row['is_active'] ?? 0)) !== 1,
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

function app_inventory_v2_location_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'warehouseId' => (string)($row['warehouse_id'] ?? ''),
        'parentLocationId' => isset($row['parent_location_id']) ? (string)$row['parent_location_id'] : null,
        'locationKey' => (string)($row['location_key'] ?? ''),
        'name' => (string)($row['name'] ?? ''),
        'usageType' => (string)($row['usage_type'] ?? ''),
        'notes' => (string)($row['notes'] ?? ''),
        'isActive' => ((int)($row['is_active'] ?? 0)) === 1,
        'isArchived' => ((int)($row['is_active'] ?? 0)) !== 1,
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

function app_inventory_v2_lot_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'lotCode' => (string)($row['lot_code'] ?? ''),
        'productId' => (string)($row['product_id'] ?? ''),
        'variantId' => isset($row['variant_id']) ? (string)$row['variant_id'] : null,
        'expiryDate' => isset($row['expiry_date']) ? (string)$row['expiry_date'] : null,
        'notes' => (string)($row['notes'] ?? ''),
        'isActive' => ((int)($row['is_active'] ?? 0)) === 1,
        'isArchived' => ((int)($row['is_active'] ?? 0)) !== 1,
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

<?php
declare(strict_types=1);

function app_inventory_v2_parse_id($value): ?int
{
    return app_inventory_parse_id($value);
}

function app_inventory_v2_parse_bool($value, bool $fallback = false): bool
{
    return app_inventory_bool($value, $fallback);
}

function app_inventory_v2_normalize_text($value): string
{
    return app_inventory_normalize_text($value);
}

function app_inventory_v2_require_permission(array $actor, string $permission, PDO $pdo): void
{
    if (!app_user_has_permission($actor, $permission, $pdo)) {
        app_json(['success' => false, 'error' => 'Access denied.'], 403);
    }
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
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

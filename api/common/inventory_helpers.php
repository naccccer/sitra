<?php
declare(strict_types=1);

function app_inventory_parse_id($value): ?int
{
    $raw = trim((string)$value);
    if ($raw === '' || !ctype_digit($raw)) {
        return null;
    }
    $id = (int)$raw;
    return $id > 0 ? $id : null;
}

function app_inventory_normalize_text($value): string
{
    return trim((string)$value);
}

function app_inventory_parse_decimal($value, float $fallback = 0.0): float
{
    if (is_int($value) || is_float($value)) {
        return (float)$value;
    }
    $raw = str_replace(',', '', trim((string)$value));
    if ($raw === '' || !is_numeric($raw)) {
        return $fallback;
    }
    return (float)$raw;
}

function app_inventory_round_qty(float $value): float
{
    return round($value, 3);
}

function app_inventory_bool($value, bool $fallback = false): bool
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

function app_inventory_item_categories(): array
{
    return ['raw_glass', 'processed_glass', 'hardware', 'consumable'];
}

function app_inventory_document_types(): array
{
    return ['receipt', 'issue', 'transfer', 'adjustment'];
}

function app_inventory_count_types(): array
{
    return ['cycle', 'annual'];
}

function app_inventory_request_statuses(): array
{
    return ['pending', 'approved', 'rejected', 'cancelled'];
}

function app_inventory_user_id(?array $actor): ?int
{
    if (!is_array($actor)) {
        return null;
    }
    $id = app_inventory_parse_id($actor['id'] ?? null);
    return $id !== null ? $id : null;
}

function app_inventory_has_choice(string $value, array $choices): bool
{
    return in_array($value, $choices, true);
}

function app_inventory_generate_doc_no(): string
{
    try {
        $rand = strtoupper(bin2hex(random_bytes(4)));
    } catch (Throwable $e) {
        $rand = strtoupper(substr((string)md5((string)microtime(true)), 0, 8));
    }
    return 'INV-' . date('Ymd') . '-' . $rand;
}

function app_inventory_warehouse_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'key' => (string)($row['warehouse_key'] ?? ''),
        'name' => (string)($row['name'] ?? ''),
        'flowType' => (string)($row['flow_type'] ?? ''),
        'isActive' => ((int)($row['is_active'] ?? 0)) === 1,
    ];
}

function app_inventory_item_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'sku' => (string)($row['sku'] ?? ''),
        'title' => (string)($row['title'] ?? ''),
        'category' => (string)($row['category'] ?? ''),
        'glassWidthMm' => isset($row['glass_width_mm']) ? (float)$row['glass_width_mm'] : null,
        'glassHeightMm' => isset($row['glass_height_mm']) ? (float)$row['glass_height_mm'] : null,
        'glassThicknessMm' => isset($row['glass_thickness_mm']) ? (float)$row['glass_thickness_mm'] : null,
        'glassColor' => (string)($row['glass_color'] ?? ''),
        'baseUnit' => (string)($row['base_unit'] ?? ''),
        'secondaryUnit' => (string)($row['secondary_unit'] ?? ''),
        'secondaryPerBase' => isset($row['secondary_per_base']) ? (float)$row['secondary_per_base'] : null,
        'notes' => (string)($row['notes'] ?? ''),
        'isActive' => ((int)($row['is_active'] ?? 0)) === 1,
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

function app_inventory_document_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'docNo' => (string)($row['doc_no'] ?? ''),
        'docType' => (string)($row['doc_type'] ?? ''),
        'status' => (string)($row['status'] ?? ''),
        'sourceWarehouseId' => isset($row['source_warehouse_id']) ? (string)$row['source_warehouse_id'] : null,
        'targetWarehouseId' => isset($row['target_warehouse_id']) ? (string)$row['target_warehouse_id'] : null,
        'referenceType' => (string)($row['reference_type'] ?? ''),
        'referenceId' => (string)($row['reference_id'] ?? ''),
        'referenceCode' => (string)($row['reference_code'] ?? ''),
        'notes' => (string)($row['notes'] ?? ''),
        'createdByUserId' => isset($row['created_by_user_id']) ? (string)$row['created_by_user_id'] : null,
        'approvedByUserId' => isset($row['approved_by_user_id']) ? (string)$row['approved_by_user_id'] : null,
        'postedAt' => app_format_order_timestamp($row['posted_at'] ?? null),
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

function app_inventory_document_line_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'documentId' => (string)($row['document_id'] ?? ''),
        'itemId' => (string)($row['item_id'] ?? ''),
        'quantityBase' => (float)($row['quantity_base'] ?? 0),
        'quantitySecondary' => (float)($row['quantity_secondary'] ?? 0),
        'unitPrice' => isset($row['unit_price']) ? (int)$row['unit_price'] : null,
        'notes' => (string)($row['notes'] ?? ''),
    ];
}

function app_inventory_request_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'status' => (string)($row['status'] ?? ''),
        'warehouseId' => (string)($row['warehouse_id'] ?? ''),
        'itemId' => (string)($row['item_id'] ?? ''),
        'quantityBase' => (float)($row['quantity_base'] ?? 0),
        'quantitySecondary' => (float)($row['quantity_secondary'] ?? 0),
        'requestNotes' => (string)($row['request_notes'] ?? ''),
        'resolutionNotes' => (string)($row['resolution_notes'] ?? ''),
        'requestedByUserId' => isset($row['requested_by_user_id']) ? (string)$row['requested_by_user_id'] : null,
        'approvedByUserId' => isset($row['approved_by_user_id']) ? (string)$row['approved_by_user_id'] : null,
        'documentId' => isset($row['document_id']) ? (string)$row['document_id'] : null,
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

function app_inventory_count_session_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'warehouseId' => (string)($row['warehouse_id'] ?? ''),
        'countType' => (string)($row['count_type'] ?? ''),
        'status' => (string)($row['status'] ?? ''),
        'startedByUserId' => isset($row['started_by_user_id']) ? (string)$row['started_by_user_id'] : null,
        'closedByUserId' => isset($row['closed_by_user_id']) ? (string)$row['closed_by_user_id'] : null,
        'notes' => (string)($row['notes'] ?? ''),
        'startedAt' => app_format_order_timestamp($row['started_at'] ?? null),
        'closedAt' => app_format_order_timestamp($row['closed_at'] ?? null),
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

function app_inventory_count_line_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'sessionId' => (string)($row['session_id'] ?? ''),
        'itemId' => (string)($row['item_id'] ?? ''),
        'systemQuantityBase' => (float)($row['system_quantity_base'] ?? 0),
        'systemQuantitySecondary' => (float)($row['system_quantity_secondary'] ?? 0),
        'countedQuantityBase' => (float)($row['counted_quantity_base'] ?? 0),
        'countedQuantitySecondary' => (float)($row['counted_quantity_secondary'] ?? 0),
        'diffQuantityBase' => (float)($row['diff_quantity_base'] ?? 0),
        'diffQuantitySecondary' => (float)($row['diff_quantity_secondary'] ?? 0),
        'adjustmentDocumentId' => isset($row['adjustment_document_id']) ? (string)$row['adjustment_document_id'] : null,
        'notes' => (string)($row['notes'] ?? ''),
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

function app_inventory_open_count_session(PDO $pdo, int $warehouseId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM inventory_count_sessions WHERE warehouse_id = :warehouse_id AND status = :status ORDER BY id DESC LIMIT 1'
    );
    $stmt->execute([
        'warehouse_id' => $warehouseId,
        'status' => 'open',
    ]);
    $row = $stmt->fetch();
    return $row ?: null;
}

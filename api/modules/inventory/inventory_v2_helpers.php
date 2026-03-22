<?php
declare(strict_types=1);

/**
 * Inventory v2 module helpers.
 *
 * Single source of truth for:
 *   - operation header SELECT SQL shape
 *   - line insertion
 *   - valid statuses
 *   - lifecycle transitions
 *   - creation-payload validation
 *
 * Depends on api/common/inventory_v2_operations.php (for app_inventory_v2_*).
 * Depends on api/_common.php being loaded by the adapter before this file
 * is required (supplies app_inventory_v2_parse_id / app_inventory_v2_normalize_text).
 */

require_once __DIR__ . '/../../common/inventory_v2_operations.php';

// ─── SQL fragment ─────────────────────────────────────────────────────────────

/**
 * Base SELECT used by both the single-record fetch and the paginated list.
 * Column aliases match app_inventory_v2_operation_header_from_row exactly.
 */
function inv_v2_op_base_select_sql(): string
{
    return 'SELECT h.*,
                   sw.name AS source_warehouse_name,
                   tw.name AS target_warehouse_name,
                   u.username AS created_by_username,
                   (SELECT COUNT(*) FROM inventory_v2_operation_lines l
                    WHERE l.operation_id = h.id) AS line_count
            FROM inventory_v2_operation_headers h
            LEFT JOIN inventory_v2_warehouses sw ON sw.id = h.source_warehouse_id
            LEFT JOIN inventory_v2_warehouses tw ON tw.id = h.target_warehouse_id
            LEFT JOIN users u ON u.id = h.created_by_user_id';
}

// ─── Record fetch ─────────────────────────────────────────────────────────────

function inv_v2_op_fetch(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare(inv_v2_op_base_select_sql() . ' WHERE h.id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ? app_inventory_v2_operation_header_from_row($row) : null;
}

// ─── Line insertion ───────────────────────────────────────────────────────────

function inv_v2_op_insert_lines(PDO $pdo, int $opId, array $lines): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO inventory_v2_operation_lines
         (operation_id, product_id, variant_id, lot_id, source_location_id,
          target_location_id, quantity_requested, quantity_done, uom, notes)
         VALUES (:op_id,:pid,:vid,:lot_id,:src_loc,:tgt_loc,:qty_req,:qty_done,:uom,:notes)'
    );
    foreach ($lines as $line) {
        $stmt->execute([
            'op_id'    => $opId,
            'pid'      => (int)($line['productId'] ?? 0),
            'vid'      => app_inventory_v2_parse_id($line['variantId'] ?? null),
            'lot_id'   => app_inventory_v2_parse_id($line['lotId'] ?? null),
            'src_loc'  => app_inventory_v2_parse_id($line['sourceLocationId'] ?? null),
            'tgt_loc'  => app_inventory_v2_parse_id($line['targetLocationId'] ?? null),
            'qty_req'  => (float)($line['quantityRequested'] ?? 0),
            'qty_done' => (float)($line['quantityDone'] ?? $line['quantityRequested'] ?? 0),
            'uom'      => app_inventory_v2_normalize_text($line['uom'] ?? ''),
            'notes'    => app_inventory_v2_normalize_text($line['notes'] ?? '') ?: null,
        ]);
    }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

/**
 * Canonical set of statuses an operation header can hold.
 */
function inv_v2_op_valid_statuses(): array
{
    return ['draft', 'submitted', 'approved', 'posted', 'cancelled'];
}

/**
 * Allowed state-machine transitions triggered by client actions.
 * The 'post' action is handled separately (delegates to app_inventory_v2_post_operation).
 */
function inv_v2_op_transitions(): array
{
    return [
        'submit'  => ['from' => 'draft',     'to' => 'submitted', 'roles' => ['admin', 'manager']],
        'approve' => ['from' => 'submitted', 'to' => 'approved',  'roles' => ['admin', 'manager']],
        'cancel'  => ['from' => null,        'to' => 'cancelled', 'roles' => ['admin', 'manager']],
    ];
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates the fields required to create a new operation header.
 *
 * Returns a human-readable error string on failure, null on success.
 * Validation rules are intentionally kept in sync with inv_v2_op_insert_lines
 * and app_inventory_v2_post_operation warehouse requirements.
 */
function inv_v2_op_validate_create_payload(
    string $opType,
    ?int   $srcWid,
    ?int   $tgtWid,
    array  $lines
): ?string {
    if (!in_array($opType, app_inventory_v2_valid_operation_types(), true)) {
        return 'Valid operationType is required.';
    }
    if (in_array($opType, ['delivery', 'transfer'], true) && !$srcWid) {
        return 'sourceWarehouseId required for delivery/transfer.';
    }
    if (in_array($opType, ['receipt', 'transfer', 'adjustment'], true) && !$tgtWid) {
        return 'targetWarehouseId required for receipt/transfer/adjustment.';
    }
    if (empty($lines)) {
        return 'At least one line is required.';
    }
    return null;
}

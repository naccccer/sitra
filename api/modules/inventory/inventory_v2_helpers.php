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

// ─── Raw record load ──────────────────────────────────────────────────────────

/**
 * Loads a raw operation header row (SELECT *) for guard use.
 * Returns null if not found.
 */
function inv_v2_op_load_raw(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM inventory_v2_operation_headers WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of operations with total count.
 * Result: ['operations' => array, 'total' => int, 'page' => int, 'pageSize' => int]
 */
function inv_v2_op_list(
    PDO    $pdo,
    string $opType,
    string $status,
    string $q,
    int    $page,
    int    $pageSize,
    string $sortBy,
    string $sortDir
): array {
    $where  = [];
    $params = [];
    if ($opType !== '' && in_array($opType, app_inventory_v2_valid_operation_types(), true)) {
        $where[]           = 'h.operation_type = :op_type';
        $params['op_type'] = $opType;
    }
    if ($status !== '' && in_array($status, inv_v2_op_valid_statuses(), true)) {
        $where[]          = 'h.status = :status';
        $params['status'] = $status;
    }
    if ($q !== '') {
        $where[]     = '(h.operation_no LIKE :q OR h.reference_code LIKE :q)';
        $params['q'] = '%' . $q . '%';
    }
    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $offset   = ($page - 1) * $pageSize;

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM inventory_v2_operation_headers h {$whereSql}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $sql  = inv_v2_op_base_select_sql()
          . " {$whereSql} ORDER BY h.{$sortBy} {$sortDir} LIMIT {$pageSize} OFFSET {$offset}";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    return [
        'operations' => array_map('app_inventory_v2_operation_header_from_row', $rows),
        'total'      => $total,
        'page'       => $page,
        'pageSize'   => $pageSize,
    ];
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Generates operation number, inserts header + lines in a transaction.
 * Returns ['id' => int, 'operationNo' => string] on success.
 * Throws RuntimeException on failure (caller should catch and map to HTTP error).
 */
function inv_v2_op_create(PDO $pdo, array $payload, array $actor): array
{
    $opType  = app_inventory_v2_normalize_text($payload['operationType'] ?? '');
    $srcWid  = app_inventory_v2_parse_id($payload['sourceWarehouseId'] ?? null);
    $tgtWid  = app_inventory_v2_parse_id($payload['targetWarehouseId'] ?? null);
    $lines   = array_values(array_filter((array)($payload['lines'] ?? []), 'is_array'));
    $notes   = app_inventory_v2_normalize_text($payload['notes'] ?? '');
    $refType = app_inventory_v2_normalize_text($payload['referenceType'] ?? '');
    $refId   = app_inventory_v2_normalize_text($payload['referenceId'] ?? '');
    $refCode = app_inventory_v2_normalize_text($payload['referenceCode'] ?? '');

    $operationNo = app_inventory_v2_generate_operation_no($pdo, $opType);
    $pdo->beginTransaction();
    try {
        $ins = $pdo->prepare(
            'INSERT INTO inventory_v2_operation_headers
             (operation_no, operation_type, status, source_warehouse_id, target_warehouse_id,
              reference_type, reference_id, reference_code, notes, created_by_user_id)
             VALUES (:op_no,:op_type,:status,:src_wid,:tgt_wid,:ref_type,:ref_id,:ref_code,:notes,:created_by)'
        );
        $ins->execute([
            'op_no'      => $operationNo,
            'op_type'    => $opType,
            'status'     => 'draft',
            'src_wid'    => $srcWid,
            'tgt_wid'    => $tgtWid,
            'ref_type'   => $refType !== '' ? $refType : null,
            'ref_id'     => $refId !== '' ? $refId : null,
            'ref_code'   => $refCode !== '' ? $refCode : null,
            'notes'      => $notes !== '' ? $notes : null,
            'created_by' => (int)$actor['id'],
        ]);
        $operationId = (int)$pdo->lastInsertId();
        inv_v2_op_insert_lines($pdo, $operationId, $lines);
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        throw new RuntimeException('Failed to create operation.');
    }

    return ['id' => $operationId, 'operationNo' => $operationNo];
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Updates notes/referenceCode and optionally replaces lines in a transaction.
 * Throws RuntimeException on failure.
 */
function inv_v2_op_update(PDO $pdo, int $id, array $existingOp, array $payload): void
{
    $notes   = app_inventory_v2_normalize_text($payload['notes'] ?? $existingOp['notes'] ?? '');
    $refCode = app_inventory_v2_normalize_text($payload['referenceCode'] ?? $existingOp['reference_code'] ?? '');
    $lines   = array_values(array_filter((array)($payload['lines'] ?? []), 'is_array'));

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare(
            'UPDATE inventory_v2_operation_headers
             SET notes = :notes, reference_code = :ref_code, updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $upd->execute(['notes' => $notes ?: null, 'ref_code' => $refCode ?: null, 'id' => $id]);
        if (!empty($lines)) {
            $pdo->prepare('DELETE FROM inventory_v2_operation_lines WHERE operation_id = :id')->execute(['id' => $id]);
            inv_v2_op_insert_lines($pdo, $id, $lines);
        }
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        throw new RuntimeException('Failed to update operation.');
    }
}

// ─── Status update ────────────────────────────────────────────────────────────

/**
 * Persists a status change on an operation header (no lifecycle guard — caller is responsible).
 */
function inv_v2_op_set_status(PDO $pdo, int $id, string $status): void
{
    $pdo->prepare('UPDATE inventory_v2_operation_headers SET status = :status WHERE id = :id')
        ->execute(['status' => $status, 'id' => $id]);
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

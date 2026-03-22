<?php
declare(strict_types=1);

function app_inventory_v2_operation_header_from_row(array $row): array
{
    return [
        'id'                  => (string)($row['id'] ?? ''),
        'operationNo'         => (string)($row['operation_no'] ?? ''),
        'operationType'       => (string)($row['operation_type'] ?? ''),
        'status'              => (string)($row['status'] ?? ''),
        'sourceWarehouseId'   => isset($row['source_warehouse_id']) ? (string)$row['source_warehouse_id'] : null,
        'targetWarehouseId'   => isset($row['target_warehouse_id']) ? (string)$row['target_warehouse_id'] : null,
        'referenceType'       => (string)($row['reference_type'] ?? ''),
        'referenceId'         => (string)($row['reference_id'] ?? ''),
        'referenceCode'       => (string)($row['reference_code'] ?? ''),
        'notes'               => (string)($row['notes'] ?? ''),
        'createdByUserId'     => isset($row['created_by_user_id']) ? (string)$row['created_by_user_id'] : null,
        'approvedByUserId'    => isset($row['approved_by_user_id']) ? (string)$row['approved_by_user_id'] : null,
        'postedAt'            => $row['posted_at'] ?? null,
        'createdAt'           => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt'           => app_format_order_timestamp($row['updated_at'] ?? null),
        'sourceWarehouseName' => (string)($row['source_warehouse_name'] ?? ''),
        'targetWarehouseName' => (string)($row['target_warehouse_name'] ?? ''),
        'createdByUsername'   => (string)($row['created_by_username'] ?? ''),
        'lineCount'           => (int)($row['line_count'] ?? 0),
    ];
}

function app_inventory_v2_operation_line_from_row(array $row): array
{
    return [
        'id'                => (string)($row['id'] ?? ''),
        'operationId'       => (string)($row['operation_id'] ?? ''),
        'productId'         => (string)($row['product_id'] ?? ''),
        'variantId'         => isset($row['variant_id']) ? (string)$row['variant_id'] : null,
        'lotId'             => isset($row['lot_id']) ? (string)$row['lot_id'] : null,
        'sourceLocationId'  => isset($row['source_location_id']) ? (string)$row['source_location_id'] : null,
        'targetLocationId'  => isset($row['target_location_id']) ? (string)$row['target_location_id'] : null,
        'quantityRequested' => (float)($row['quantity_requested'] ?? 0),
        'quantityDone'      => (float)($row['quantity_done'] ?? 0),
        'uom'               => (string)($row['uom'] ?? ''),
        'notes'             => (string)($row['notes'] ?? ''),
        'productName'       => (string)($row['product_name'] ?? ''),
    ];
}

function app_inventory_v2_valid_operation_types(): array
{
    return ['receipt', 'delivery', 'transfer', 'production_move', 'production_consume', 'production_output', 'adjustment', 'count'];
}

function app_inventory_v2_generate_operation_no(PDO $pdo, string $type): string
{
    $prefixes = [
        'receipt'            => 'REC',
        'delivery'           => 'DEL',
        'transfer'           => 'TRF',
        'production_move'    => 'PRD',
        'production_consume' => 'PCO',
        'production_output'  => 'POU',
        'adjustment'         => 'ADJ',
        'count'              => 'CNT',
    ];
    $prefix = $prefixes[$type] ?? 'OPR';
    $today = date('Ymd');
    $pattern = $prefix . '-' . $today . '-%';
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM inventory_v2_operation_headers WHERE operation_no LIKE :pattern'
    );
    $stmt->execute(['pattern' => $pattern]);
    $seq = (int)$stmt->fetchColumn() + 1;
    return $prefix . '-' . $today . '-' . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
}

function app_inventory_v2_get_available_qty(
    PDO $pdo,
    int $productId,
    ?int $variantId,
    int $warehouseId,
    int $locationId,
    ?int $lotId,
    bool $onHandOnly = false
): float {
    $expr = $onHandOnly
        ? 'COALESCE(quantity_on_hand, 0)'
        : 'COALESCE(quantity_on_hand, 0) - COALESCE(quantity_reserved, 0)';
    $sql = "SELECT {$expr} FROM inventory_v2_quants
            WHERE product_id = :pid AND warehouse_id = :wid AND location_id = :lid";
    $params = ['pid' => $productId, 'wid' => $warehouseId, 'lid' => $locationId];
    $sql .= $variantId !== null ? ' AND variant_id = :vid' : ' AND variant_id IS NULL';
    if ($variantId !== null) {
        $params['vid'] = $variantId;
    }
    $sql .= $lotId !== null ? ' AND lot_id = :lot_id' : ' AND lot_id IS NULL';
    if ($lotId !== null) {
        $params['lot_id'] = $lotId;
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (float)($stmt->fetchColumn() ?: 0);
}

function app_inventory_v2_adjust_quant(
    PDO $pdo,
    int $productId,
    ?int $variantId,
    int $warehouseId,
    int $locationId,
    ?int $lotId,
    float $delta
): void {
    $sql = 'SELECT id FROM inventory_v2_quants
            WHERE product_id = :pid AND warehouse_id = :wid AND location_id = :lid';
    $params = ['pid' => $productId, 'wid' => $warehouseId, 'lid' => $locationId];
    $sql .= $variantId !== null ? ' AND variant_id = :vid' : ' AND variant_id IS NULL';
    if ($variantId !== null) {
        $params['vid'] = $variantId;
    }
    $sql .= $lotId !== null ? ' AND lot_id = :lot_id' : ' AND lot_id IS NULL';
    if ($lotId !== null) {
        $params['lot_id'] = $lotId;
    }
    $stmt = $pdo->prepare($sql . ' FOR UPDATE');
    $stmt->execute($params);
    $row = $stmt->fetch();
    if ($row) {
        $upd = $pdo->prepare(
            'UPDATE inventory_v2_quants SET quantity_on_hand = quantity_on_hand + :delta WHERE id = :id'
        );
        $upd->execute(['delta' => $delta, 'id' => $row['id']]);
    } else {
        $ins = $pdo->prepare(
            'INSERT INTO inventory_v2_quants
             (product_id, variant_id, warehouse_id, location_id, lot_id, quantity_on_hand)
             VALUES (:pid, :vid, :wid, :lid, :lot_id, :qty)'
        );
        $ins->execute([
            'pid'    => $productId,
            'vid'    => $variantId,
            'wid'    => $warehouseId,
            'lid'    => $locationId,
            'lot_id' => $lotId,
            'qty'    => $delta,
        ]);
    }
}

function app_inventory_v2_write_ledger(PDO $pdo, array $p): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO inventory_v2_stock_ledger
         (operation_id, operation_line_id, movement_type, product_id, variant_id, lot_id,
          warehouse_id, location_id, quantity_on_hand_delta, reference_type, reference_id,
          reference_code, actor_user_id)
         VALUES (:op_id, :line_id, :mv_type, :pid, :vid, :lot_id,
                 :wid, :lid, :qty_delta, :ref_type, :ref_id, :ref_code, :actor_id)'
    );
    $stmt->execute([
        'op_id'    => $p['operation_id'],
        'line_id'  => $p['line_id'],
        'mv_type'  => $p['movement_type'],
        'pid'      => $p['product_id'],
        'vid'      => $p['variant_id'] ?? null,
        'lot_id'   => $p['lot_id'] ?? null,
        'wid'      => $p['warehouse_id'],
        'lid'      => $p['location_id'],
        'qty_delta' => $p['qty_delta'],
        'ref_type' => $p['ref_type'] ?? null,
        'ref_id'   => $p['ref_id'] ?? null,
        'ref_code' => $p['ref_code'] ?? null,
        'actor_id' => $p['actor_id'] ?? null,
    ]);
}

function app_inventory_v2_post_operation(PDO $pdo, int $operationId, array $actor): array
{
    $pdo->beginTransaction();
    try {
        $hdrStmt = $pdo->prepare(
            'SELECT * FROM inventory_v2_operation_headers WHERE id = :id FOR UPDATE'
        );
        $hdrStmt->execute(['id' => $operationId]);
        $op = $hdrStmt->fetch();
        if (!$op) {
            throw new RuntimeException('Operation not found.');
        }
        if ($op['status'] !== 'approved') {
            throw new RuntimeException('Only approved operations can be posted.');
        }

        $lineStmt = $pdo->prepare(
            'SELECT * FROM inventory_v2_operation_lines WHERE operation_id = :id'
        );
        $lineStmt->execute(['id' => $operationId]);
        $lines = $lineStmt->fetchAll() ?: [];
        if (empty($lines)) {
            throw new RuntimeException('Operation has no lines.');
        }

        $opType  = (string)$op['operation_type'];
        $actorId = (int)$actor['id'];
        $refType = (string)($op['reference_type'] ?? '');
        $refId   = (string)($op['reference_id'] ?? '');
        $refCode = (string)($op['reference_code'] ?? '');

        // Pre-validate no-negative stock before any mutations
        foreach ($lines as $line) {
            $qty   = (float)$line['quantity_done'];
            $pid   = (int)$line['product_id'];
            $vid   = $line['variant_id'] !== null ? (int)$line['variant_id'] : null;
            $lid   = $line['lot_id'] !== null ? (int)$line['lot_id'] : null;
            if (in_array($opType, ['delivery', 'transfer', 'production_consume'], true)) {
                $wid   = (int)$op['source_warehouse_id'];
                $locId = (int)$line['source_location_id'];
                if (!$locId || !$wid) {
                    throw new RuntimeException("Source location required for {$opType}.");
                }
                $avail = app_inventory_v2_get_available_qty($pdo, $pid, $vid, $wid, $locId, $lid);
                if ($avail < $qty - 0.0005 && $opType === 'delivery' && $refType !== '' && $refId !== '') {
                    $rs = $pdo->prepare('SELECT 1 FROM inventory_v2_reservations WHERE product_id=:p AND warehouse_id=:w AND location_id=:l AND status=\'active\' AND reference_type=:rt AND reference_id=:ri LIMIT 1');
                    $rs->execute(['p' => $pid, 'w' => $wid, 'l' => $locId, 'rt' => $refType, 'ri' => $refId]);
                    if ($rs->fetchColumn()) {
                        $avail = app_inventory_v2_get_available_qty($pdo, $pid, $vid, $wid, $locId, $lid, true);
                    }
                }
                if ($avail < $qty - 0.0005) {
                    throw new RuntimeException("Insufficient stock for product_id={$pid}. Available: {$avail}, Requested: {$qty}.");
                }
            } elseif ($opType === 'adjustment' && $qty < 0) {
                $wid   = (int)$op['target_warehouse_id'];
                $locId = (int)$line['target_location_id'];
                $avail = app_inventory_v2_get_available_qty($pdo, $pid, $vid, $wid, $locId, $lid);
                if ($avail < abs($qty) - 0.0005) {
                    throw new RuntimeException("Insufficient stock for adjustment product_id={$pid}.");
                }
            }
        }

        // Apply stock mutations
        foreach ($lines as $line) {
            $qty    = (float)$line['quantity_done'];
            $pid    = (int)$line['product_id'];
            $vid    = $line['variant_id'] !== null ? (int)$line['variant_id'] : null;
            $lid    = $line['lot_id'] !== null ? (int)$line['lot_id'] : null;
            $lineId = (int)$line['id'];
            $base   = ['operation_id' => $operationId, 'line_id' => $lineId, 'product_id' => $pid, 'variant_id' => $vid, 'lot_id' => $lid, 'ref_type' => $refType, 'ref_id' => $refId, 'ref_code' => $refCode, 'actor_id' => $actorId];

            if ($opType === 'receipt') {
                $tWid = (int)$op['target_warehouse_id'];
                $tLoc = (int)$line['target_location_id'];
                app_inventory_v2_adjust_quant($pdo, $pid, $vid, $tWid, $tLoc, $lid, $qty);
                app_inventory_v2_write_ledger($pdo, $base + ['movement_type' => 'in', 'warehouse_id' => $tWid, 'location_id' => $tLoc, 'qty_delta' => $qty]);
            } elseif ($opType === 'delivery') {
                $sWid = (int)$op['source_warehouse_id'];
                $sLoc = (int)$line['source_location_id'];
                app_inventory_v2_adjust_quant($pdo, $pid, $vid, $sWid, $sLoc, $lid, -$qty);
                app_inventory_v2_write_ledger($pdo, $base + ['movement_type' => 'out', 'warehouse_id' => $sWid, 'location_id' => $sLoc, 'qty_delta' => -$qty]);
                app_inventory_v2_try_fulfill_reservation($pdo, $pid, $vid, $sWid, $sLoc, $lid, $qty, $refType, $refId, $actorId, $operationId);
            } elseif ($opType === 'transfer') {
                $sWid = (int)$op['source_warehouse_id'];
                $sLoc = (int)$line['source_location_id'];
                $tWid = (int)$op['target_warehouse_id'];
                $tLoc = (int)$line['target_location_id'];
                app_inventory_v2_adjust_quant($pdo, $pid, $vid, $sWid, $sLoc, $lid, -$qty);
                app_inventory_v2_write_ledger($pdo, $base + ['movement_type' => 'out', 'warehouse_id' => $sWid, 'location_id' => $sLoc, 'qty_delta' => -$qty]);
                app_inventory_v2_adjust_quant($pdo, $pid, $vid, $tWid, $tLoc, $lid, $qty);
                app_inventory_v2_write_ledger($pdo, $base + ['movement_type' => 'in', 'warehouse_id' => $tWid, 'location_id' => $tLoc, 'qty_delta' => $qty]);
            } elseif ($opType === 'adjustment') {
                $tWid   = (int)$op['target_warehouse_id'];
                $tLoc   = (int)$line['target_location_id'];
                $mvType = $qty >= 0 ? 'in' : 'out';
                app_inventory_v2_adjust_quant($pdo, $pid, $vid, $tWid, $tLoc, $lid, $qty);
                app_inventory_v2_write_ledger($pdo, $base + ['movement_type' => $mvType, 'warehouse_id' => $tWid, 'location_id' => $tLoc, 'qty_delta' => $qty]);
            } elseif ($opType === 'production_consume') {
                $sWid = (int)$op['source_warehouse_id'];
                $sLoc = (int)$line['source_location_id'];
                app_inventory_v2_adjust_quant($pdo, $pid, $vid, $sWid, $sLoc, $lid, -$qty);
                app_inventory_v2_write_ledger($pdo, $base + ['movement_type' => 'out', 'warehouse_id' => $sWid, 'location_id' => $sLoc, 'qty_delta' => -$qty]);
            } elseif ($opType === 'production_output') {
                $tWid = (int)$op['target_warehouse_id'];
                $tLoc = (int)$line['target_location_id'];
                app_inventory_v2_adjust_quant($pdo, $pid, $vid, $tWid, $tLoc, $lid, $qty);
                app_inventory_v2_write_ledger($pdo, $base + ['movement_type' => 'in', 'warehouse_id' => $tWid, 'location_id' => $tLoc, 'qty_delta' => $qty]);
            }
        }

        $updStmt = $pdo->prepare(
            'UPDATE inventory_v2_operation_headers
             SET status = :status, posted_at = CURRENT_TIMESTAMP, approved_by_user_id = :approved_by
             WHERE id = :id'
        );
        $updStmt->execute(['status' => 'posted', 'approved_by' => $actorId, 'id' => $operationId]);

        $pdo->commit();
        return ['success' => true];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['success' => false, 'error' => $e->getMessage(), 'code' => 422];
    }
}

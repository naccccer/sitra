<?php
declare(strict_types=1);

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

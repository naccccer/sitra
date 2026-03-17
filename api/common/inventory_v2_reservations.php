<?php
declare(strict_types=1);

function app_inventory_v2_reservation_from_row(array $row): array
{
    return [
        'id'               => (string)($row['id'] ?? ''),
        'reservationNo'    => (string)($row['reservation_no'] ?? ''),
        'productId'        => (string)($row['product_id'] ?? ''),
        'variantId'        => isset($row['variant_id']) ? (string)$row['variant_id'] : null,
        'lotId'            => isset($row['lot_id']) ? (string)$row['lot_id'] : null,
        'warehouseId'      => (string)($row['warehouse_id'] ?? ''),
        'locationId'       => (string)($row['location_id'] ?? ''),
        'quantityReserved' => (float)($row['quantity_reserved'] ?? 0),
        'status'           => (string)($row['status'] ?? ''),
        'referenceType'    => (string)($row['reference_type'] ?? ''),
        'referenceId'      => (string)($row['reference_id'] ?? ''),
        'referenceCode'    => (string)($row['reference_code'] ?? ''),
        'operationId'      => isset($row['operation_id']) ? (string)$row['operation_id'] : null,
        'notes'            => (string)($row['notes'] ?? ''),
        'createdByUserId'  => isset($row['created_by_user_id']) ? (string)$row['created_by_user_id'] : null,
        'createdAt'        => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt'        => app_format_order_timestamp($row['updated_at'] ?? null),
        'productName'      => (string)($row['product_name'] ?? ''),
        'warehouseName'    => (string)($row['warehouse_name'] ?? ''),
    ];
}

function app_inventory_v2_generate_reservation_no(PDO $pdo): string
{
    $prefix  = 'RSV';
    $today   = date('Ymd');
    $pattern = $prefix . '-' . $today . '-%';
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM inventory_v2_reservations WHERE reservation_no LIKE :pattern'
    );
    $stmt->execute(['pattern' => $pattern]);
    $seq = (int)$stmt->fetchColumn() + 1;
    return $prefix . '-' . $today . '-' . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
}

function app_inventory_v2_adjust_reserved(
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
        $pdo->prepare(
            'UPDATE inventory_v2_quants
             SET quantity_reserved = GREATEST(0, quantity_reserved + :delta)
             WHERE id = :id'
        )->execute(['delta' => $delta, 'id' => $row['id']]);
    } elseif ($delta > 0) {
        $pdo->prepare(
            'INSERT INTO inventory_v2_quants
             (product_id, variant_id, warehouse_id, location_id, lot_id, quantity_reserved)
             VALUES (:pid, :vid, :wid, :lid, :lot_id, :qty)'
        )->execute([
            'pid'    => $productId,
            'vid'    => $variantId,
            'wid'    => $warehouseId,
            'lid'    => $locationId,
            'lot_id' => $lotId,
            'qty'    => $delta,
        ]);
    }
}

function app_inventory_v2_try_fulfill_reservation(
    PDO $pdo,
    int $productId,
    ?int $variantId,
    int $warehouseId,
    int $locationId,
    ?int $lotId,
    float $qty,
    string $refType,
    string $refId,
    int $actorId,
    int $operationId
): void {
    if ($refType === '' || $refId === '') {
        return;
    }
    $stmt = $pdo->prepare(
        'SELECT id, quantity_reserved FROM inventory_v2_reservations
         WHERE product_id = :p AND warehouse_id = :w AND location_id = :l
           AND status = \'active\' AND reference_type = :rt AND reference_id = :ri
         ORDER BY created_at ASC LIMIT 1 FOR UPDATE'
    );
    $stmt->execute(['p' => $productId, 'w' => $warehouseId, 'l' => $locationId, 'rt' => $refType, 'ri' => $refId]);
    $res = $stmt->fetch();
    if (!$res) {
        return;
    }
    $resQty = (float)$res['quantity_reserved'];
    $pdo->prepare(
        'UPDATE inventory_v2_reservations
         SET status = \'fulfilled\', updated_at = CURRENT_TIMESTAMP WHERE id = :id'
    )->execute(['id' => $res['id']]);
    app_inventory_v2_adjust_reserved($pdo, $productId, $variantId, $warehouseId, $locationId, $lotId, -$resQty);
    app_inventory_v2_write_ledger($pdo, [
        'operation_id'  => $operationId,
        'line_id'       => null,
        'movement_type' => 'release',
        'product_id'    => $productId,
        'variant_id'    => $variantId,
        'lot_id'        => $lotId,
        'warehouse_id'  => $warehouseId,
        'location_id'   => $locationId,
        'qty_delta'     => -$resQty,
        'ref_type'      => $refType,
        'ref_id'        => $refId,
        'ref_code'      => null,
        'actor_id'      => $actorId,
    ]);
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/../_common.php';

function app_inventory_ensure_tables(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_items (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            sku VARCHAR(80) NOT NULL,
            title VARCHAR(200) NOT NULL,
            material_type VARCHAR(80) NOT NULL DEFAULT 'glass',
            thickness_mm DECIMAL(6,2) NULL,
            color VARCHAR(80) NULL,
            unit ENUM('sheet','sqm','piece','kg') NOT NULL DEFAULT 'piece',
            reorder_point DECIMAL(14,3) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_items_sku (sku),
            KEY idx_inventory_items_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_stock_reservations (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            reservation_code VARCHAR(64) NOT NULL,
            item_id BIGINT UNSIGNED NOT NULL,
            order_line_id BIGINT UNSIGNED NULL,
            order_row_key VARCHAR(64) NULL,
            work_order_id BIGINT UNSIGNED NULL,
            qty_reserved DECIMAL(14,3) NOT NULL,
            qty_released DECIMAL(14,3) NOT NULL DEFAULT 0,
            qty_consumed DECIMAL(14,3) NOT NULL DEFAULT 0,
            status ENUM('active','released','consumed','cancelled') NOT NULL DEFAULT 'active',
            note VARCHAR(500) NULL,
            created_by_user_id INT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_reservation_code (reservation_code),
            KEY idx_inventory_reservations_item (item_id),
            KEY idx_inventory_reservations_status (status),
            KEY idx_inventory_reservations_order_line (order_line_id),
            KEY idx_inventory_reservations_order_row_key (order_row_key),
            KEY idx_inventory_reservations_work_order (work_order_id),
            CONSTRAINT fk_inventory_reservations_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_reservations_order_line FOREIGN KEY (order_line_id) REFERENCES order_lines (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_reservations_work_order FOREIGN KEY (work_order_id) REFERENCES production_work_orders (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_reservations_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_stock_ledger (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            item_id BIGINT UNSIGNED NOT NULL,
            movement_type ENUM('in','out','adjust_plus','adjust_minus','reserve','release','consume') NOT NULL,
            qty_delta DECIMAL(14,3) NOT NULL,
            balance_after DECIMAL(14,3) NULL,
            reference_type VARCHAR(40) NULL,
            reference_id VARCHAR(80) NULL,
            reservation_id BIGINT UNSIGNED NULL,
            order_line_id BIGINT UNSIGNED NULL,
            order_row_key VARCHAR(64) NULL,
            work_order_id BIGINT UNSIGNED NULL,
            note VARCHAR(500) NULL,
            actor_user_id INT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_inventory_ledger_item_created (item_id, created_at),
            KEY idx_inventory_ledger_movement (movement_type),
            KEY idx_inventory_ledger_order_line (order_line_id),
            KEY idx_inventory_ledger_order_row_key (order_row_key),
            KEY idx_inventory_ledger_work_order (work_order_id),
            KEY idx_inventory_ledger_reservation (reservation_id),
            CONSTRAINT fk_inventory_ledger_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_ledger_reservation FOREIGN KEY (reservation_id) REFERENCES inventory_stock_reservations (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_ledger_order_line FOREIGN KEY (order_line_id) REFERENCES order_lines (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_ledger_work_order FOREIGN KEY (work_order_id) REFERENCES production_work_orders (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_ledger_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function app_inventory_parse_positive_number($value): ?float
{
    if (!is_numeric($value)) {
        return null;
    }

    $number = (float)$value;
    if ($number <= 0) {
        return null;
    }

    return $number;
}

function app_inventory_parse_bool($value): ?bool
{
    if (is_bool($value)) {
        return $value;
    }
    if (is_int($value)) {
        if ($value === 1) {
            return true;
        }
        if ($value === 0) {
            return false;
        }
    }
    if (is_string($value)) {
        $normalized = strtolower(trim($value));
        if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
            return true;
        }
        if (in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
            return false;
        }
    }

    return null;
}

function app_inventory_sanitize_key(string $value): string
{
    $sanitized = preg_replace('/[^A-Za-z0-9\-]+/', '-', $value);
    $sanitized = trim((string)$sanitized, '-');
    if ($sanitized === '') {
        $sanitized = strtoupper(str_replace('.', '', uniqid('KEY', true)));
    }

    return strtoupper($sanitized);
}

function app_inventory_reservation_code(string $orderRowKey): string
{
    return 'RES-' . app_inventory_sanitize_key($orderRowKey);
}

function app_inventory_resolve_item_id_for_release(PDO $pdo, array $payload): int
{
    $itemIdRaw = $payload['itemId'] ?? null;
    $itemId = filter_var($itemIdRaw, FILTER_VALIDATE_INT);
    if ($itemId !== false && (int)$itemId > 0) {
        $check = $pdo->prepare('SELECT id FROM inventory_items WHERE id = :id LIMIT 1');
        $check->execute(['id' => (int)$itemId]);
        if ($check->fetch()) {
            return (int)$itemId;
        }
    }

    $orderRowKey = trim((string)($payload['orderRowKey'] ?? ''));
    $itemSnapshot = is_array($payload['itemSnapshot'] ?? null) ? $payload['itemSnapshot'] : [];
    $title = trim((string)($itemSnapshot['title'] ?? ''));
    if ($title === '') {
        $title = 'Auto Item ' . ($orderRowKey !== '' ? $orderRowKey : 'Unknown');
    }

    $materialType = 'glass';
    $skuSource = $orderRowKey !== '' ? $orderRowKey : $title;
    $sku = 'AUTO-' . app_inventory_sanitize_key($skuSource);

    $existing = $pdo->prepare('SELECT id FROM inventory_items WHERE sku = :sku LIMIT 1');
    $existing->execute(['sku' => $sku]);
    $row = $existing->fetch();
    if ($row) {
        return (int)$row['id'];
    }

    $insert = $pdo->prepare(
        'INSERT INTO inventory_items (sku, title, material_type, unit, reorder_point, is_active)
         VALUES (:sku, :title, :material_type, :unit, :reorder_point, :is_active)'
    );
    $insert->execute([
        'sku' => $sku,
        'title' => $title,
        'material_type' => $materialType,
        'unit' => 'piece',
        'reorder_point' => 0,
        'is_active' => 1,
    ]);

    return (int)$pdo->lastInsertId();
}

function app_inventory_compute_on_hand(PDO $pdo, int $itemId): float
{
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(
            CASE movement_type
                WHEN 'in' THEN ABS(qty_delta)
                WHEN 'adjust_plus' THEN ABS(qty_delta)
                WHEN 'out' THEN -ABS(qty_delta)
                WHEN 'adjust_minus' THEN -ABS(qty_delta)
                WHEN 'consume' THEN -ABS(qty_delta)
                ELSE 0
            END
        ), 0) AS on_hand
        FROM inventory_stock_ledger
        WHERE item_id = :item_id"
    );
    $stmt->execute(['item_id' => $itemId]);
    $row = $stmt->fetch();
    return (float)($row['on_hand'] ?? 0);
}

function app_inventory_compute_reserved(PDO $pdo, int $itemId, ?int $excludeReservationId = null): float
{
    $sql = "SELECT COALESCE(SUM(GREATEST(qty_reserved - qty_released - qty_consumed, 0)), 0) AS reserved_qty
            FROM inventory_stock_reservations
            WHERE item_id = :item_id AND status IN ('active', 'released')";
    $params = ['item_id' => $itemId];
    if ($excludeReservationId !== null && $excludeReservationId > 0) {
        $sql .= ' AND id <> :exclude_id';
        $params['exclude_id'] = $excludeReservationId;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return (float)($row['reserved_qty'] ?? 0);
}

function app_inventory_evaluate_release_capacity(PDO $pdo, int $itemId, float $requestedQty, ?int $excludeReservationId = null): array
{
    $onHand = app_inventory_compute_on_hand($pdo, $itemId);
    $reservedOther = app_inventory_compute_reserved($pdo, $itemId, $excludeReservationId);
    $available = $onHand - $reservedOther;
    $shortage = max(0.0, $requestedQty - $available);

    return [
        'itemId' => $itemId,
        'onHandQty' => $onHand,
        'reservedQty' => $reservedOther,
        'availableQty' => $available,
        'requestedQty' => $requestedQty,
        'shortageQty' => $shortage,
        'sufficient' => $shortage <= 0.000001,
    ];
}

function app_inventory_load_reservation_by_id(PDO $pdo, int $reservationId): ?array
{
    $load = $pdo->prepare(
        'SELECT
            r.id, r.reservation_code, r.item_id, r.order_line_id, r.order_row_key, r.work_order_id,
            r.qty_reserved, r.qty_released, r.qty_consumed, r.status, r.note, r.created_at, r.updated_at,
            i.sku, i.title AS item_title, i.unit
         FROM inventory_stock_reservations r
         INNER JOIN inventory_items i ON i.id = r.item_id
         WHERE r.id = :id
         LIMIT 1'
    );
    $load->execute(['id' => $reservationId]);
    $row = $load->fetch();
    if (!$row) {
        return null;
    }

    return [
        'id' => (string)$row['id'],
        'reservationCode' => (string)$row['reservation_code'],
        'itemId' => (string)$row['item_id'],
        'itemSku' => (string)$row['sku'],
        'itemTitle' => (string)$row['item_title'],
        'itemUnit' => (string)$row['unit'],
        'orderLineId' => $row['order_line_id'] !== null ? (string)$row['order_line_id'] : null,
        'orderRowKey' => $row['order_row_key'] !== null ? (string)$row['order_row_key'] : null,
        'workOrderId' => $row['work_order_id'] !== null ? (string)$row['work_order_id'] : null,
        'qtyReserved' => (float)$row['qty_reserved'],
        'qtyReleased' => (float)$row['qty_released'],
        'qtyConsumed' => (float)$row['qty_consumed'],
        'status' => (string)$row['status'],
        'note' => (string)($row['note'] ?? ''),
        'createdAt' => (string)$row['created_at'],
        'updatedAt' => (string)$row['updated_at'],
    ];
}

function app_inventory_reserve_for_release(PDO $pdo, array $payload, ?array $actor = null): array
{
    app_inventory_ensure_tables($pdo);

    $orderLineId = filter_var($payload['orderLineId'] ?? null, FILTER_VALIDATE_INT);
    $workOrderId = filter_var($payload['workOrderId'] ?? null, FILTER_VALIDATE_INT);
    $orderId = filter_var($payload['orderId'] ?? null, FILTER_VALIDATE_INT);
    $orderRowKey = trim((string)($payload['orderRowKey'] ?? ''));
    if ($orderLineId === false || (int)$orderLineId <= 0 || $workOrderId === false || (int)$workOrderId <= 0 || $orderRowKey === '') {
        throw new InvalidArgumentException('orderLineId, workOrderId and orderRowKey are required for reservation.');
    }

    $qtyReserved = app_inventory_parse_positive_number($payload['qtyReserved'] ?? null);
    if ($qtyReserved === null) {
        $qtyReserved = 1.0;
    }

    $enforceStockCheck = app_inventory_parse_bool($payload['enforceStockCheck'] ?? false) ?? false;

    $itemId = app_inventory_resolve_item_id_for_release($pdo, $payload);
    $reservationCode = app_inventory_reservation_code($orderRowKey);
    $actorUserId = filter_var($actor['id'] ?? null, FILTER_VALIDATE_INT);
    $actorUserId = $actorUserId !== false && (int)$actorUserId > 0 ? (int)$actorUserId : null;

    $existingStmt = $pdo->prepare(
        'SELECT id, qty_reserved, status
         FROM inventory_stock_reservations
         WHERE reservation_code = :reservation_code
         LIMIT 1'
    );
    $existingStmt->execute(['reservation_code' => $reservationCode]);
    $existing = $existingStmt->fetch();

    $created = false;
    $reservationId = 0;
    $qtyDelta = $qtyReserved;
    $capacity = app_inventory_evaluate_release_capacity(
        $pdo,
        $itemId,
        $qtyReserved,
        $existing ? (int)$existing['id'] : null
    );
    if (!$capacity['sufficient'] && $enforceStockCheck) {
        throw new RuntimeException('Insufficient available stock for reservation.');
    }

    if ($existing) {
        $reservationId = (int)$existing['id'];
        $previousQty = (float)($existing['qty_reserved'] ?? 0);
        $qtyDelta = $qtyReserved - $previousQty;

        $update = $pdo->prepare(
            'UPDATE inventory_stock_reservations
             SET item_id = :item_id,
                 order_line_id = :order_line_id,
                 order_row_key = :order_row_key,
                 work_order_id = :work_order_id,
                 qty_reserved = :qty_reserved,
                 status = :status,
                 note = :note,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $update->execute([
            'id' => $reservationId,
            'item_id' => $itemId,
            'order_line_id' => (int)$orderLineId,
            'order_row_key' => $orderRowKey,
            'work_order_id' => (int)$workOrderId,
            'qty_reserved' => $qtyReserved,
            'status' => 'active',
            'note' => 'Reserved from production release flow',
        ]);
    } else {
        $created = true;
        $insert = $pdo->prepare(
            'INSERT INTO inventory_stock_reservations (
                reservation_code, item_id, order_line_id, order_row_key, work_order_id,
                qty_reserved, qty_released, qty_consumed, status, note, created_by_user_id
             ) VALUES (
                :reservation_code, :item_id, :order_line_id, :order_row_key, :work_order_id,
                :qty_reserved, :qty_released, :qty_consumed, :status, :note, :created_by_user_id
             )'
        );
        $insert->execute([
            'reservation_code' => $reservationCode,
            'item_id' => $itemId,
            'order_line_id' => (int)$orderLineId,
            'order_row_key' => $orderRowKey,
            'work_order_id' => (int)$workOrderId,
            'qty_reserved' => $qtyReserved,
            'qty_released' => 0,
            'qty_consumed' => 0,
            'status' => 'active',
            'note' => 'Reserved from production release flow',
            'created_by_user_id' => $actorUserId,
        ]);
        $reservationId = (int)$pdo->lastInsertId();
    }

    if (abs($qtyDelta) > 0.000001) {
        $movementType = $qtyDelta >= 0 ? 'reserve' : 'release';
        $ledgerNote = $movementType === 'reserve'
            ? 'Reservation created/expanded from release flow'
            : 'Reservation reduced from release replay';

        $ledgerInsert = $pdo->prepare(
            'INSERT INTO inventory_stock_ledger (
                item_id, movement_type, qty_delta, balance_after,
                reference_type, reference_id, reservation_id, order_line_id, order_row_key, work_order_id, note, actor_user_id
             ) VALUES (
                :item_id, :movement_type, :qty_delta, :balance_after,
                :reference_type, :reference_id, :reservation_id, :order_line_id, :order_row_key, :work_order_id, :note, :actor_user_id
             )'
        );
        $ledgerInsert->execute([
            'item_id' => $itemId,
            'movement_type' => $movementType,
            'qty_delta' => $qtyDelta,
            'balance_after' => null,
            'reference_type' => 'production_release',
            'reference_id' => (string)$workOrderId,
            'reservation_id' => $reservationId,
            'order_line_id' => (int)$orderLineId,
            'order_row_key' => $orderRowKey,
            'work_order_id' => (int)$workOrderId,
            'note' => $ledgerNote,
            'actor_user_id' => $actorUserId,
        ]);
    }

    app_audit_log(
        $pdo,
        $created ? 'inventory.reservation.created' : 'inventory.reservation.updated',
        'inventory_stock_reservations',
        (string)$reservationId,
        [
            'reservationCode' => $reservationCode,
            'itemId' => $itemId,
            'orderId' => $orderId !== false ? (int)$orderId : null,
            'orderLineId' => (int)$orderLineId,
            'workOrderId' => (int)$workOrderId,
            'orderRowKey' => $orderRowKey,
            'qtyReserved' => $qtyReserved,
            'qtyDelta' => $qtyDelta,
            'capacity' => $capacity,
            'enforceStockCheck' => $enforceStockCheck,
        ],
        $actor
    );

    $reservation = app_inventory_load_reservation_by_id($pdo, $reservationId);
    if ($reservation === null) {
        throw new RuntimeException('Unable to load reservation after write.');
    }

    return array_merge($reservation, [
        'created' => $created,
        'capacity' => $capacity,
        'enforceStockCheck' => $enforceStockCheck,
    ]);
}

function app_inventory_consume_for_work_order(PDO $pdo, array $payload, ?array $actor = null): array
{
    app_inventory_ensure_tables($pdo);

    $workOrderId = filter_var($payload['workOrderId'] ?? null, FILTER_VALIDATE_INT);
    if ($workOrderId === false || (int)$workOrderId <= 0) {
        throw new InvalidArgumentException('Valid workOrderId is required for consume.');
    }

    $consumeQty = app_inventory_parse_positive_number($payload['consumeQty'] ?? null);
    if ($consumeQty === null) {
        $consumeQty = 1.0;
    }

    $select = $pdo->prepare(
        "SELECT id, item_id, reservation_code, qty_reserved, qty_released, qty_consumed, status, order_line_id, order_row_key, work_order_id
         FROM inventory_stock_reservations
         WHERE work_order_id = :work_order_id
           AND status IN ('active', 'released', 'consumed')
         LIMIT 1"
    );
    $select->execute(['work_order_id' => (int)$workOrderId]);
    $reservationRow = $select->fetch();
    if (!$reservationRow) {
        throw new RuntimeException('No reservation found for the target work order.');
    }

    $reservationId = (int)$reservationRow['id'];
    $qtyReserved = (float)($reservationRow['qty_reserved'] ?? 0);
    $qtyReleased = (float)($reservationRow['qty_released'] ?? 0);
    $qtyConsumed = (float)($reservationRow['qty_consumed'] ?? 0);
    $remaining = max(0.0, $qtyReserved - $qtyReleased - $qtyConsumed);
    if ($consumeQty > $remaining + 0.000001) {
        throw new RuntimeException('Consume quantity exceeds reserved remaining quantity.');
    }

    $nextConsumed = $qtyConsumed + $consumeQty;
    $nextRemaining = max(0.0, $qtyReserved - $qtyReleased - $nextConsumed);
    $nextStatus = $nextRemaining <= 0.000001 ? 'consumed' : 'active';

    $update = $pdo->prepare(
        'UPDATE inventory_stock_reservations
         SET qty_consumed = :qty_consumed,
             status = :status,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $update->execute([
        'id' => $reservationId,
        'qty_consumed' => $nextConsumed,
        'status' => $nextStatus,
    ]);

    $actorUserId = filter_var($actor['id'] ?? null, FILTER_VALIDATE_INT);
    $actorUserId = $actorUserId !== false && (int)$actorUserId > 0 ? (int)$actorUserId : null;

    $ledger = $pdo->prepare(
        'INSERT INTO inventory_stock_ledger (
            item_id, movement_type, qty_delta, balance_after, reference_type, reference_id,
            reservation_id, order_line_id, order_row_key, work_order_id, note, actor_user_id
         ) VALUES (
            :item_id, :movement_type, :qty_delta, :balance_after, :reference_type, :reference_id,
            :reservation_id, :order_line_id, :order_row_key, :work_order_id, :note, :actor_user_id
         )'
    );
    $ledger->execute([
        'item_id' => (int)$reservationRow['item_id'],
        'movement_type' => 'consume',
        'qty_delta' => -abs($consumeQty),
        'balance_after' => null,
        'reference_type' => 'production_consume',
        'reference_id' => (string)$workOrderId,
        'reservation_id' => $reservationId,
        'order_line_id' => $reservationRow['order_line_id'] !== null ? (int)$reservationRow['order_line_id'] : null,
        'order_row_key' => $reservationRow['order_row_key'] !== null ? (string)$reservationRow['order_row_key'] : null,
        'work_order_id' => (int)$workOrderId,
        'note' => 'Consumed from production work order flow',
        'actor_user_id' => $actorUserId,
    ]);

    app_audit_log(
        $pdo,
        'inventory.reservation.consumed',
        'inventory_stock_reservations',
        (string)$reservationId,
        [
            'workOrderId' => (int)$workOrderId,
            'consumeQty' => $consumeQty,
            'qtyConsumed' => $nextConsumed,
            'qtyRemaining' => $nextRemaining,
            'status' => $nextStatus,
        ],
        $actor
    );

    $reservation = app_inventory_load_reservation_by_id($pdo, $reservationId);
    if ($reservation === null) {
        throw new RuntimeException('Unable to load reservation after consume.');
    }

    return array_merge($reservation, [
        'consumedQtyDelta' => $consumeQty,
        'qtyRemaining' => $nextRemaining,
    ]);
}

function app_inventory_fetch_reservations(PDO $pdo, array $filters = []): array
{
    app_inventory_ensure_tables($pdo);

    $whereParts = [];
    $params = [];

    $status = trim((string)($filters['status'] ?? ''));
    if ($status !== '') {
        $whereParts[] = 'r.status = :status';
        $params['status'] = $status;
    }

    $orderRowKey = trim((string)($filters['orderRowKey'] ?? ''));
    if ($orderRowKey !== '') {
        $whereParts[] = 'r.order_row_key = :order_row_key';
        $params['order_row_key'] = $orderRowKey;
    }

    $whereSql = $whereParts === [] ? '' : (' WHERE ' . implode(' AND ', $whereParts));
    $stmt = $pdo->prepare(
        'SELECT
            r.id, r.reservation_code, r.item_id, r.order_line_id, r.order_row_key, r.work_order_id,
            r.qty_reserved, r.qty_released, r.qty_consumed, r.status, r.note, r.created_at, r.updated_at,
            i.sku, i.title AS item_title, i.unit
         FROM inventory_stock_reservations r
         INNER JOIN inventory_items i ON i.id = r.item_id' . $whereSql . '
         ORDER BY r.created_at DESC, r.id DESC'
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    return array_map(static function (array $row): array {
        return [
            'id' => (string)$row['id'],
            'reservationCode' => (string)$row['reservation_code'],
            'itemId' => (string)$row['item_id'],
            'itemSku' => (string)$row['sku'],
            'itemTitle' => (string)$row['item_title'],
            'itemUnit' => (string)$row['unit'],
            'orderLineId' => $row['order_line_id'] !== null ? (string)$row['order_line_id'] : null,
            'orderRowKey' => $row['order_row_key'] !== null ? (string)$row['order_row_key'] : null,
            'workOrderId' => $row['work_order_id'] !== null ? (string)$row['work_order_id'] : null,
            'qtyReserved' => (float)$row['qty_reserved'],
            'qtyReleased' => (float)$row['qty_released'],
            'qtyConsumed' => (float)$row['qty_consumed'],
            'status' => (string)$row['status'],
            'note' => (string)($row['note'] ?? ''),
            'createdAt' => (string)$row['created_at'],
            'updatedAt' => (string)$row['updated_at'],
        ];
    }, $rows);
}

function app_inventory_fetch_ledger(PDO $pdo, array $filters = []): array
{
    app_inventory_ensure_tables($pdo);

    $whereParts = [];
    $params = [];

    $movementType = trim((string)($filters['movementType'] ?? ''));
    if ($movementType !== '') {
        $whereParts[] = 'l.movement_type = :movement_type';
        $params['movement_type'] = $movementType;
    }

    $orderRowKey = trim((string)($filters['orderRowKey'] ?? ''));
    if ($orderRowKey !== '') {
        $whereParts[] = 'l.order_row_key = :order_row_key';
        $params['order_row_key'] = $orderRowKey;
    }

    $whereSql = $whereParts === [] ? '' : (' WHERE ' . implode(' AND ', $whereParts));
    $stmt = $pdo->prepare(
        'SELECT
            l.id, l.item_id, l.movement_type, l.qty_delta, l.balance_after,
            l.reference_type, l.reference_id, l.reservation_id, l.order_line_id, l.order_row_key,
            l.work_order_id, l.note, l.actor_user_id, l.created_at,
            i.sku, i.title AS item_title, i.unit
         FROM inventory_stock_ledger l
         INNER JOIN inventory_items i ON i.id = l.item_id' . $whereSql . '
         ORDER BY l.created_at DESC, l.id DESC
         LIMIT 500'
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    return array_map(static function (array $row): array {
        return [
            'id' => (string)$row['id'],
            'itemId' => (string)$row['item_id'],
            'itemSku' => (string)$row['sku'],
            'itemTitle' => (string)$row['item_title'],
            'itemUnit' => (string)$row['unit'],
            'movementType' => (string)$row['movement_type'],
            'qtyDelta' => (float)$row['qty_delta'],
            'balanceAfter' => $row['balance_after'] !== null ? (float)$row['balance_after'] : null,
            'referenceType' => $row['reference_type'] !== null ? (string)$row['reference_type'] : null,
            'referenceId' => $row['reference_id'] !== null ? (string)$row['reference_id'] : null,
            'reservationId' => $row['reservation_id'] !== null ? (string)$row['reservation_id'] : null,
            'orderLineId' => $row['order_line_id'] !== null ? (string)$row['order_line_id'] : null,
            'orderRowKey' => $row['order_row_key'] !== null ? (string)$row['order_row_key'] : null,
            'workOrderId' => $row['work_order_id'] !== null ? (string)$row['work_order_id'] : null,
            'note' => (string)($row['note'] ?? ''),
            'actorUserId' => $row['actor_user_id'] !== null ? (string)$row['actor_user_id'] : null,
            'createdAt' => (string)$row['created_at'],
        ];
    }, $rows);
}

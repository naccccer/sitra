<?php
declare(strict_types=1);

function app_production_work_orders_handle_get(PDO $pdo): void
{
    $actor = app_require_permission('production.work_orders.read', $pdo);
    app_production_ensure_tables($pdo);
    app_inventory_ensure_tables($pdo);

    $status = trim((string)($_GET['status'] ?? ''));
    $lineKey = trim((string)($_GET['orderRowKey'] ?? ''));

    $whereParts = [];
    $params = [];
    if ($status !== '') {
        $whereParts[] = 'w.status = :status';
        $params['status'] = $status;
    }
    if ($lineKey !== '') {
        $whereParts[] = 'w.order_row_key = :order_row_key';
        $params['order_row_key'] = $lineKey;
    }

    $whereSql = $whereParts === [] ? '' : (' WHERE ' . implode(' AND ', $whereParts));
    $stmt = $pdo->prepare(
        'SELECT
            w.id,
            w.work_order_code,
            w.order_line_id,
            w.order_row_key,
            w.requires_drilling,
            w.public_template_url,
            w.qr_payload_url,
            w.status,
            w.priority,
            w.station_key,
            w.planned_start_at,
            w.planned_end_at,
            w.completed_at,
            w.label_print_count,
            w.last_label_printed_at,
            w.notes,
            w.created_at,
            w.updated_at,
            ol.order_id,
            ol.line_no,
            r.id AS reservation_id,
            r.qty_reserved,
            r.qty_released,
            r.qty_consumed,
            r.status AS reservation_status
         FROM production_work_orders w
         INNER JOIN order_lines ol ON ol.id = w.order_line_id
         LEFT JOIN inventory_stock_reservations r ON r.work_order_id = w.id' . $whereSql . '
         ORDER BY w.created_at DESC, w.id DESC'
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $workOrders = array_map(static function (array $row): array {
        $reservationId = $row['reservation_id'] !== null ? (string)$row['reservation_id'] : null;
        $qtyReserved = (float)($row['qty_reserved'] ?? 0);
        $qtyReleased = (float)($row['qty_released'] ?? 0);
        $qtyConsumed = (float)($row['qty_consumed'] ?? 0);
        $qtyRemaining = max(0.0, $qtyReserved - $qtyReleased - $qtyConsumed);

        return [
            'id' => (string)$row['id'],
            'workOrderCode' => (string)$row['work_order_code'],
            'orderLineId' => (string)$row['order_line_id'],
            'orderId' => (string)$row['order_id'],
            'lineNo' => (int)$row['line_no'],
            'orderRowKey' => (string)$row['order_row_key'],
            'requiresDrilling' => ((int)($row['requires_drilling'] ?? 0)) === 1,
            'publicTemplateUrl' => $row['public_template_url'] !== null ? (string)$row['public_template_url'] : null,
            'qrPayloadUrl' => $row['qr_payload_url'] !== null ? (string)$row['qr_payload_url'] : null,
            'status' => (string)$row['status'],
            'priority' => (int)($row['priority'] ?? 3),
            'stationKey' => $row['station_key'] !== null ? (string)$row['station_key'] : null,
            'plannedStartAt' => $row['planned_start_at'] !== null ? (string)$row['planned_start_at'] : null,
            'plannedEndAt' => $row['planned_end_at'] !== null ? (string)$row['planned_end_at'] : null,
            'completedAt' => $row['completed_at'] !== null ? (string)$row['completed_at'] : null,
            'labelPrintCount' => (int)($row['label_print_count'] ?? 0),
            'lastLabelPrintedAt' => $row['last_label_printed_at'] !== null ? (string)$row['last_label_printed_at'] : null,
            'notes' => $row['notes'] !== null ? (string)$row['notes'] : '',
            'createdAt' => (string)$row['created_at'],
            'updatedAt' => (string)$row['updated_at'],
            'reservation' => $reservationId !== null ? [
                'id' => $reservationId,
                'qtyReserved' => $qtyReserved,
                'qtyReleased' => $qtyReleased,
                'qtyConsumed' => $qtyConsumed,
                'qtyRemaining' => $qtyRemaining,
                'status' => (string)($row['reservation_status'] ?? ''),
            ] : null,
        ];
    }, $rows);

    app_json([
        'success' => true,
        'workOrders' => $workOrders,
        'stationPresets' => app_production_station_presets_for_role((string)($actor['role'] ?? '')),
    ]);
}

function app_production_work_orders_handle_post(PDO $pdo): void
{
    $actor = app_require_permission('sales.orders.release', $pdo);
    app_production_ensure_tables($pdo);

    $payload = app_read_json_body();
    $enforceStockCheck = app_inventory_parse_bool($payload['enforceStockCheck'] ?? false) ?? false;
    $orderId = app_production_parse_positive_int($payload['orderId'] ?? null);
    if ($orderId === null) {
        app_json([
            'success' => false,
            'error' => 'orderId معتبر الزامی است.',
        ], 400);
    }

    $lineNos = is_array($payload['lineNos'] ?? null) ? $payload['lineNos'] : [];
    $lineOverrides = is_array($payload['lineOverrides'] ?? null) ? $payload['lineOverrides'] : [];

    $select = $pdo->prepare('SELECT ' . app_orders_select_fields($pdo) . ' FROM orders WHERE id = :id LIMIT 1');
    $select->execute(['id' => $orderId]);
    $orderRow = $select->fetch();
    if (!$orderRow) {
        app_json([
            'success' => false,
            'error' => 'سفارش پیدا نشد.',
        ], 404);
    }

    $order = app_order_from_row($orderRow);
    $releaseLines = app_production_collect_release_lines($order, $lineNos);
    if ($releaseLines === []) {
        app_json([
            'success' => false,
            'error' => 'برای داده ارسالی سطر قابل رهاسازی پیدا نشد.',
        ], 400);
    }

    // Ensure audit table setup before transaction to avoid implicit commit during release.
    app_ensure_audit_logs_table($pdo);
    // Ensure inventory tables setup before transaction to avoid implicit commit during release.
    app_inventory_ensure_tables($pdo);

    $resultWorkOrders = [];
    $pdo->beginTransaction();
    try {
        foreach ($releaseLines as $line) {
            $lineNo = (int)$line['lineNo'];
            $lineOverride = is_array($lineOverrides[(string)$lineNo] ?? null) ? $lineOverrides[(string)$lineNo] : [];
            $orderRowKey = trim((string)($lineOverride['orderRowKey'] ?? app_production_build_order_row_key($orderId, $lineNo)));
            if ($orderRowKey === '') {
                $orderRowKey = app_production_build_order_row_key($orderId, $lineNo);
            }

            $overrideDrilling = app_production_parse_bool($lineOverride['requiresDrilling'] ?? null);
            $requiresDrilling = $overrideDrilling !== null
                ? $overrideDrilling
                : app_production_detect_requires_drilling($line['item']);

            $template = app_production_resolve_template_fields($line['item'], $lineOverride, $orderRowKey);
            $orderLineId = app_production_upsert_order_line(
                $pdo,
                $orderId,
                $line,
                $requiresDrilling,
                $orderRowKey,
                $template['templatePublicSlug'],
                $template['publicTemplateUrl']
            );

            $existingWorkOrderStmt = $pdo->prepare(
                'SELECT id, work_order_code, status, requires_drilling, public_template_url, qr_payload_url
                 FROM production_work_orders
                 WHERE order_line_id = :order_line_id
                 LIMIT 1'
            );
            $existingWorkOrderStmt->execute(['order_line_id' => $orderLineId]);
            $existing = $existingWorkOrderStmt->fetch();

            $created = false;
            $workOrderId = 0;
            $workOrderCode = '';
            if ($existing) {
                $workOrderId = (int)$existing['id'];
                $workOrderCode = (string)$existing['work_order_code'];

                $updateExisting = $pdo->prepare(
                    'UPDATE production_work_orders
                     SET requires_drilling = :requires_drilling,
                         public_template_url = :public_template_url,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = :id'
                );
                $updateExisting->execute([
                    'id' => $workOrderId,
                    'requires_drilling' => $requiresDrilling ? 1 : 0,
                    'public_template_url' => $template['publicTemplateUrl'],
                ]);
            } else {
                $workOrderCode = app_production_work_order_code($orderRowKey);
                $insertWorkOrder = $pdo->prepare(
                    'INSERT INTO production_work_orders (
                        work_order_code, order_line_id, order_row_key, requires_drilling, public_template_url, status, created_by_user_id
                     ) VALUES (
                        :work_order_code, :order_line_id, :order_row_key, :requires_drilling, :public_template_url, :status, :created_by_user_id
                     )'
                );
                $insertWorkOrder->execute([
                    'work_order_code' => $workOrderCode,
                    'order_line_id' => $orderLineId,
                    'order_row_key' => $orderRowKey,
                    'requires_drilling' => $requiresDrilling ? 1 : 0,
                    'public_template_url' => $template['publicTemplateUrl'],
                    'status' => 'queued',
                    'created_by_user_id' => app_production_parse_positive_int($actor['id'] ?? null),
                ]);

                $workOrderId = (int)$pdo->lastInsertId();
                $created = true;
            }

            $eventPayload = [
                'orderId' => $orderId,
                'orderLineId' => $orderLineId,
                'lineNo' => $lineNo,
                'orderRowKey' => $orderRowKey,
                'requiresDrilling' => $requiresDrilling,
                'publicTemplateUrl' => $template['publicTemplateUrl'],
            ];
            $eventJson = json_encode($eventPayload, JSON_UNESCAPED_UNICODE);

            $insertEvent = $pdo->prepare(
                'INSERT INTO production_work_order_events (
                    work_order_id, event_type, payload_json, actor_user_id
                 ) VALUES (
                    :work_order_id, :event_type, :payload_json, :actor_user_id
                 )'
            );
            $insertEvent->execute([
                'work_order_id' => $workOrderId,
                'event_type' => $created ? 'released_from_sales' : 'release_replayed',
                'payload_json' => $eventJson !== false ? $eventJson : '{}',
                'actor_user_id' => app_production_parse_positive_int($actor['id'] ?? null),
            ]);

            app_audit_log(
                $pdo,
                $created ? 'production.work_order.created' : 'production.work_order.release_replayed',
                'production_work_order',
                (string)$workOrderId,
                $eventPayload,
                $actor
            );

            $reload = $pdo->prepare(
                'SELECT id, work_order_code, requires_drilling, public_template_url, qr_payload_url, status
                 FROM production_work_orders
                 WHERE id = :id LIMIT 1'
            );
            $reload->execute(['id' => $workOrderId]);
            $loaded = $reload->fetch();

            $resultWorkOrders[] = [
                'id' => (string)$workOrderId,
                'workOrderCode' => (string)($loaded['work_order_code'] ?? $workOrderCode),
                'orderId' => (string)$orderId,
                'orderLineId' => (string)$orderLineId,
                'lineNo' => $lineNo,
                'orderRowKey' => $orderRowKey,
                'requiresDrilling' => ((int)($loaded['requires_drilling'] ?? ($requiresDrilling ? 1 : 0))) === 1,
                'publicTemplateUrl' => $loaded['public_template_url'] !== null ? (string)$loaded['public_template_url'] : null,
                'qrPayloadUrl' => $loaded['qr_payload_url'] !== null ? (string)$loaded['qr_payload_url'] : null,
                'status' => (string)($loaded['status'] ?? 'queued'),
                'created' => $created,
            ];

            $item = is_array($line['item'] ?? null) ? $line['item'] : [];
            $dimensions = is_array($item['dimensions'] ?? null) ? $item['dimensions'] : [];
            $manual = is_array($item['manual'] ?? null) ? $item['manual'] : [];
            $qtyReserved = max(1, (int)($dimensions['count'] ?? $manual['qty'] ?? 1));

            $reservation = app_inventory_reserve_for_release(
                $pdo,
                [
                    'orderId' => $orderId,
                    'orderLineId' => $orderLineId,
                    'workOrderId' => $workOrderId,
                    'orderRowKey' => $orderRowKey,
                    'qtyReserved' => $qtyReserved,
                    'itemSnapshot' => $item,
                    'enforceStockCheck' => $enforceStockCheck,
                ],
                $actor
            );
            $resultWorkOrders[count($resultWorkOrders) - 1]['reservation'] = $reservation;
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $message = $e->getMessage();
        if (str_contains($message, 'Insufficient available stock for reservation.')) {
            app_json([
                'success' => false,
                'error' => 'موجودی قابل استفاده برای یک یا چند سطر رهاسازی‌شده کافی نیست.',
            ], 409);
        }
        throw $e;
    }

    app_json([
        'success' => true,
        'orderId' => (string)$orderId,
        'enforceStockCheck' => $enforceStockCheck,
        'workOrders' => $resultWorkOrders,
    ], 201);
}

function app_production_work_orders_handle_patch(PDO $pdo): void
{
    $actor = app_require_permission('production.work_orders.write', $pdo);
    app_production_ensure_tables($pdo);
    app_inventory_ensure_tables($pdo);
    app_ensure_audit_logs_table($pdo);

    $payload = app_read_json_body();
    $workOrderId = app_production_parse_positive_int($payload['workOrderId'] ?? $payload['id'] ?? null);
    if ($workOrderId === null) {
        app_json([
            'success' => false,
            'error' => 'workOrderId معتبر الزامی است.',
        ], 400);
    }

    $allowedStatuses = ['queued', 'cutting', 'drilling', 'tempering', 'packing', 'completed', 'blocked', 'cancelled'];
    $hasStatus = array_key_exists('status', $payload);
    $nextStatus = trim((string)($payload['status'] ?? ''));
    if ($hasStatus && ($nextStatus === '' || !in_array($nextStatus, $allowedStatuses, true))) {
        app_json([
            'success' => false,
            'error' => 'وضعیت برگه کار تولید نامعتبر است.',
        ], 400);
    }

    $stationKey = trim((string)($payload['stationKey'] ?? ''));
    $hasStationKey = array_key_exists('stationKey', $payload);
    $note = trim((string)($payload['note'] ?? ''));

    if ($hasStationKey && $stationKey !== '' && !app_production_station_is_allowed_for_role((string)($actor['role'] ?? ''), $stationKey)) {
        app_json([
            'success' => false,
            'error' => 'ایستگاه انتخاب‌شده برای نقش شما مجاز نیست.',
        ], 403);
    }

    $consumeQty = app_inventory_parse_positive_number($payload['consumeQty'] ?? null);
    $hasConsume = $consumeQty !== null;

    if (!$hasStatus && !$hasStationKey && !$hasConsume && $note === '') {
        app_json([
            'success' => false,
            'error' => 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است.',
        ], 400);
    }

    $select = $pdo->prepare(
        'SELECT id, work_order_code, order_line_id, order_row_key, status, station_key, notes
         FROM production_work_orders
         WHERE id = :id
         LIMIT 1'
    );
    $select->execute(['id' => $workOrderId]);
    $current = $select->fetch();
    if (!$current) {
        app_json([
            'success' => false,
            'error' => 'برگه کار تولید پیدا نشد.',
        ], 404);
    }

    $pdo->beginTransaction();
    try {
        $setParts = [];
        $params = ['id' => $workOrderId];
        $fromStatus = (string)$current['status'];
        $effectiveStatus = $fromStatus;
        if ($hasStatus) {
            $setParts[] = 'status = :status';
            $params['status'] = $nextStatus;
            $effectiveStatus = $nextStatus;
            if ($nextStatus === 'completed') {
                $setParts[] = 'completed_at = CURRENT_TIMESTAMP';
            }
        }
        if ($hasStationKey) {
            $setParts[] = 'station_key = :station_key';
            $params['station_key'] = $stationKey === '' ? null : $stationKey;
        }
        if ($note !== '') {
            $setParts[] = 'notes = :notes';
            $params['notes'] = $note;
        }

        if ($setParts !== []) {
            $update = $pdo->prepare('UPDATE production_work_orders SET ' . implode(', ', $setParts) . ' WHERE id = :id');
            $update->execute($params);
        }

        $consumeResult = null;
        if ($hasConsume) {
            $consumeResult = app_inventory_consume_for_work_order(
                $pdo,
                [
                    'workOrderId' => $workOrderId,
                    'consumeQty' => $consumeQty,
                ],
                $actor
            );
        }

        if ($hasStatus || $hasStationKey || $note !== '') {
            $eventPayload = [
                'workOrderId' => $workOrderId,
                'fromStatus' => $fromStatus,
                'toStatus' => $effectiveStatus,
                'stationKey' => $hasStationKey ? ($stationKey === '' ? null : $stationKey) : null,
                'note' => $note,
            ];
            $eventJson = json_encode($eventPayload, JSON_UNESCAPED_UNICODE);
            $insertEvent = $pdo->prepare(
                'INSERT INTO production_work_order_events (
                    work_order_id, event_type, from_status, to_status, payload_json, note, actor_user_id
                 ) VALUES (
                    :work_order_id, :event_type, :from_status, :to_status, :payload_json, :note, :actor_user_id
                 )'
            );
            $insertEvent->execute([
                'work_order_id' => $workOrderId,
                'event_type' => 'stage_updated',
                'from_status' => $fromStatus,
                'to_status' => $effectiveStatus,
                'payload_json' => $eventJson !== false ? $eventJson : '{}',
                'note' => $note === '' ? null : $note,
                'actor_user_id' => app_production_parse_positive_int($actor['id'] ?? null),
            ]);

            app_audit_log(
                $pdo,
                'production.work_order.updated',
                'production_work_order',
                (string)$workOrderId,
                $eventPayload,
                $actor
            );
        }

        if ($hasConsume && $consumeResult !== null) {
            $consumePayload = [
                'workOrderId' => $workOrderId,
                'consumeQty' => $consumeQty,
                'reservationId' => $consumeResult['id'] ?? null,
                'qtyRemaining' => $consumeResult['qtyRemaining'] ?? null,
            ];
            $consumeJson = json_encode($consumePayload, JSON_UNESCAPED_UNICODE);
            $consumeEvent = $pdo->prepare(
                'INSERT INTO production_work_order_events (
                    work_order_id, event_type, payload_json, actor_user_id
                 ) VALUES (
                    :work_order_id, :event_type, :payload_json, :actor_user_id
                 )'
            );
            $consumeEvent->execute([
                'work_order_id' => $workOrderId,
                'event_type' => 'inventory_consumed',
                'payload_json' => $consumeJson !== false ? $consumeJson : '{}',
                'actor_user_id' => app_production_parse_positive_int($actor['id'] ?? null),
            ]);
        }

        $reload = $pdo->prepare(
            'SELECT
                w.id,
                w.work_order_code,
                w.order_line_id,
                w.order_row_key,
                w.requires_drilling,
                w.public_template_url,
                w.qr_payload_url,
                w.status,
                w.priority,
                w.station_key,
                w.planned_start_at,
                w.planned_end_at,
                w.completed_at,
                w.label_print_count,
                w.last_label_printed_at,
                w.notes,
                w.created_at,
                w.updated_at,
                ol.order_id,
                ol.line_no
             FROM production_work_orders w
             INNER JOIN order_lines ol ON ol.id = w.order_line_id
             WHERE w.id = :id
             LIMIT 1'
        );
        $reload->execute(['id' => $workOrderId]);
        $row = $reload->fetch();
        if (!$row) {
            throw new RuntimeException('Unable to reload work order after patch.');
        }

        $pdo->commit();

        $workOrder = [
            'id' => (string)$row['id'],
            'workOrderCode' => (string)$row['work_order_code'],
            'orderLineId' => (string)$row['order_line_id'],
            'orderId' => (string)$row['order_id'],
            'lineNo' => (int)$row['line_no'],
            'orderRowKey' => (string)$row['order_row_key'],
            'requiresDrilling' => ((int)($row['requires_drilling'] ?? 0)) === 1,
            'publicTemplateUrl' => $row['public_template_url'] !== null ? (string)$row['public_template_url'] : null,
            'qrPayloadUrl' => $row['qr_payload_url'] !== null ? (string)$row['qr_payload_url'] : null,
            'status' => (string)$row['status'],
            'priority' => (int)($row['priority'] ?? 3),
            'stationKey' => $row['station_key'] !== null ? (string)$row['station_key'] : null,
            'plannedStartAt' => $row['planned_start_at'] !== null ? (string)$row['planned_start_at'] : null,
            'plannedEndAt' => $row['planned_end_at'] !== null ? (string)$row['planned_end_at'] : null,
            'completedAt' => $row['completed_at'] !== null ? (string)$row['completed_at'] : null,
            'labelPrintCount' => (int)($row['label_print_count'] ?? 0),
            'lastLabelPrintedAt' => $row['last_label_printed_at'] !== null ? (string)$row['last_label_printed_at'] : null,
            'notes' => $row['notes'] !== null ? (string)$row['notes'] : '',
            'createdAt' => (string)$row['created_at'],
            'updatedAt' => (string)$row['updated_at'],
        ];

        app_json([
            'success' => true,
            'workOrder' => $workOrder,
            'consumption' => $consumeResult,
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $message = $e->getMessage();
        if (str_contains($message, 'No reservation found for the target work order.')) {
            app_json([
                'success' => false,
                'error' => 'برای این برگه کار تولید رزروی پیدا نشد.',
            ], 404);
        }
        if (str_contains($message, 'Consume quantity exceeds reserved remaining quantity.')) {
            app_json([
                'success' => false,
                'error' => 'مقدار مصرف از باقیمانده رزرو بیشتر است.',
            ], 409);
        }
        throw $e;
    }
}

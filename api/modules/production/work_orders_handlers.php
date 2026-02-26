<?php
declare(strict_types=1);

function app_production_work_orders_handle_get(PDO $pdo): void
{
    app_require_auth(['admin', 'manager', 'production', 'sales', 'inventory']);
    app_production_ensure_tables($pdo);

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
            ol.line_no
         FROM production_work_orders w
         INNER JOIN order_lines ol ON ol.id = w.order_line_id' . $whereSql . '
         ORDER BY w.created_at DESC, w.id DESC'
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $workOrders = array_map(static function (array $row): array {
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
        ];
    }, $rows);

    app_json([
        'success' => true,
        'workOrders' => $workOrders,
    ]);
}

function app_production_work_orders_handle_post(PDO $pdo): void
{
    $actor = app_require_auth(['admin', 'manager', 'sales']);
    app_production_ensure_tables($pdo);

    $payload = app_read_json_body();
    $orderId = app_production_parse_positive_int($payload['orderId'] ?? null);
    if ($orderId === null) {
        app_json([
            'success' => false,
            'error' => 'Valid orderId is required.',
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
            'error' => 'Order not found.',
        ], 404);
    }

    $order = app_order_from_row($orderRow);
    $releaseLines = app_production_collect_release_lines($order, $lineNos);
    if ($releaseLines === []) {
        app_json([
            'success' => false,
            'error' => 'No releasable order lines found for the given payload.',
        ], 400);
    }

    // Ensure audit table setup before transaction to avoid implicit commit during release.
    app_ensure_audit_logs_table($pdo);

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
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    app_json([
        'success' => true,
        'orderId' => (string)$orderId,
        'workOrders' => $resultWorkOrders,
    ], 201);
}

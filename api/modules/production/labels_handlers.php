<?php
declare(strict_types=1);

function app_production_labels_handle_get(PDO $pdo): void
{
    app_require_permission('production.work_orders.read', $pdo);
    app_production_ensure_tables($pdo);
    app_inventory_ensure_tables($pdo);

    $workOrderId = app_production_labels_parse_positive_int($_GET['workOrderId'] ?? null);
    $orderRowKey = trim((string)($_GET['orderRowKey'] ?? ''));
    if ($workOrderId === null && $orderRowKey === '') {
        app_json([
            'success' => false,
            'error' => 'workOrderId یا orderRowKey الزامی است.',
        ], 400);
    }

    $row = app_production_labels_load_row($pdo, $workOrderId, $orderRowKey !== '' ? $orderRowKey : null);
    if ($row === null) {
        app_json([
            'success' => false,
            'error' => 'مورد لیبل پیدا نشد.',
        ], 404);
    }

    app_json([
        'success' => true,
        'labelData' => app_production_label_from_row($row),
    ]);
}

function app_production_labels_handle_post(PDO $pdo): void
{
    $actor = app_require_permission('production.work_orders.write', $pdo);
    app_production_ensure_tables($pdo);
    app_inventory_ensure_tables($pdo);
    app_ensure_audit_logs_table($pdo);

    $payload = app_read_json_body();
    $workOrderId = app_production_labels_parse_positive_int($payload['workOrderId'] ?? null);
    $orderRowKey = trim((string)($payload['orderRowKey'] ?? ''));
    $action = strtolower(trim((string)($payload['action'] ?? 'print')));
    $copies = app_production_labels_parse_positive_int($payload['copies'] ?? 1);
    if ($copies === null) {
        $copies = 1;
    }
    $copies = max(1, min(100, $copies));

    if ($workOrderId === null && $orderRowKey === '') {
        app_json([
            'success' => false,
            'error' => 'workOrderId یا orderRowKey الزامی است.',
        ], 400);
    }
    if (!in_array($action, ['preview', 'print'], true)) {
        app_json([
            'success' => false,
            'error' => 'عملیات نامعتبر است. مقادیر مجاز: preview, print.',
        ], 400);
    }

    $row = app_production_labels_load_row($pdo, $workOrderId, $orderRowKey !== '' ? $orderRowKey : null);
    if ($row === null) {
        app_json([
            'success' => false,
            'error' => 'مورد لیبل پیدا نشد.',
        ], 404);
    }

    if ($action === 'print') {
        $workOrderIdResolved = (int)$row['work_order_id'];
        $orderLineId = (int)$row['order_line_id'];
        $orderRowKeyResolved = (string)$row['order_row_key'];

        $pdo->beginTransaction();
        try {
            $updateWorkOrder = $pdo->prepare(
                'UPDATE production_work_orders
                 SET label_print_count = label_print_count + :copies,
                     last_label_printed_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $updateWorkOrder->execute([
                'copies' => $copies,
                'id' => $workOrderIdResolved,
            ]);

            $updateOrderLine = $pdo->prepare(
                'UPDATE order_lines
                 SET label_print_count = label_print_count + :copies,
                     last_label_printed_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $updateOrderLine->execute([
                'copies' => $copies,
                'id' => $orderLineId,
            ]);

            $eventPayload = [
                'workOrderId' => $workOrderIdResolved,
                'orderLineId' => $orderLineId,
                'orderRowKey' => $orderRowKeyResolved,
                'copies' => $copies,
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
                'work_order_id' => $workOrderIdResolved,
                'event_type' => 'label_printed',
                'payload_json' => $eventJson !== false ? $eventJson : '{}',
                'actor_user_id' => app_production_parse_positive_int($actor['id'] ?? null),
            ]);

            app_audit_log(
                $pdo,
                'production.label.printed',
                'production_work_order',
                (string)$workOrderIdResolved,
                $eventPayload,
                $actor
            );

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    $reloaded = app_production_labels_load_row($pdo, (int)$row['work_order_id'], null);
    if ($reloaded === null) {
        app_json([
            'success' => false,
            'error' => 'مورد لیبل پس از عملیات پیدا نشد.',
        ], 404);
    }

    app_json([
        'success' => true,
        'action' => $action,
        'copies' => $copies,
        'labelData' => app_production_label_from_row($reloaded),
    ]);
}

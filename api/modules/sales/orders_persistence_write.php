<?php
declare(strict_types=1);

require_once __DIR__ . '/orders_idempotency.php';
require_once __DIR__ . '/orders_normalization.php';
require_once __DIR__ . '/../../common/order_financials_repository.php';

function app_sales_orders_post_response(PDO $pdo, array $payload, ?array $currentUser): array
{
    $clientRequestId = app_sales_orders_handle_idempotency_request($pdo, $payload, 'POST', $currentUser);
    $isStaff = app_user_has_permission($currentUser, 'sales.orders.create', $pdo);
    $data = app_sales_orders_prepare_create_payload($pdo, $payload, $isStaff);

    $itemsColumn = app_orders_items_column($pdo);
    $metaColumn = app_orders_meta_column($pdo);
    $customerIdColumn = app_orders_customer_id_column($pdo);
    $projectIdColumn = app_orders_project_id_column($pdo);
    $projectContactIdColumn = app_orders_project_contact_id_column($pdo);

    $inserted = false;
    $lastInsertError = null;
    $maxOrderCodeAttempts = 10;

    for ($attempt = 1; $attempt <= $maxOrderCodeAttempts && !$inserted; $attempt++) {
        $nextSequence = app_sales_next_order_daily_sequence($pdo, $data['orderCodeDatePrefix'], '');
        if ($nextSequence > 999) {
            app_json([
                'success' => false,
                'error' => 'Daily order capacity reached for tracking code generation.',
            ], 429);
        }

        $orderCode = app_generate_order_code($data['orderCodeDatePrefix'], '', $nextSequence, 3);
        $retryDuplicateCode = false;

        foreach (app_sales_orders_date_column_candidates($pdo) as $dateColumn) {
            try {
                $insertCols = "order_code, customer_name, phone, {$dateColumn}, total, status, {$itemsColumn}";
                $insertVals = ':order_code, :customer_name, :phone, :order_date, :total, :status, :items_json';
                $insertParams = [
                    'order_code' => $orderCode,
                    'customer_name' => $data['customerName'],
                    'phone' => $data['phone'],
                    'order_date' => $data['orderDate'],
                    'total' => $data['total'],
                    'status' => $data['status'],
                    'items_json' => $data['itemsJson'],
                ];
                if ($customerIdColumn !== null) {
                    $insertCols .= ", {$customerIdColumn}";
                    $insertVals .= ', :customer_id';
                    $insertParams['customer_id'] = $data['customerId'];
                }
                if ($projectIdColumn !== null) {
                    $insertCols .= ", {$projectIdColumn}";
                    $insertVals .= ', :project_id';
                    $insertParams['project_id'] = $data['projectId'];
                }
                if ($projectContactIdColumn !== null) {
                    $insertCols .= ", {$projectContactIdColumn}";
                    $insertVals .= ', :project_contact_id';
                    $insertParams['project_contact_id'] = $data['projectContactId'];
                }
                if ($metaColumn !== null) {
                    $insertCols .= ", {$metaColumn}";
                    $insertVals .= ', :order_meta_json';
                    $insertParams['order_meta_json'] = $data['orderMetaJson'];
                }
                $stmt = $pdo->prepare("INSERT INTO orders ({$insertCols}) VALUES ({$insertVals})");
                $stmt->execute($insertParams);

                $inserted = true;
                break;
            } catch (Throwable $e) {
                $lastInsertError = $e;
                if (app_sales_is_unknown_column_exception($e, $dateColumn)) {
                    continue;
                }
                if (app_sales_detect_duplicate_order_code_exception($e)) {
                    $retryDuplicateCode = true;
                    break;
                }

                throw $e;
            }
        }

        if (!$retryDuplicateCode && !$inserted && $lastInsertError instanceof Throwable) {
            break;
        }
    }

    if (!$inserted) {
        if ($lastInsertError instanceof Throwable && app_sales_detect_duplicate_order_code_exception($lastInsertError)) {
            app_json([
                'success' => false,
                'error' => 'Unable to generate unique order code.',
            ], 500);
        }
        if ($lastInsertError instanceof Throwable) {
            throw $lastInsertError;
        }
        throw new RuntimeException('Unable to insert order row.');
    }

    $id = (int)$pdo->lastInsertId();

    // Dual-write: persist financials/payments to structured tables
    $orderMeta = json_decode($data['orderMetaJson'], true);
    if (is_array($orderMeta)) {
        app_save_order_financials($pdo, $id, $orderMeta);
    }

    $select = $pdo->prepare('SELECT ' . app_orders_select_fields($pdo) . ' FROM orders WHERE id = :id LIMIT 1');
    $select->execute(['id' => $id]);
    $row = $select->fetch();
    $order = $row ? app_order_from_row($row) : null;

    if ($isStaff && $currentUser !== null && $order !== null) {
        app_audit_log(
            $pdo,
            'sales.order.created',
            'orders',
            (string)$id,
            [
                'orderCode' => (string)($order['orderCode'] ?? ''),
                'status' => (string)($order['status'] ?? ''),
                'total' => (int)($order['total'] ?? 0),
                'itemsCount' => is_array($order['items'] ?? null) ? count($order['items']) : 0,
            ],
            $currentUser
        );
    }

    $responsePayload = [
        'success' => true,
        'order' => $order,
    ];
    app_sales_orders_store_idempotency_response(
        $pdo,
        $clientRequestId,
        'POST',
        $currentUser,
        $id,
        $responsePayload,
        201
    );

    return [
        'payload' => $responsePayload,
        'statusCode' => 201,
    ];
}

function app_sales_orders_put_response(PDO $pdo, array $payload, array $actor): array
{
    $clientRequestId = app_sales_orders_handle_idempotency_request($pdo, $payload, 'PUT', $actor);
    $expectedUpdatedAt = app_sales_normalize_expected_updated_at($payload['expectedUpdatedAt'] ?? null);

    $id = (int)($payload['id'] ?? 0);
    if ($id <= 0) {
        app_json([
            'success' => false,
            'error' => 'Valid order id is required.',
        ], 400);
    }

    $currentOrderStmt = $pdo->prepare('SELECT ' . app_orders_select_fields($pdo) . ' FROM orders WHERE id = :id LIMIT 1');
    $currentOrderStmt->execute(['id' => $id]);
    $currentOrderRow = $currentOrderStmt->fetch();
    if (!$currentOrderRow) {
        app_json([
            'success' => false,
            'error' => 'Order not found.',
        ], 404);
    }
    if (app_sales_is_order_conflict($currentOrderRow, $expectedUpdatedAt)) {
        app_sales_respond_order_conflict($currentOrderRow);
    }

    $data = app_sales_orders_prepare_update_payload($pdo, $payload);

    $itemsColumn = app_orders_items_column($pdo);
    $metaColumn = app_orders_meta_column($pdo);
    $customerIdColumn = app_orders_customer_id_column($pdo);
    $projectIdColumn = app_orders_project_id_column($pdo);
    $projectContactIdColumn = app_orders_project_contact_id_column($pdo);

    $updated = false;
    $lastUpdateError = null;
    foreach (app_sales_orders_date_column_candidates($pdo) as $dateColumn) {
        try {
            $setClause = "customer_name = :customer_name, phone = :phone, {$dateColumn} = :order_date, total = :total, status = :status, {$itemsColumn} = :items_json";
            $updateParams = [
                'id' => $id,
                'customer_name' => $data['customerName'],
                'phone' => $data['phone'],
                'order_date' => $data['orderDate'],
                'total' => $data['total'],
                'status' => $data['status'],
                'items_json' => $data['itemsJson'],
            ];
            if ($customerIdColumn !== null) {
                $setClause .= ", {$customerIdColumn} = :customer_id";
                $updateParams['customer_id'] = $data['customerId'];
            }
            if ($projectIdColumn !== null) {
                $setClause .= ", {$projectIdColumn} = :project_id";
                $updateParams['project_id'] = $data['projectId'];
            }
            if ($projectContactIdColumn !== null) {
                $setClause .= ", {$projectContactIdColumn} = :project_contact_id";
                $updateParams['project_contact_id'] = $data['projectContactId'];
            }
            if ($metaColumn !== null) {
                $setClause .= ", {$metaColumn} = :order_meta_json";
                $updateParams['order_meta_json'] = $data['orderMetaJson'];
            }
            $stmt = $pdo->prepare("UPDATE orders SET {$setClause} WHERE id = :id");
            $stmt->execute($updateParams);

            $updated = true;
            break;
        } catch (Throwable $e) {
            $lastUpdateError = $e;
            if (!app_sales_is_unknown_column_exception($e, $dateColumn)) {
                throw $e;
            }
        }
    }

    if (!$updated) {
        if ($lastUpdateError instanceof Throwable) {
            throw $lastUpdateError;
        }
        throw new RuntimeException('Unable to update order row.');
    }

    // Dual-write: persist financials/payments to structured tables
    $orderMeta = json_decode($data['orderMetaJson'], true);
    if (is_array($orderMeta)) {
        app_save_order_financials($pdo, $id, $orderMeta);
    }

    $select = $pdo->prepare('SELECT ' . app_orders_select_fields($pdo) . ' FROM orders WHERE id = :id LIMIT 1');
    $select->execute(['id' => $id]);
    $row = $select->fetch();

    if (!$row) {
        app_json([
            'success' => false,
            'error' => 'Order not found.',
        ], 404);
    }

    $order = app_order_from_row($row);
    app_audit_log(
        $pdo,
        'sales.order.updated',
        'orders',
        (string)$id,
        [
            'orderCode' => (string)($order['orderCode'] ?? ''),
            'status' => (string)($order['status'] ?? ''),
            'total' => (int)($order['total'] ?? 0),
            'itemsCount' => is_array($order['items'] ?? null) ? count($order['items']) : 0,
        ],
        $actor
    );

    $responsePayload = [
        'success' => true,
        'order' => $order,
    ];
    app_sales_orders_store_idempotency_response(
        $pdo,
        $clientRequestId,
        'PUT',
        $actor,
        $id,
        $responsePayload,
        200
    );

    return [
        'payload' => $responsePayload,
        'statusCode' => 200,
    ];
}

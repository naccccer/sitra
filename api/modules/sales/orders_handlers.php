<?php
declare(strict_types=1);

function app_sales_orders_handle_get(PDO $pdo): void
{
    app_require_permission('sales.orders.read', $pdo);

    $LIMIT = 50;

    // Cursor-based pagination: ?cursor=<last-seen-id>&limit=50
    // Returns orders with id < cursor, newest-first, so the client can
    // call repeatedly to page backwards through history.
    $cursorRaw = trim((string)($_GET['cursor'] ?? ''));
    $cursor = ($cursorRaw !== '' && ctype_digit($cursorRaw)) ? (int)$cursorRaw : null;

    if ($cursor !== null) {
        $stmt = $pdo->prepare(
            'SELECT ' . app_orders_select_fields($pdo) .
            ' FROM orders WHERE id < :cursor ORDER BY id DESC LIMIT :limit'
        );
        $stmt->bindValue(':cursor', $cursor, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $LIMIT + 1, PDO::PARAM_INT);
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare(
            'SELECT ' . app_orders_select_fields($pdo) .
            ' FROM orders ORDER BY id DESC LIMIT :limit'
        );
        $stmt->bindValue(':limit', $LIMIT + 1, PDO::PARAM_INT);
        $stmt->execute();
    }

    $rows = $stmt->fetchAll();
    $hasMore = count($rows) > $LIMIT;
    if ($hasMore) {
        array_pop($rows);
    }

    $orders = [];
    foreach ($rows as $row) {
        $orders[] = app_order_from_row($row);
    }

    $nextCursor = null;
    if ($hasMore && count($orders) > 0) {
        $lastOrder = end($orders);
        $nextCursor = (string)($lastOrder['id'] ?? '');
    }

    app_json([
        'success' => true,
        'orders' => $orders,
        'hasMore' => $hasMore,
        'nextCursor' => $nextCursor,
    ]);
}

function app_sales_orders_handle_post(PDO $pdo): void
{
    $payload = app_read_json_body();
    $currentUser = app_current_user();
    $clientRequestId = app_validate_client_request_id($payload['clientRequestId'] ?? null);
    if ($clientRequestId !== null) {
        $existing = app_find_idempotent_order_request($pdo, $clientRequestId, 'POST', '/api/orders.php', $currentUser);
        if ($existing !== null) {
            $existingPayload = is_array($existing['payload']) ? $existing['payload'] : ['success' => false, 'error' => 'Invalid idempotency response payload.'];
            app_json($existingPayload, (int)$existing['statusCode']);
        }
    }

    $isStaff = app_user_has_permission($currentUser, 'sales.orders.create', $pdo);

    $resolvedCustomerContext = app_customers_resolve_order_context($pdo, $payload, true);
    $customerName = trim((string)($resolvedCustomerContext['customerName'] ?? ($payload['customerName'] ?? '')));
    $phone = trim((string)($resolvedCustomerContext['phone'] ?? ($payload['phone'] ?? '')));
    $customerId = app_customers_parse_id($resolvedCustomerContext['customerId'] ?? null);
    $projectId = app_customers_parse_id($resolvedCustomerContext['projectId'] ?? null);
    $projectContactId = app_customers_parse_id($resolvedCustomerContext['projectContactId'] ?? null);
    $items = $payload['items'] ?? [];
    $total = (int)($payload['total'] ?? 0);
    $status = trim((string)($payload['status'] ?? 'pending'));

    if ($customerName === '' || $phone === '' || !is_array($items) || count($items) === 0) {
        app_json([
            'success' => false,
            'error' => 'customerName, phone and at least one item are required.',
        ], 400);
    }

    if (!$isStaff && app_sales_payload_has_advanced_order_data($payload)) {
        app_json([
            'success' => false,
            'error' => 'Advanced invoice fields are allowed only for authenticated staff.',
        ], 400);
    }

    if ($isStaff) {
        app_sales_validate_override_reasons($items);
    }
    $items = app_sales_sanitize_order_items_for_storage($items);

    if (!app_valid_order_status($status)) {
        $status = 'pending';
    }

    $orderMeta = app_sales_normalize_order_meta_payload($payload, max(0, $total));
    $total = (int)($orderMeta['financials']['grandTotal'] ?? max(0, $total));
    $orderCodeDatePrefix = app_order_code_date_prefix_jalali();

    $orderDate = trim((string)($payload['date'] ?? ''));
    if ($orderDate === '') {
        $orderDate = date('Y/m/d');
    }

    $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE);
    if ($itemsJson === false) {
        app_json([
            'success' => false,
            'error' => 'Unable to serialize items payload.',
        ], 400);
    }

    $orderMetaJson = json_encode($orderMeta, JSON_UNESCAPED_UNICODE);
    if ($orderMetaJson === false) {
        app_json([
            'success' => false,
            'error' => 'Unable to serialize order metadata payload.',
        ], 400);
    }

    $itemsColumn = app_orders_items_column($pdo);
    $metaColumn = app_orders_meta_column($pdo);
    $customerIdColumn = app_orders_customer_id_column($pdo);
    $projectIdColumn = app_orders_project_id_column($pdo);
    $projectContactIdColumn = app_orders_project_contact_id_column($pdo);

    $inserted = false;
    $lastInsertError = null;
    $orderCode = '';
    $maxOrderCodeAttempts = 10;

    for ($attempt = 1; $attempt <= $maxOrderCodeAttempts && !$inserted; $attempt++) {
        $nextSequence = app_sales_next_order_daily_sequence($pdo, $orderCodeDatePrefix, '');
        if ($nextSequence > 999) {
            app_json([
                'success' => false,
                'error' => 'Daily order capacity reached for tracking code generation.',
            ], 429);
        }

        $orderCode = app_generate_order_code($orderCodeDatePrefix, '', $nextSequence, 3);
        $retryDuplicateCode = false;

        foreach (app_sales_orders_date_column_candidates($pdo) as $dateColumn) {
            try {
                $insertCols = "order_code, customer_name, phone, {$dateColumn}, total, status, {$itemsColumn}";
                $insertVals = ':order_code, :customer_name, :phone, :order_date, :total, :status, :items_json';
                $insertParams = [
                    'order_code' => $orderCode,
                    'customer_name' => $customerName,
                    'phone' => $phone,
                    'order_date' => $orderDate,
                    'total' => max(0, $total),
                    'status' => $status,
                    'items_json' => $itemsJson,
                ];
                if ($customerIdColumn !== null) {
                    $insertCols .= ", {$customerIdColumn}";
                    $insertVals .= ', :customer_id';
                    $insertParams['customer_id'] = $customerId;
                }
                if ($projectIdColumn !== null) {
                    $insertCols .= ", {$projectIdColumn}";
                    $insertVals .= ', :project_id';
                    $insertParams['project_id'] = $projectId;
                }
                if ($projectContactIdColumn !== null) {
                    $insertCols .= ", {$projectContactIdColumn}";
                    $insertVals .= ', :project_contact_id';
                    $insertParams['project_contact_id'] = $projectContactId;
                }
                if ($metaColumn !== null) {
                    $insertCols .= ", {$metaColumn}";
                    $insertVals .= ', :order_meta_json';
                    $insertParams['order_meta_json'] = $orderMetaJson;
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
    if ($clientRequestId !== null) {
        app_store_idempotent_order_request_response(
            $pdo,
            $clientRequestId,
            'POST',
            '/api/orders.php',
            $currentUser,
            $id,
            $responsePayload,
            201
        );
    }

    app_json($responsePayload, 201);
}

function app_sales_orders_handle_put(PDO $pdo): void
{
    $actor = app_require_permission('sales.orders.update', $pdo);
    $payload = app_read_json_body();
    $clientRequestId = app_validate_client_request_id($payload['clientRequestId'] ?? null);
    if ($clientRequestId !== null) {
        $existing = app_find_idempotent_order_request($pdo, $clientRequestId, 'PUT', '/api/orders.php', $actor);
        if ($existing !== null) {
            $existingPayload = is_array($existing['payload']) ? $existing['payload'] : ['success' => false, 'error' => 'Invalid idempotency response payload.'];
            app_json($existingPayload, (int)$existing['statusCode']);
        }
    }
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

    $resolvedCustomerContext = app_customers_resolve_order_context($pdo, $payload, true);
    $customerName = trim((string)($resolvedCustomerContext['customerName'] ?? ($payload['customerName'] ?? '')));
    $phone = trim((string)($resolvedCustomerContext['phone'] ?? ($payload['phone'] ?? '')));
    $customerId = app_customers_parse_id($resolvedCustomerContext['customerId'] ?? null);
    $projectId = app_customers_parse_id($resolvedCustomerContext['projectId'] ?? null);
    $projectContactId = app_customers_parse_id($resolvedCustomerContext['projectContactId'] ?? null);
    $items = $payload['items'] ?? [];
    $total = (int)($payload['total'] ?? 0);
    $status = trim((string)($payload['status'] ?? 'pending'));

    if ($customerName === '' || $phone === '' || !is_array($items)) {
        app_json([
            'success' => false,
            'error' => 'customerName, phone and items are required.',
        ], 400);
    }

    if (!app_valid_order_status($status)) {
        app_json([
            'success' => false,
            'error' => 'Invalid order status.',
        ], 400);
    }

    app_sales_validate_override_reasons($items);
    $items = app_sales_sanitize_order_items_for_storage($items);

    $orderMeta = app_sales_normalize_order_meta_payload($payload, max(0, $total));
    $total = (int)($orderMeta['financials']['grandTotal'] ?? max(0, $total));

    $orderDate = trim((string)($payload['date'] ?? date('Y/m/d')));
    $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE);
    if ($itemsJson === false) {
        app_json([
            'success' => false,
            'error' => 'Unable to serialize items payload.',
        ], 400);
    }

    $orderMetaJson = json_encode($orderMeta, JSON_UNESCAPED_UNICODE);
    if ($orderMetaJson === false) {
        app_json([
            'success' => false,
            'error' => 'Unable to serialize order metadata payload.',
        ], 400);
    }

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
                'customer_name' => $customerName,
                'phone' => $phone,
                'order_date' => $orderDate,
                'total' => max(0, $total),
                'status' => $status,
                'items_json' => $itemsJson,
            ];
            if ($customerIdColumn !== null) {
                $setClause .= ", {$customerIdColumn} = :customer_id";
                $updateParams['customer_id'] = $customerId;
            }
            if ($projectIdColumn !== null) {
                $setClause .= ", {$projectIdColumn} = :project_id";
                $updateParams['project_id'] = $projectId;
            }
            if ($projectContactIdColumn !== null) {
                $setClause .= ", {$projectContactIdColumn} = :project_contact_id";
                $updateParams['project_contact_id'] = $projectContactId;
            }
            if ($metaColumn !== null) {
                $setClause .= ", {$metaColumn} = :order_meta_json";
                $updateParams['order_meta_json'] = $orderMetaJson;
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
    if ($clientRequestId !== null) {
        app_store_idempotent_order_request_response(
            $pdo,
            $clientRequestId,
            'PUT',
            '/api/orders.php',
            $actor,
            $id,
            $responsePayload,
            200
        );
    }

    app_json($responsePayload);
}

function app_sales_orders_handle_delete(PDO $pdo): void
{
    $actor = app_require_permission('sales.orders.delete', $pdo);
    $payload = app_read_json_body();

    $id = (int)($payload['id'] ?? 0);
    if ($id <= 0) {
        app_json([
            'success' => false,
            'error' => 'Valid order id is required.',
        ], 400);
    }

    $statusStmt = $pdo->prepare('SELECT order_code, status, total FROM orders WHERE id = :id LIMIT 1');
    $statusStmt->execute(['id' => $id]);
    $statusRow = $statusStmt->fetch();

    if (!$statusRow) {
        app_json([
            'success' => false,
            'error' => 'Order not found.',
        ], 404);
    }

    $status = (string)($statusRow['status'] ?? '');
    if ($status !== 'archived') {
        app_json([
            'success' => false,
            'error' => 'Only archived orders can be deleted.',
        ], 400);
    }

    $deleteStmt = $pdo->prepare('DELETE FROM orders WHERE id = :id');
    $deleteStmt->execute(['id' => $id]);

    app_audit_log(
        $pdo,
        'sales.order.deleted',
        'orders',
        (string)$id,
        [
            'orderCode' => (string)($statusRow['order_code'] ?? ''),
            'status' => $status,
            'total' => (int)($statusRow['total'] ?? 0),
        ],
        $actor
    );

    app_json([
        'success' => true,
        'id' => (string)$id,
    ]);
}

function app_sales_orders_handle_patch(PDO $pdo): void
{
    $actor = app_require_permission('sales.orders.status', $pdo);
    $payload = app_read_json_body();
    $clientRequestId = app_validate_client_request_id($payload['clientRequestId'] ?? null);
    if ($clientRequestId !== null) {
        $existing = app_find_idempotent_order_request($pdo, $clientRequestId, 'PATCH', '/api/orders.php', $actor);
        if ($existing !== null) {
            $existingPayload = is_array($existing['payload']) ? $existing['payload'] : ['success' => false, 'error' => 'Invalid idempotency response payload.'];
            app_json($existingPayload, (int)$existing['statusCode']);
        }
    }
    $expectedUpdatedAt = app_sales_normalize_expected_updated_at($payload['expectedUpdatedAt'] ?? null);

    $id = (int)($payload['id'] ?? 0);
    $status = trim((string)($payload['status'] ?? ''));
    if ($id <= 0 || !app_valid_order_status($status)) {
        app_json([
            'success' => false,
            'error' => 'Valid id and status are required.',
        ], 400);
    }

    $beforeStmt = $pdo->prepare('SELECT ' . app_orders_select_fields($pdo) . ' FROM orders WHERE id = :id LIMIT 1');
    $beforeStmt->execute(['id' => $id]);
    $before = $beforeStmt->fetch();
    if (!$before) {
        app_json([
            'success' => false,
            'error' => 'Order not found.',
        ], 404);
    }
    if (app_sales_is_order_conflict($before, $expectedUpdatedAt)) {
        app_sales_respond_order_conflict($before);
    }
    $beforeStatus = (string)($before['status'] ?? '');

    $stmt = $pdo->prepare('UPDATE orders SET status = :status WHERE id = :id');
    $stmt->execute([
        'id' => $id,
        'status' => $status,
    ]);

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
        'sales.order.status.changed',
        'orders',
        (string)$id,
        [
            'fromStatus' => $beforeStatus,
            'toStatus' => $status,
            'orderCode' => (string)($order['orderCode'] ?? ''),
        ],
        $actor
    );

    $responsePayload = [
        'success' => true,
        'order' => $order,
    ];
    if ($clientRequestId !== null) {
        app_store_idempotent_order_request_response(
            $pdo,
            $clientRequestId,
            'PATCH',
            '/api/orders.php',
            $actor,
            $id,
            $responsePayload,
            200
        );
    }

    app_json($responsePayload);
}

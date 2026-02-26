<?php
declare(strict_types=1);

function app_sales_orders_handle_get(PDO $pdo): void
{
    app_require_auth(['admin', 'manager', 'sales', 'production', 'inventory']);

    $stmt = $pdo->query('SELECT ' . app_orders_select_fields($pdo) . ' FROM orders ORDER BY ' . app_orders_sort_clause($pdo));
    $rows = $stmt->fetchAll();

    $orders = [];
    foreach ($rows as $row) {
        $orders[] = app_order_from_row($row);
    }

    app_json([
        'success' => true,
        'orders' => $orders,
    ]);
}

function app_sales_orders_handle_post(PDO $pdo): void
{
    $payload = app_read_json_body();
    $currentUser = app_current_user();
    $isStaff = $currentUser !== null && in_array((string)$currentUser['role'], ['admin', 'manager', 'sales'], true);

    $customerName = trim((string)($payload['customerName'] ?? ''));
    $phone = trim((string)($payload['phone'] ?? ''));
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

    if (!app_valid_order_status($status)) {
        $status = 'pending';
    }

    $orderMeta = app_sales_normalize_order_meta_payload($payload, max(0, $total));
    $total = (int)($orderMeta['financials']['grandTotal'] ?? max(0, $total));

    $orderCode = trim((string)($payload['orderCode'] ?? ''));
    if ($orderCode === '') {
        $countStmt = $pdo->query('SELECT COUNT(*) AS c FROM orders');
        $countRow = $countStmt->fetch();
        $seq = (int)($countRow['c'] ?? 0) + 1;
        $orderCode = app_generate_order_code($seq);
    }

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

    $inserted = false;
    $lastInsertError = null;
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
            if (!app_sales_is_unknown_column_exception($e, $dateColumn)) {
                throw $e;
            }
        }
    }

    if (!$inserted) {
        if ($lastInsertError instanceof Throwable) {
            throw $lastInsertError;
        }
        throw new RuntimeException('Unable to insert order row.');
    }

    $id = (int)$pdo->lastInsertId();
    $select = $pdo->prepare('SELECT ' . app_orders_select_fields($pdo) . ' FROM orders WHERE id = :id LIMIT 1');
    $select->execute(['id' => $id]);
    $row = $select->fetch();

    app_json([
        'success' => true,
        'order' => $row ? app_order_from_row($row) : null,
    ], 201);
}

function app_sales_orders_handle_put(PDO $pdo): void
{
    app_require_auth(['admin', 'manager', 'sales']);
    $payload = app_read_json_body();

    $id = (int)($payload['id'] ?? 0);
    if ($id <= 0) {
        app_json([
            'success' => false,
            'error' => 'Valid order id is required.',
        ], 400);
    }

    $customerName = trim((string)($payload['customerName'] ?? ''));
    $phone = trim((string)($payload['phone'] ?? ''));
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

    app_json([
        'success' => true,
        'order' => app_order_from_row($row),
    ]);
}

function app_sales_orders_handle_delete(PDO $pdo): void
{
    app_require_auth(['admin', 'manager']);
    $payload = app_read_json_body();

    $id = (int)($payload['id'] ?? 0);
    if ($id <= 0) {
        app_json([
            'success' => false,
            'error' => 'Valid order id is required.',
        ], 400);
    }

    $statusStmt = $pdo->prepare('SELECT status FROM orders WHERE id = :id LIMIT 1');
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

    app_json([
        'success' => true,
        'id' => (string)$id,
    ]);
}

function app_sales_orders_handle_patch(PDO $pdo): void
{
    app_require_auth(['admin', 'manager', 'sales']);
    $payload = app_read_json_body();

    $id = (int)($payload['id'] ?? 0);
    $status = trim((string)($payload['status'] ?? ''));
    if ($id <= 0 || !app_valid_order_status($status)) {
        app_json([
            'success' => false,
            'error' => 'Valid id and status are required.',
        ], 400);
    }

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

    app_json([
        'success' => true,
        'order' => app_order_from_row($row),
    ]);
}

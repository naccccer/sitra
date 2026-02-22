<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../config/db.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
app_ensure_orders_table($pdo);

if ($method === 'GET') {
    app_require_auth(['admin', 'manager']);

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

if ($method === 'POST') {
    $payload = app_read_json_body();

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

    if (!app_valid_order_status($status)) {
        $status = 'pending';
    }

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

    $itemsColumn = app_orders_items_column($pdo);
    $stmt = $pdo->prepare('INSERT INTO orders (order_code, customer_name, phone, order_date, total, status, ' . $itemsColumn . ') VALUES (:order_code, :customer_name, :phone, :order_date, :total, :status, :items_json)');
    $stmt->execute([
        'order_code' => $orderCode,
        'customer_name' => $customerName,
        'phone' => $phone,
        'order_date' => $orderDate,
        'total' => max(0, $total),
        'status' => $status,
        'items_json' => $itemsJson,
    ]);

    $id = (int)$pdo->lastInsertId();
    $select = $pdo->prepare('SELECT ' . app_orders_select_fields($pdo) . ' FROM orders WHERE id = :id LIMIT 1');
    $select->execute(['id' => $id]);
    $row = $select->fetch();

    app_json([
        'success' => true,
        'order' => $row ? app_order_from_row($row) : null,
    ], 201);
}

if ($method === 'PUT') {
    app_require_auth(['admin', 'manager']);
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

    $orderDate = trim((string)($payload['date'] ?? date('Y/m/d')));
    $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE);
    if ($itemsJson === false) {
        app_json([
            'success' => false,
            'error' => 'Unable to serialize items payload.',
        ], 400);
    }

    $itemsColumn = app_orders_items_column($pdo);
    $stmt = $pdo->prepare('UPDATE orders SET customer_name = :customer_name, phone = :phone, order_date = :order_date, total = :total, status = :status, ' . $itemsColumn . ' = :items_json WHERE id = :id');
    $stmt->execute([
        'id' => $id,
        'customer_name' => $customerName,
        'phone' => $phone,
        'order_date' => $orderDate,
        'total' => max(0, $total),
        'status' => $status,
        'items_json' => $itemsJson,
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

// PATCH
app_require_auth(['admin', 'manager']);
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

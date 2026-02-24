<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../config/db.php';

function app_payload_has_advanced_order_data(array $payload): bool
{
    if (array_key_exists('financials', $payload) || array_key_exists('payments', $payload) || array_key_exists('invoiceNotes', $payload)) {
        return true;
    }

    $items = $payload['items'] ?? [];
    if (!is_array($items)) {
        return false;
    }

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }

        if (($item['itemType'] ?? 'catalog') === 'manual') {
            return true;
        }

        $meta = is_array($item['pricingMeta'] ?? null) ? $item['pricingMeta'] : [];
        $overrideUnitPrice = (int)($meta['overrideUnitPrice'] ?? 0);
        $itemDiscountAmount = (int)($meta['itemDiscountAmount'] ?? 0);
        $itemDiscountType = (string)($meta['itemDiscountType'] ?? 'none');

        if ($overrideUnitPrice > 0 || $itemDiscountAmount > 0 || $itemDiscountType !== 'none') {
            return true;
        }
    }

    return false;
}

function app_validate_override_reasons(array $items): void
{
    foreach ($items as $index => $item) {
        if (!is_array($item)) {
            continue;
        }

        $meta = is_array($item['pricingMeta'] ?? null) ? $item['pricingMeta'] : [];
        $overrideUnitPrice = (int)($meta['overrideUnitPrice'] ?? 0);
        $floorUnitPrice = (int)($meta['floorUnitPrice'] ?? 0);
        $isBelowFloor = (bool)($meta['isBelowFloor'] ?? false);
        if ($overrideUnitPrice <= 0) {
            continue;
        }

        if (!$isBelowFloor && $floorUnitPrice > 0) {
            $isBelowFloor = $overrideUnitPrice < $floorUnitPrice;
        }

        if (!$isBelowFloor) {
            continue;
        }

        $reason = trim((string)($meta['overrideReason'] ?? ''));
        if ($reason === '') {
            app_json([
                'success' => false,
                'error' => 'Override reason is required when price is below floor.',
                'itemIndex' => $index,
            ], 400);
        }
    }
}

function app_normalize_order_meta_payload(array $payload, int $total): array
{
    $defaults = app_order_meta_defaults($total);
    $financialsInput = is_array($payload['financials'] ?? null) ? $payload['financials'] : [];
    $financials = array_merge($defaults['financials'], $financialsInput);

    $paymentsInput = is_array($payload['payments'] ?? null) ? $payload['payments'] : [];
    $payments = [];
    foreach ($paymentsInput as $payment) {
        if (!is_array($payment)) {
            continue;
        }
        $receipt = app_normalize_payment_receipt($payment['receipt'] ?? null);
        $payments[] = [
            'id' => (string)($payment['id'] ?? uniqid('pay_', true)),
            'date' => (string)($payment['date'] ?? date('Y/m/d')),
            'amount' => max(0, (int)($payment['amount'] ?? 0)),
            'method' => app_normalize_payment_method($payment['method'] ?? 'cash'),
            'reference' => (string)($payment['reference'] ?? ''),
            'note' => (string)($payment['note'] ?? ''),
            'receipt' => $receipt,
        ];
    }

    $paidTotal = 0;
    foreach ($payments as $payment) {
        $paidTotal += (int)($payment['amount'] ?? 0);
    }

    $financials['subTotal'] = max(0, (int)($financials['subTotal'] ?? 0));
    $financials['itemDiscountTotal'] = max(0, (int)($financials['itemDiscountTotal'] ?? 0));
    $financials['invoiceDiscountType'] = (string)($financials['invoiceDiscountType'] ?? 'none');
    $financials['invoiceDiscountValue'] = max(0, (int)($financials['invoiceDiscountValue'] ?? 0));
    $financials['invoiceDiscountAmount'] = max(0, (int)($financials['invoiceDiscountAmount'] ?? 0));
    $financials['taxEnabled'] = (bool)($financials['taxEnabled'] ?? false);
    $financials['taxRate'] = max(0, min(100, (int)($financials['taxRate'] ?? 10)));
    $financials['taxAmount'] = max(0, (int)($financials['taxAmount'] ?? 0));

    $grandTotal = max(0, (int)($financials['grandTotal'] ?? $total));
    if ($grandTotal === 0 && $total > 0) {
        $grandTotal = $total;
    }

    $paidTotal = max($paidTotal, max(0, (int)($financials['paidTotal'] ?? 0)));
    $dueAmount = max(0, $grandTotal - $paidTotal);

    $paymentStatus = (string)($financials['paymentStatus'] ?? '');
    if ($paymentStatus === '') {
        if ($dueAmount <= 0) {
            $paymentStatus = 'paid';
        } elseif ($paidTotal > 0) {
            $paymentStatus = 'partial';
        } else {
            $paymentStatus = 'unpaid';
        }
    }

    $financials['grandTotal'] = $grandTotal;
    $financials['paidTotal'] = $paidTotal;
    $financials['dueAmount'] = $dueAmount;
    $financials['paymentStatus'] = $paymentStatus;

    return [
        'financials' => $financials,
        'payments' => $payments,
        'invoiceNotes' => (string)($payload['invoiceNotes'] ?? ''),
    ];
}

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
    $currentUser = app_current_user();
    $isStaff = $currentUser !== null && in_array((string)$currentUser['role'], ['admin', 'manager'], true);

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

    if (!$isStaff && app_payload_has_advanced_order_data($payload)) {
        app_json([
            'success' => false,
            'error' => 'Advanced invoice fields are allowed only for authenticated staff.',
        ], 400);
    }

    if ($isStaff) {
        app_validate_override_reasons($items);
    }

    if (!app_valid_order_status($status)) {
        $status = 'pending';
    }

    $orderMeta = app_normalize_order_meta_payload($payload, max(0, $total));
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

    if ($metaColumn !== null) {
        $stmt = $pdo->prepare('INSERT INTO orders (order_code, customer_name, phone, order_date, total, status, ' . $itemsColumn . ', ' . $metaColumn . ') VALUES (:order_code, :customer_name, :phone, :order_date, :total, :status, :items_json, :order_meta_json)');
        $stmt->execute([
            'order_code' => $orderCode,
            'customer_name' => $customerName,
            'phone' => $phone,
            'order_date' => $orderDate,
            'total' => max(0, $total),
            'status' => $status,
            'items_json' => $itemsJson,
            'order_meta_json' => $orderMetaJson,
        ]);
    } else {
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

    app_validate_override_reasons($items);

    $orderMeta = app_normalize_order_meta_payload($payload, max(0, $total));
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

    if ($metaColumn !== null) {
        $stmt = $pdo->prepare('UPDATE orders SET customer_name = :customer_name, phone = :phone, order_date = :order_date, total = :total, status = :status, ' . $itemsColumn . ' = :items_json, ' . $metaColumn . ' = :order_meta_json WHERE id = :id');
        $stmt->execute([
            'id' => $id,
            'customer_name' => $customerName,
            'phone' => $phone,
            'order_date' => $orderDate,
            'total' => max(0, $total),
            'status' => $status,
            'items_json' => $itemsJson,
            'order_meta_json' => $orderMetaJson,
        ]);
    } else {
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

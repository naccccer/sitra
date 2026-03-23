<?php
declare(strict_types=1);

require_once __DIR__ . '/orders_idempotency.php';
require_once __DIR__ . '/orders_status.php';

function app_sales_orders_delete_response(PDO $pdo, array $payload, array $actor): array
{
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
    app_sales_orders_require_archived_for_delete($status);

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

    return [
        'payload' => [
            'success' => true,
            'id' => (string)$id,
        ],
        'statusCode' => 200,
    ];
}

function app_sales_orders_patch_response(PDO $pdo, array $payload, array $actor): array
{
    $clientRequestId = app_sales_orders_handle_idempotency_request($pdo, $payload, 'PATCH', $actor);
    $expectedUpdatedAt = app_sales_normalize_expected_updated_at($payload['expectedUpdatedAt'] ?? null);

    $id = (int)($payload['id'] ?? 0);
    $status = trim((string)($payload['status'] ?? ''));
    app_sales_orders_require_valid_patch_status_request($id, $status);

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
        app_sales_respond_order_conflict($before, $pdo);
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

    $order = app_order_from_row($row, $pdo);
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
    app_sales_orders_store_idempotency_response(
        $pdo,
        $clientRequestId,
        'PATCH',
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

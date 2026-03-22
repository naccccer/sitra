<?php
declare(strict_types=1);

function app_sales_orders_get_response(PDO $pdo): array
{
    $LIMIT = 50;
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
        $orders[] = app_order_from_row($row, $pdo);
    }

    $nextCursor = null;
    if ($hasMore && count($orders) > 0) {
        $lastOrder = end($orders);
        $nextCursor = (string)($lastOrder['id'] ?? '');
    }

    return [
        'payload' => [
            'success' => true,
            'orders' => $orders,
            'hasMore' => $hasMore,
            'nextCursor' => $nextCursor,
        ],
        'statusCode' => 200,
    ];
}

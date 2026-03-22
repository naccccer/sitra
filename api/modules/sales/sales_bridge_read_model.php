<?php
declare(strict_types=1);

/**
 * Sales-owned read model for accounting bridge jobs.
 * Public facade: consumers call this instead of querying orders directly.
 */
function app_sales_bridge_fetch_orders_for_accounting(
    PDO $pdo,
    string $mode,
    ?int $orderId,
    ?string $dateFrom,
    ?string $dateTo,
    int $limit = 2000
): array {
    $orderWhere = [];
    $orderParams = [];

    if ($mode === 'order') {
        if ($orderId === null) {
            return [];
        }
        $orderWhere[] = 'id = :order_id';
        $orderParams['order_id'] = $orderId;
    } else {
        if ($dateFrom !== null) {
            $orderWhere[] = 'created_at >= :date_from';
            $orderParams['date_from'] = $dateFrom . ' 00:00:00';
        }
        if ($dateTo !== null) {
            $orderWhere[] = 'created_at <= :date_to';
            $orderParams['date_to'] = $dateTo . ' 23:59:59';
        }
        $orderWhere[] = "order_meta_json IS NOT NULL AND order_meta_json != 'null'";
    }

    $sql = 'SELECT id, order_code, customer_id, order_meta_json FROM orders';
    if ($orderWhere) {
        $sql .= ' WHERE ' . implode(' AND ', $orderWhere);
    }
    $sql .= ' ORDER BY id ASC LIMIT :limit';

    $stmt = $pdo->prepare($sql);
    foreach ($orderParams as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }
    $stmt->bindValue(':limit', max(1, $limit), PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll();
    return is_array($rows) ? $rows : [];
}

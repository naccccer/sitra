<?php
declare(strict_types=1);

require_once __DIR__ . '/order_financials_repository.php';

/**
 * Sales-owned read model for accounting bridge jobs.
 * Public facade: consumers call this instead of querying orders directly.
 *
 * All financial data is read exclusively from structured tables
 * (order_financials, order_payments). No JSON parsing.
 */
function app_sales_bridge_fetch_orders_for_accounting(
    PDO $pdo,
    string $mode,
    ?int $orderId,
    ?string $dateFrom,
    ?string $dateTo,
    int $limit = 2000
): array {
    app_ensure_order_financials_tables($pdo);

    $orderWhere = [];
    $orderParams = [];

    if ($mode === 'order') {
        if ($orderId === null) {
            return [];
        }
        $orderWhere[] = 'o.id = :order_id';
        $orderParams['order_id'] = $orderId;
    } else {
        if ($dateFrom !== null) {
            $orderWhere[] = 'o.created_at >= :date_from';
            $orderParams['date_from'] = $dateFrom . ' 00:00:00';
        }
        if ($dateTo !== null) {
            $orderWhere[] = 'o.created_at <= :date_to';
            $orderParams['date_to'] = $dateTo . ' 23:59:59';
        }
        // Only include orders that have at least one payment row.
        $orderWhere[] = 'EXISTS (SELECT 1 FROM order_payments WHERE order_id = o.id)';
    }

    $sql = 'SELECT o.id, o.order_code, o.customer_id FROM orders o';
    if ($orderWhere) {
        $sql .= ' WHERE ' . implode(' AND ', $orderWhere);
    }
    $sql .= ' ORDER BY o.id ASC LIMIT :limit';

    $stmt = $pdo->prepare($sql);
    foreach ($orderParams as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }
    $stmt->bindValue(':limit', max(1, $limit), PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll();
    if (!is_array($rows) || count($rows) === 0) {
        return [];
    }

    // Attach structured payments from order_payments table.
    $result = [];
    foreach ($rows as $row) {
        $oid = (int)$row['id'];
        $result[] = [
            'id' => $oid,
            'order_code' => (string)$row['order_code'],
            'customer_id' => $row['customer_id'] !== null ? (int)$row['customer_id'] : null,
            'payments' => app_read_order_payments($pdo, $oid),
        ];
    }

    return $result;
}

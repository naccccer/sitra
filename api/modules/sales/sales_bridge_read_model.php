<?php
declare(strict_types=1);

require_once __DIR__ . '/../../common/order_financials_repository.php';

/**
 * Sales-owned read model for accounting bridge jobs.
 * Public facade: consumers call this instead of querying orders directly.
 *
 * Phase 1 (dual-read): Tries order_payments table first, falls back to
 * order_meta_json if the structured table has no rows for a given order.
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
    if (!is_array($rows)) {
        return [];
    }

    // Enrich each order with structured payments when available.
    // Falls back to order_meta_json if the order_payments table
    // has no rows (pre-backfill orders).
    $useStructuredPayments = app_table_is_queryable($pdo, 'order_payments');

    foreach ($rows as &$row) {
        $oid = (int)$row['id'];
        $structuredPayments = null;

        if ($useStructuredPayments) {
            try {
                $structuredPayments = app_read_order_payments($pdo, $oid);
            } catch (Throwable $e) {
                $structuredPayments = null;
            }
        }

        if (is_array($structuredPayments) && count($structuredPayments) > 0) {
            // Inject structured payments into the meta so the bridge
            // consumer code needs zero changes.
            $meta = json_decode((string)($row['order_meta_json'] ?? ''), true);
            if (!is_array($meta)) {
                $meta = [];
            }
            $meta['payments'] = $structuredPayments;
            $row['order_meta_json'] = json_encode($meta, JSON_UNESCAPED_UNICODE);
        }
        // else: keep original order_meta_json as-is (fallback)
    }
    unset($row);

    return $rows;
}

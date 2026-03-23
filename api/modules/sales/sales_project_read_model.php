<?php
declare(strict_types=1);

require_once __DIR__ . '/order_financials_repository.php';

/**
 * Sales-owned public read-model facade for project financial summaries.
 */
function app_sales_project_financial_summary(PDO $pdo, int $projectId): array
{
    $result = app_sales_project_financial_summary_batch($pdo, [$projectId]);
    return $result[$projectId] ?? ['ordersCount' => 0, 'totalAmount' => 0, 'paidAmount' => 0, 'dueAmount' => 0];
}

/**
 * Batch-computes financial summaries for multiple projects in 3 queries total:
 *   1. All orders for the given project IDs
 *   2. All order_financials for those orders
 *   3. All order_payments for those orders
 *
 * Returns associative array keyed by project_id.
 */
function app_sales_project_financial_summary_batch(PDO $pdo, array $projectIds): array
{
    $empty = ['ordersCount' => 0, 'totalAmount' => 0, 'paidAmount' => 0, 'dueAmount' => 0];

    if (count($projectIds) === 0) {
        return [];
    }

    $projectColumn = app_orders_project_id_column($pdo);
    if ($projectColumn === null) {
        $result = [];
        foreach ($projectIds as $pid) {
            $result[(int)$pid] = $empty;
        }
        return $result;
    }

    // Query 1: all orders for the requested projects
    $placeholders = implode(',', array_fill(0, count($projectIds), '?'));
    $stmt = $pdo->prepare(
        'SELECT ' . app_orders_select_fields($pdo) .
        " FROM orders WHERE {$projectColumn} IN ({$placeholders})"
    );
    $stmt->execute(array_values(array_map('intval', $projectIds)));
    $orderRows = $stmt->fetchAll();

    // Collect order IDs and group rows by project
    $orderIds = [];
    $ordersByProject = [];
    foreach ($orderRows as $row) {
        $oid = (int)$row['id'];
        $pid = (int)$row[$projectColumn];
        $orderIds[] = $oid;
        $ordersByProject[$pid][] = $row;
    }

    // Query 2+3: batch-fetch financials and payments for all orders
    $financialsMap = [];
    $paymentsMap = [];
    if (count($orderIds) > 0 && app_table_is_queryable($pdo, 'order_financials')) {
        $financialsMap = app_read_order_financials_batch($pdo, $orderIds);
        $paymentsMap = app_read_order_payments_batch($pdo, $orderIds);
    }

    // Aggregate per project
    $result = [];
    foreach ($projectIds as $pid) {
        $pid = (int)$pid;
        $rows = $ordersByProject[$pid] ?? [];

        $ordersCount = 0;
        $totalAmount = 0;
        $paidAmount = 0;
        $dueAmount = 0;

        foreach ($rows as $row) {
            $oid = (int)$row['id'];
            $baseTotal = max(0, (int)$row['total']);
            $ordersCount++;

            $stored = $financialsMap[$oid] ?? null;
            if ($stored !== null) {
                $grandTotal = $stored['grandTotal'];
                if ($grandTotal === 0 && $baseTotal > 0) {
                    $grandTotal = $baseTotal;
                }
                $payments = $paymentsMap[$oid] ?? [];
                $derived = app_compute_payment_derived_fields($grandTotal, $payments);

                $totalAmount += $grandTotal;
                $paidAmount += $derived['paidTotal'];
                $dueAmount += $derived['dueAmount'];
            } else {
                $totalAmount += $baseTotal;
                $dueAmount += $baseTotal;
            }
        }

        $result[$pid] = [
            'ordersCount' => $ordersCount,
            'totalAmount' => $totalAmount,
            'paidAmount' => $paidAmount,
            'dueAmount' => $dueAmount,
        ];
    }

    return $result;
}

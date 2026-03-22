<?php
declare(strict_types=1);

/**
 * Sales-owned public read-model facade for project financial summaries.
 */
function app_sales_project_financial_summary(PDO $pdo, int $projectId): array
{
    $projectColumn = app_orders_project_id_column($pdo);
    if ($projectColumn === null) {
        return ['ordersCount' => 0, 'totalAmount' => 0, 'paidAmount' => 0, 'dueAmount' => 0];
    }

    $stmt = $pdo->prepare('SELECT ' . app_orders_select_fields($pdo) . " FROM orders WHERE {$projectColumn} = :project_id");
    $stmt->execute(['project_id' => $projectId]);
    $rows = $stmt->fetchAll();

    $ordersCount = 0;
    $totalAmount = 0;
    $paidAmount = 0;
    $dueAmount = 0;
    foreach ($rows as $row) {
        $order = app_order_from_row($row);
        $ordersCount += 1;
        $totalAmount += (int)($order['financials']['grandTotal'] ?? $order['total'] ?? 0);
        $paidAmount += (int)($order['financials']['paidTotal'] ?? 0);
        $dueAmount += (int)($order['financials']['dueAmount'] ?? 0);
    }

    return [
        'ordersCount' => $ordersCount,
        'totalAmount' => $totalAmount,
        'paidAmount' => $paidAmount,
        'dueAmount' => $dueAmount,
    ];
}

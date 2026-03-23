<?php
declare(strict_types=1);

/**
 * Batch-read helpers for order_financials and order_payments tables.
 *
 * Extracted from order_financials_repository.php to keep file sizes
 * within the project's 300-line limit.  These functions are used by
 * sales_project_read_model.php for multi-project financial summaries.
 */

// ─── BATCH READ: order_financials for multiple orders ─────────────────────────

/**
 * Batch-reads stored financial fields for multiple orders in a single query.
 * Returns an associative array keyed by order_id.
 */
function app_read_order_financials_batch(PDO $pdo, array $orderIds): array
{
    if (count($orderIds) === 0) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT * FROM order_financials WHERE order_id IN ({$placeholders})"
    );
    $stmt->execute(array_values($orderIds));
    $rows = $stmt->fetchAll();

    $result = [];
    foreach ($rows as $row) {
        $oid = (int)$row['order_id'];
        $result[$oid] = [
            'subTotal' => (int)$row['sub_total'],
            'itemDiscountTotal' => (int)$row['item_discount_total'],
            'invoiceDiscountType' => (string)$row['invoice_discount_type'],
            'invoiceDiscountValue' => (int)$row['invoice_discount_value'],
            'invoiceDiscountAmount' => (int)$row['invoice_discount_amount'],
            'taxEnabled' => (bool)(int)$row['tax_enabled'],
            'taxRate' => (int)$row['tax_rate'],
            'taxAmount' => (int)$row['tax_amount'],
            'grandTotal' => (int)$row['grand_total'],
            'invoiceNotes' => (string)($row['invoice_notes'] ?? ''),
        ];
    }

    return $result;
}

// ─── BATCH READ: order_payments for multiple orders ──────────────────────────

/**
 * Batch-reads all payments for multiple orders in a single query.
 * Returns an associative array keyed by order_id, each value is an array of payments.
 */
function app_read_order_payments_batch(PDO $pdo, array $orderIds): array
{
    if (count($orderIds) === 0) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT * FROM order_payments WHERE order_id IN ({$placeholders}) ORDER BY created_at ASC, id ASC"
    );
    $stmt->execute(array_values($orderIds));
    $rows = $stmt->fetchAll();

    $result = [];
    foreach ($rows as $row) {
        $oid = (int)$row['order_id'];
        if (!isset($result[$oid])) {
            $result[$oid] = [];
        }

        $receipt = null;
        $filePath = trim((string)($row['receipt_file_path'] ?? ''));
        if ($filePath !== '') {
            $receipt = [
                'filePath' => $filePath,
                'originalName' => (string)($row['receipt_original_name'] ?? ''),
                'mimeType' => (string)($row['receipt_mime_type'] ?? ''),
                'size' => max(0, (int)($row['receipt_size'] ?? 0)),
            ];
        }

        $result[$oid][] = [
            'id' => (string)$row['local_id'],
            'date' => (string)$row['payment_date'],
            'amount' => max(0, (int)$row['amount']),
            'method' => (string)$row['method'],
            'reference' => (string)($row['reference'] ?? ''),
            'note' => (string)($row['note'] ?? ''),
            'receipt' => $receipt,
        ];
    }

    return $result;
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/order_financials_batch.php';

/**
 * Sales-owned repository for order_financials and order_payments tables.
 *
 * Ownership: Sales module (read + write).
 * Accounting module reads via the sales bridge facade only.
 *
 * IMPORTANT: paidTotal, dueAmount, and paymentStatus are NEVER stored.
 * They are derived at read time from order_payments rows + grandTotal.
 * This ensures order_payments is the single source of truth for payment state.
 */

// ─── DERIVED FIELD COMPUTATION ───────────────────────────────────────────────

/**
 * Computes paidTotal, dueAmount, paymentStatus from payments array and grandTotal.
 * This is the single canonical computation — every read path must use this.
 */
function app_compute_payment_derived_fields(int $grandTotal, array $payments): array
{
    $paidTotal = 0;
    foreach ($payments as $payment) {
        if (is_array($payment)) {
            $paidTotal += max(0, (int)($payment['amount'] ?? 0));
        }
    }

    $dueAmount = max(0, $grandTotal - $paidTotal);

    if ($dueAmount <= 0 && $grandTotal > 0) {
        $paymentStatus = 'paid';
    } elseif ($paidTotal > 0) {
        $paymentStatus = 'partial';
    } elseif ($grandTotal <= 0) {
        $paymentStatus = 'paid';
    } else {
        $paymentStatus = 'unpaid';
    }

    return [
        'paidTotal' => $paidTotal,
        'dueAmount' => $dueAmount,
        'paymentStatus' => $paymentStatus,
    ];
}

// ─── WRITE: order_financials ─────────────────────────────────────────────────

/**
 * Upserts stored financial fields for an order.
 * Does NOT write paidTotal/dueAmount/paymentStatus — those are derived.
 */
function app_upsert_order_financials(PDO $pdo, int $orderId, array $financials, string $invoiceNotes = ''): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO order_financials
            (order_id, sub_total, item_discount_total, order_stage,
             invoice_discount_type, invoice_discount_value, invoice_discount_amount,
             tax_enabled, tax_rate, tax_amount,
             grand_total, invoice_notes)
         VALUES
            (:order_id, :sub_total, :item_discount_total, :order_stage,
             :invoice_discount_type, :invoice_discount_value, :invoice_discount_amount,
             :tax_enabled, :tax_rate, :tax_amount,
             :grand_total, :invoice_notes)
         ON DUPLICATE KEY UPDATE
            sub_total = VALUES(sub_total),
            item_discount_total = VALUES(item_discount_total),
            order_stage = VALUES(order_stage),
            invoice_discount_type = VALUES(invoice_discount_type),
            invoice_discount_value = VALUES(invoice_discount_value),
            invoice_discount_amount = VALUES(invoice_discount_amount),
            tax_enabled = VALUES(tax_enabled),
            tax_rate = VALUES(tax_rate),
            tax_amount = VALUES(tax_amount),
            grand_total = VALUES(grand_total),
            invoice_notes = VALUES(invoice_notes)'
    );

    $discountType = (string)($financials['invoiceDiscountType'] ?? 'none');
    if (!in_array($discountType, ['none', 'percent', 'fixed'], true)) {
        $discountType = 'none';
    }

    $stmt->execute([
        'order_id' => $orderId,
        'sub_total' => max(0, (int)($financials['subTotal'] ?? 0)),
        'item_discount_total' => max(0, (int)($financials['itemDiscountTotal'] ?? 0)),
        'order_stage' => trim((string)($financials['orderStage'] ?? 'registered')),
        'invoice_discount_type' => $discountType,
        'invoice_discount_value' => max(0, (int)($financials['invoiceDiscountValue'] ?? 0)),
        'invoice_discount_amount' => max(0, (int)($financials['invoiceDiscountAmount'] ?? 0)),
        'tax_enabled' => (int)(bool)($financials['taxEnabled'] ?? false),
        'tax_rate' => max(0, (int)($financials['taxRate'] ?? 10)),
        'tax_amount' => max(0, (int)($financials['taxAmount'] ?? 0)),
        'grand_total' => max(0, (int)($financials['grandTotal'] ?? 0)),
        'invoice_notes' => $invoiceNotes,
    ]);
}

// ─── WRITE: order_payments ───────────────────────────────────────────────────

/**
 * Replaces all payments for an order with the given array.
 * Uses DELETE + INSERT to handle additions, removals, and modifications atomically.
 */
function app_sync_order_payments(PDO $pdo, int $orderId, array $payments): void
{
    $pdo->prepare('DELETE FROM order_payments WHERE order_id = :order_id')
        ->execute(['order_id' => $orderId]);

    if (count($payments) === 0) {
        return;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO order_payments
            (order_id, local_id, payment_date, amount, method,
             reference, note,
             receipt_file_path, receipt_original_name, receipt_mime_type, receipt_size)
         VALUES
            (:order_id, :local_id, :payment_date, :amount, :method,
             :reference, :note,
             :receipt_file_path, :receipt_original_name, :receipt_mime_type, :receipt_size)'
    );

    foreach ($payments as $payment) {
        if (!is_array($payment)) {
            continue;
        }

        $method = (string)($payment['method'] ?? 'cash');
        if (!in_array($method, ['cash', 'card', 'check', 'other'], true)) {
            $method = 'cash';
        }

        $receipt = $payment['receipt'] ?? null;

        $stmt->execute([
            'order_id' => $orderId,
            'local_id' => (string)($payment['id'] ?? uniqid('pay_', true)),
            'payment_date' => (string)($payment['date'] ?? date('Y/m/d')),
            'amount' => max(0, (int)($payment['amount'] ?? 0)),
            'method' => $method,
            'reference' => (string)($payment['reference'] ?? ''),
            'note' => (string)($payment['note'] ?? ''),
            'receipt_file_path' => is_array($receipt) ? (string)($receipt['filePath'] ?? '') : null,
            'receipt_original_name' => is_array($receipt) ? (string)($receipt['originalName'] ?? '') : null,
            'receipt_mime_type' => is_array($receipt) ? (string)($receipt['mimeType'] ?? '') : null,
            'receipt_size' => is_array($receipt) ? max(0, (int)($receipt['size'] ?? 0)) : null,
        ]);
    }
}

// ─── COMBINED WRITE (entry point for order create/update) ────────────────────

/**
 * Writes stored financials + payments to structured tables (source of truth).
 */
function app_save_order_financials(PDO $pdo, int $orderId, array $orderMeta): void
{
    app_ensure_order_financials_tables($pdo);

    $financials = is_array($orderMeta['financials'] ?? null) ? $orderMeta['financials'] : [];
    $payments = is_array($orderMeta['payments'] ?? null) ? $orderMeta['payments'] : [];
    $invoiceNotes = (string)($orderMeta['invoiceNotes'] ?? '');

    app_upsert_order_financials($pdo, $orderId, $financials, $invoiceNotes);
    app_sync_order_payments($pdo, $orderId, $payments);
}

// ─── READ: order_financials (stored fields only) ─────────────────────────────

/**
 * Returns stored financial fields from order_financials table.
 * Does NOT include derived fields — caller must compute those via
 * app_compute_payment_derived_fields().
 */
function app_read_order_financials(PDO $pdo, int $orderId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM order_financials WHERE order_id = :order_id LIMIT 1'
    );
    $stmt->execute(['order_id' => $orderId]);
    $row = $stmt->fetch();

    if (!$row) {
        return null;
    }

    return [
        'subTotal' => (int)$row['sub_total'],
        'itemDiscountTotal' => (int)$row['item_discount_total'],
        'orderStage' => (string)($row['order_stage'] ?? 'registered'),
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

// ─── READ: order_payments ────────────────────────────────────────────────────

function app_read_order_payments(PDO $pdo, int $orderId): array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM order_payments WHERE order_id = :order_id ORDER BY created_at ASC, id ASC'
    );
    $stmt->execute(['order_id' => $orderId]);
    $rows = $stmt->fetchAll();

    if (!is_array($rows)) {
        return [];
    }

    $payments = [];
    foreach ($rows as $row) {
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

        $payments[] = [
            'id' => (string)$row['local_id'],
            'date' => (string)$row['payment_date'],
            'amount' => max(0, (int)$row['amount']),
            'method' => (string)$row['method'],
            'reference' => (string)($row['reference'] ?? ''),
            'note' => (string)($row['note'] ?? ''),
            'receipt' => $receipt,
        ];
    }

    return $payments;
}

// ─── READ: full financials + derived fields (for API responses) ──────────────

/**
 * Reads stored financials + payments from tables and computes derived fields.
 * Returns the complete financials array matching the API response shape.
 * Returns null if no order_financials row exists (caller uses defaults).
 */
function app_read_order_financials_complete(PDO $pdo, int $orderId, int $baseTotal): ?array
{
    $stored = app_read_order_financials($pdo, $orderId);
    if ($stored === null) {
        return null;
    }

    $payments = app_read_order_payments($pdo, $orderId);

    $grandTotal = $stored['grandTotal'];
    if ($grandTotal === 0 && $baseTotal > 0) {
        $grandTotal = $baseTotal;
    }

    $derived = app_compute_payment_derived_fields($grandTotal, $payments);

    return [
        'financials' => array_merge($stored, [
            'grandTotal' => $grandTotal,
            'paidTotal' => $derived['paidTotal'],
            'dueAmount' => $derived['dueAmount'],
            'paymentStatus' => $derived['paymentStatus'],
        ]),
        'payments' => $payments,
        'invoiceNotes' => $stored['invoiceNotes'],
    ];
}


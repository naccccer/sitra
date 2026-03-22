<?php
declare(strict_types=1);

/**
 * Sales-owned repository for order_financials and order_payments tables.
 *
 * Ownership: Sales module (read + write).
 * Accounting module reads via the sales bridge facade only.
 */

// ─── WRITE: order_financials ─────────────────────────────────────────────────

function app_upsert_order_financials(PDO $pdo, int $orderId, array $financials, string $invoiceNotes = ''): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO order_financials
            (order_id, sub_total, item_discount_total,
             invoice_discount_type, invoice_discount_value, invoice_discount_amount,
             tax_enabled, tax_rate, tax_amount,
             grand_total, paid_total, due_amount, payment_status,
             invoice_notes)
         VALUES
            (:order_id, :sub_total, :item_discount_total,
             :invoice_discount_type, :invoice_discount_value, :invoice_discount_amount,
             :tax_enabled, :tax_rate, :tax_amount,
             :grand_total, :paid_total, :due_amount, :payment_status,
             :invoice_notes)
         ON DUPLICATE KEY UPDATE
            sub_total = VALUES(sub_total),
            item_discount_total = VALUES(item_discount_total),
            invoice_discount_type = VALUES(invoice_discount_type),
            invoice_discount_value = VALUES(invoice_discount_value),
            invoice_discount_amount = VALUES(invoice_discount_amount),
            tax_enabled = VALUES(tax_enabled),
            tax_rate = VALUES(tax_rate),
            tax_amount = VALUES(tax_amount),
            grand_total = VALUES(grand_total),
            paid_total = VALUES(paid_total),
            due_amount = VALUES(due_amount),
            payment_status = VALUES(payment_status),
            invoice_notes = VALUES(invoice_notes)'
    );

    $discountType = (string)($financials['invoiceDiscountType'] ?? 'none');
    if (!in_array($discountType, ['none', 'percent', 'fixed'], true)) {
        $discountType = 'none';
    }

    $paymentStatus = (string)($financials['paymentStatus'] ?? 'unpaid');
    if (!in_array($paymentStatus, ['unpaid', 'partial', 'paid'], true)) {
        $paymentStatus = 'unpaid';
    }

    $stmt->execute([
        'order_id' => $orderId,
        'sub_total' => max(0, (int)($financials['subTotal'] ?? 0)),
        'item_discount_total' => max(0, (int)($financials['itemDiscountTotal'] ?? 0)),
        'invoice_discount_type' => $discountType,
        'invoice_discount_value' => max(0, (int)($financials['invoiceDiscountValue'] ?? 0)),
        'invoice_discount_amount' => max(0, (int)($financials['invoiceDiscountAmount'] ?? 0)),
        'tax_enabled' => (int)(bool)($financials['taxEnabled'] ?? false),
        'tax_rate' => max(0, (int)($financials['taxRate'] ?? 10)),
        'tax_amount' => max(0, (int)($financials['taxAmount'] ?? 0)),
        'grand_total' => max(0, (int)($financials['grandTotal'] ?? 0)),
        'paid_total' => max(0, (int)($financials['paidTotal'] ?? 0)),
        'due_amount' => max(0, (int)($financials['dueAmount'] ?? 0)),
        'payment_status' => $paymentStatus,
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

// ─── COMBINED WRITE (dual-write entry point) ─────────────────────────────────

/**
 * Writes financials + payments to the structured tables.
 * Called alongside the existing order_meta_json write for backward compatibility.
 */
function app_save_order_financials(PDO $pdo, int $orderId, array $orderMeta): void
{
    try {
        app_ensure_order_financials_tables($pdo);

        $financials = is_array($orderMeta['financials'] ?? null) ? $orderMeta['financials'] : [];
        $payments = is_array($orderMeta['payments'] ?? null) ? $orderMeta['payments'] : [];
        $invoiceNotes = (string)($orderMeta['invoiceNotes'] ?? '');

        app_upsert_order_financials($pdo, $orderId, $financials, $invoiceNotes);
        app_sync_order_payments($pdo, $orderId, $payments);
    } catch (Throwable $e) {
        // Dual-write must not break the primary flow.
        // The JSON blob remains the source of truth during Phase 1.
    }
}

// ─── READ: order_financials ──────────────────────────────────────────────────

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
        'invoiceDiscountType' => (string)$row['invoice_discount_type'],
        'invoiceDiscountValue' => (int)$row['invoice_discount_value'],
        'invoiceDiscountAmount' => (int)$row['invoice_discount_amount'],
        'taxEnabled' => (bool)(int)$row['tax_enabled'],
        'taxRate' => (int)$row['tax_rate'],
        'taxAmount' => (int)$row['tax_amount'],
        'grandTotal' => (int)$row['grand_total'],
        'paidTotal' => (int)$row['paid_total'],
        'dueAmount' => (int)$row['due_amount'],
        'paymentStatus' => (string)$row['payment_status'],
    ];
}

function app_read_order_invoice_notes(PDO $pdo, int $orderId): string
{
    $stmt = $pdo->prepare(
        'SELECT invoice_notes FROM order_financials WHERE order_id = :order_id LIMIT 1'
    );
    $stmt->execute(['order_id' => $orderId]);
    $row = $stmt->fetch();

    return $row ? (string)($row['invoice_notes'] ?? '') : '';
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

// ─── READ: payments for accounting bridge ────────────────────────────────────

/**
 * Fetches payments from order_payments table for the accounting bridge.
 * Returns data in the same shape the bridge expects.
 */
function app_read_order_payments_for_bridge(PDO $pdo, int $orderId): array
{
    return app_read_order_payments($pdo, $orderId);
}

// ─── BACKFILL: migrate from order_meta_json ──────────────────────────────────

/**
 * Backfills order_financials and order_payments from existing order_meta_json.
 * Safe to run multiple times (upsert/replace semantics).
 * Returns count of orders processed.
 */
function app_backfill_order_financials_from_json(PDO $pdo, int $batchSize = 500): int
{
    app_ensure_order_financials_tables($pdo);

    $offset = 0;
    $processed = 0;

    while (true) {
        $stmt = $pdo->prepare(
            "SELECT id, total, order_meta_json FROM orders
             WHERE order_meta_json IS NOT NULL AND order_meta_json != 'null' AND order_meta_json != ''
             ORDER BY id ASC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue(':limit', $batchSize, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        if (!is_array($rows) || count($rows) === 0) {
            break;
        }

        foreach ($rows as $row) {
            $orderId = (int)$row['id'];
            $metaRaw = (string)$row['order_meta_json'];
            $meta = json_decode($metaRaw, true);

            if (!is_array($meta)) {
                continue;
            }

            $financials = is_array($meta['financials'] ?? null) ? $meta['financials'] : [];
            $payments = is_array($meta['payments'] ?? null) ? $meta['payments'] : [];
            $invoiceNotes = (string)($meta['invoiceNotes'] ?? '');

            // Ensure financials have defaults
            $baseTotal = max(0, (int)$row['total']);
            $defaults = app_order_meta_defaults($baseTotal);
            $financials = array_merge($defaults['financials'], $financials);

            try {
                app_upsert_order_financials($pdo, $orderId, $financials, $invoiceNotes);
                app_sync_order_payments($pdo, $orderId, $payments);
                $processed++;
            } catch (Throwable $e) {
                // Log but continue with remaining orders
                error_log("Backfill failed for order {$orderId}: " . $e->getMessage());
            }
        }

        $offset += $batchSize;
    }

    return $processed;
}

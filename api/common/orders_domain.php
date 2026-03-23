<?php
declare(strict_types=1);

require_once __DIR__ . '/orders_code.php';
require_once __DIR__ . '/../modules/sales/order_financials_repository.php';

function app_valid_order_status(string $status): bool
{
    return in_array($status, ['pending', 'processing', 'delivered', 'archived'], true);
}

function app_payment_method_defaults(): array
{
    return ['card', 'check', 'cash', 'other'];
}

function app_normalize_payment_method($method): string
{
    $raw = trim((string)$method);
    if ($raw === '') {
        return 'cash';
    }

    $lower = strtolower($raw);
    $aliases = [
        'card' => 'card',
        'transfer' => 'card',
        'کارت به کارت' => 'card',
        'check' => 'check',
        'cheque' => 'check',
        'چک' => 'check',
        'cash' => 'cash',
        'نقد' => 'cash',
        'other' => 'other',
        'سایر' => 'other',
    ];

    if (isset($aliases[$raw])) {
        return $aliases[$raw];
    }
    if (isset($aliases[$lower])) {
        return $aliases[$lower];
    }

    return 'other';
}

function app_normalize_payment_receipt($receipt): ?array
{
    if (!is_array($receipt)) {
        return null;
    }

    $filePath = trim((string)($receipt['filePath'] ?? ''));
    if ($filePath === '') {
        return null;
    }

    return [
        'filePath' => $filePath,
        'originalName' => trim((string)($receipt['originalName'] ?? '')),
        'mimeType' => trim((string)($receipt['mimeType'] ?? '')),
        'size' => max(0, (int)($receipt['size'] ?? 0)),
    ];
}

function app_order_meta_defaults(int $grandTotal = 0): array
{
    $safeGrandTotal = max(0, $grandTotal);

    return [
        'financials' => [
            'subTotal' => $safeGrandTotal,
            'itemDiscountTotal' => 0,
            'invoiceDiscountType' => 'none',
            'invoiceDiscountValue' => 0,
            'invoiceDiscountAmount' => 0,
            'taxEnabled' => false,
            'taxRate' => 10,
            'taxAmount' => 0,
            'grandTotal' => $safeGrandTotal,
            'paidTotal' => 0,
            'dueAmount' => $safeGrandTotal,
            'paymentStatus' => $safeGrandTotal > 0 ? 'unpaid' : 'paid',
        ],
        'payments' => [],
        'invoiceNotes' => '',
    ];
}

function app_normalize_item_for_response($item): array
{
    if (!is_array($item)) {
        return [];
    }

    $itemType = (string)($item['itemType'] ?? 'catalog');
    if ($itemType !== 'manual') {
        $itemType = 'catalog';
    }

    $count = (int)($item['dimensions']['count'] ?? 1);
    if ($count <= 0) {
        $count = 1;
    }

    $unitPrice = (int)($item['unitPrice'] ?? 0);
    $totalPrice = (int)($item['totalPrice'] ?? 0);
    if ($totalPrice <= 0 && $unitPrice > 0) {
        $totalPrice = $unitPrice * $count;
    }

    $pricingMeta = is_array($item['pricingMeta'] ?? null) ? $item['pricingMeta'] : [];
    $pricingMeta = array_merge([
        'catalogUnitPrice' => $unitPrice,
        'catalogLineTotal' => max(0, $totalPrice),
        'overrideUnitPrice' => null,
        'overrideReason' => '',
        'floorUnitPrice' => max(0, $unitPrice),
        'isBelowFloor' => false,
        'itemDiscountType' => 'none',
        'itemDiscountValue' => 0,
        'itemDiscountAmount' => 0,
        'finalUnitPrice' => max(0, $unitPrice),
        'finalLineTotal' => max(0, $totalPrice),
    ], $pricingMeta);

    $item['itemType'] = $itemType;
    $item['pricingMeta'] = $pricingMeta;
    $item['unitPrice'] = max(0, (int)($pricingMeta['finalUnitPrice'] ?? $unitPrice));
    $item['totalPrice'] = max(0, (int)($pricingMeta['finalLineTotal'] ?? $totalPrice));

    if ($itemType === 'manual') {
        $manual = is_array($item['manual'] ?? null) ? $item['manual'] : [];
        $item['manual'] = array_merge([
            'qty' => $count,
            'unitLabel' => 'عدد',
            'description' => '',
            'taxable' => true,
        ], $manual);
    }

    return $item;
}

/**
 * Builds an order response array from a database row.
 *
 * Reads from structured tables (order_financials + order_payments).
 * Derived fields (paidTotal, dueAmount, paymentStatus) are computed
 * from the payments array + grandTotal, never read from storage.
 */
function app_order_from_row(array $row, ?PDO $pdo = null): array
{
    $itemsPayload = (string)($row['items_json'] ?? $row['items'] ?? '[]');
    $items = json_decode($itemsPayload, true);
    if (!is_array($items)) {
        $items = [];
    }
    $items = array_values(array_map('app_normalize_item_for_response', $items));

    $baseTotal = max(0, (int)$row['total']);
    $orderId = (int)$row['id'];

    // ── Try structured tables first (source of truth) ────────────────────
    $fromTables = null;
    if ($pdo !== null) {
        try {
            if (app_table_is_queryable($pdo, 'order_financials')) {
                $fromTables = app_read_order_financials_complete($pdo, $orderId, $baseTotal);
            }
        } catch (Throwable $e) {
            $fromTables = null;
        }
    }

    if ($fromTables !== null) {
        $financials = $fromTables['financials'];
        $payments = $fromTables['payments'];
        $invoiceNotes = $fromTables['invoiceNotes'];
    } else {
        $defaults = app_order_meta_defaults($baseTotal);
        $financials = $defaults['financials'];
        $payments = [];
        $invoiceNotes = '';
    }

    return [
        'id' => (string)$row['id'],
        'orderCode' => (string)$row['order_code'],
        'customerName' => (string)$row['customer_name'],
        'phone' => (string)$row['phone'],
        'customerId' => isset($row['customer_id']) && $row['customer_id'] !== null ? (string)$row['customer_id'] : null,
        'projectId' => isset($row['project_id']) && $row['project_id'] !== null ? (string)$row['project_id'] : null,
        'projectContactId' => isset($row['project_contact_id']) && $row['project_contact_id'] !== null ? (string)$row['project_contact_id'] : null,
        'date' => (string)$row['order_date'],
        'total' => (int)($financials['grandTotal'] ?? $baseTotal),
        'status' => (string)$row['status'],
        'items' => $items,
        'financials' => $financials,
        'payments' => $payments,
        'invoiceNotes' => $invoiceNotes,
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

function app_format_order_timestamp($value): string
{
    $raw = trim((string)$value);
    if ($raw === '') {
        return '';
    }

    $ts = strtotime($raw);
    if ($ts === false) {
        return $raw;
    }

    return gmdate('c', $ts);
}

<?php
declare(strict_types=1);

function app_sales_payload_has_advanced_order_data(array $payload): bool
{
    if (array_key_exists('financials', $payload) || array_key_exists('payments', $payload) || array_key_exists('invoiceNotes', $payload)) {
        return true;
    }

    $items = $payload['items'] ?? [];
    if (!is_array($items)) {
        return false;
    }

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }

        if (($item['itemType'] ?? 'catalog') === 'manual') {
            return true;
        }

        $meta = is_array($item['pricingMeta'] ?? null) ? $item['pricingMeta'] : [];
        $overrideUnitPrice = (int)($meta['overrideUnitPrice'] ?? 0);
        $itemDiscountAmount = (int)($meta['itemDiscountAmount'] ?? 0);
        $itemDiscountType = (string)($meta['itemDiscountType'] ?? 'none');

        if ($overrideUnitPrice > 0 || $itemDiscountAmount > 0 || $itemDiscountType !== 'none') {
            return true;
        }
    }

    return false;
}

function app_sales_validate_override_reasons(array $items): void
{
    foreach ($items as $index => $item) {
        if (!is_array($item)) {
            continue;
        }

        $meta = is_array($item['pricingMeta'] ?? null) ? $item['pricingMeta'] : [];
        $overrideUnitPrice = (int)($meta['overrideUnitPrice'] ?? 0);
        $floorUnitPrice = (int)($meta['floorUnitPrice'] ?? 0);
        $isBelowFloor = (bool)($meta['isBelowFloor'] ?? false);
        if ($overrideUnitPrice <= 0) {
            continue;
        }

        if (!$isBelowFloor && $floorUnitPrice > 0) {
            $isBelowFloor = $overrideUnitPrice < $floorUnitPrice;
        }

        if (!$isBelowFloor) {
            continue;
        }

        $reason = trim((string)($meta['overrideReason'] ?? ''));
        if ($reason === '') {
            app_json([
                'success' => false,
                'error' => 'Override reason is required when price is below floor.',
                'itemIndex' => $index,
            ], 400);
        }
    }
}

function app_sales_normalize_order_meta_payload(array $payload, int $total): array
{
    $defaults = app_order_meta_defaults($total);
    $financialsInput = is_array($payload['financials'] ?? null) ? $payload['financials'] : [];
    $financials = array_merge($defaults['financials'], $financialsInput);

    $paymentsInput = is_array($payload['payments'] ?? null) ? $payload['payments'] : [];
    $payments = [];
    foreach ($paymentsInput as $payment) {
        if (!is_array($payment)) {
            continue;
        }
        $receipt = app_normalize_payment_receipt($payment['receipt'] ?? null);
        $payments[] = [
            'id' => (string)($payment['id'] ?? uniqid('pay_', true)),
            'date' => (string)($payment['date'] ?? date('Y/m/d')),
            'amount' => max(0, (int)($payment['amount'] ?? 0)),
            'method' => app_normalize_payment_method($payment['method'] ?? 'cash'),
            'reference' => (string)($payment['reference'] ?? ''),
            'note' => (string)($payment['note'] ?? ''),
            'receipt' => $receipt,
        ];
    }

    $paidTotal = 0;
    foreach ($payments as $payment) {
        $paidTotal += (int)($payment['amount'] ?? 0);
    }

    $financials['subTotal'] = max(0, (int)($financials['subTotal'] ?? 0));
    $financials['itemDiscountTotal'] = max(0, (int)($financials['itemDiscountTotal'] ?? 0));
    $financials['invoiceDiscountType'] = (string)($financials['invoiceDiscountType'] ?? 'none');
    $financials['invoiceDiscountValue'] = max(0, (int)($financials['invoiceDiscountValue'] ?? 0));
    $financials['invoiceDiscountAmount'] = max(0, (int)($financials['invoiceDiscountAmount'] ?? 0));
    $financials['taxEnabled'] = (bool)($financials['taxEnabled'] ?? false);
    $financials['taxRate'] = max(0, min(100, (int)($financials['taxRate'] ?? 10)));
    $financials['taxAmount'] = max(0, (int)($financials['taxAmount'] ?? 0));

    $grandTotal = max(0, (int)($financials['grandTotal'] ?? $total));
    if ($grandTotal === 0 && $total > 0) {
        $grandTotal = $total;
    }

    $paidTotal = max($paidTotal, max(0, (int)($financials['paidTotal'] ?? 0)));
    $dueAmount = max(0, $grandTotal - $paidTotal);

    $paymentStatus = (string)($financials['paymentStatus'] ?? '');
    if ($paymentStatus === '') {
        if ($dueAmount <= 0) {
            $paymentStatus = 'paid';
        } elseif ($paidTotal > 0) {
            $paymentStatus = 'partial';
        } else {
            $paymentStatus = 'unpaid';
        }
    }

    $financials['grandTotal'] = $grandTotal;
    $financials['paidTotal'] = $paidTotal;
    $financials['dueAmount'] = $dueAmount;
    $financials['paymentStatus'] = $paymentStatus;

    return [
        'financials' => $financials,
        'payments' => $payments,
        'invoiceNotes' => (string)($payload['invoiceNotes'] ?? ''),
    ];
}

function app_sales_orders_date_column_candidates(PDO $pdo): array
{
    $primary = app_orders_date_column($pdo);
    $secondary = $primary === 'order_date' ? 'date' : 'order_date';
    return array_values(array_unique([$primary, $secondary]));
}

function app_sales_is_unknown_column_exception(Throwable $e, string $column): bool
{
    if (!$e instanceof PDOException) {
        return false;
    }

    return str_contains($e->getMessage(), "Unknown column '" . $column . "'");
}

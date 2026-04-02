<?php
declare(strict_types=1);

require_once __DIR__ . '/order_financials_repository.php';

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

function app_sales_sanitize_order_items_for_storage(array $items): array
{
    $sanitized = [];
    foreach ($items as $index => $item) {
        if (!is_array($item)) {
            $sanitized[$index] = $item;
            continue;
        }

        $nextItem = $item;
        if (is_array($nextItem['pattern'] ?? null) && array_key_exists('previewDataUrl', $nextItem['pattern'])) {
            unset($nextItem['pattern']['previewDataUrl']);
        }

        $sanitized[$index] = $nextItem;
    }

    return $sanitized;
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

    $financials['subTotal'] = max(0, (int)($financials['subTotal'] ?? 0));
    $financials['itemDiscountTotal'] = max(0, (int)($financials['itemDiscountTotal'] ?? 0));
    $financials['orderStage'] = app_sales_normalize_order_stage($financials['orderStage'] ?? null);
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
    $financials['grandTotal'] = $grandTotal;

    // Derive payment fields from the canonical computation.
    // Accept legacy paidTotal from input only if it exceeds the computed value (compat).
    $derived = app_compute_payment_derived_fields($grandTotal, $payments);
    $inputPaidTotal = max(0, (int)($financials['paidTotal'] ?? 0));

    if ($inputPaidTotal > $derived['paidTotal']) {
        // Legacy override: re-derive all fields with the higher paidTotal.
        $derived = app_compute_payment_derived_fields($grandTotal, [['amount' => $inputPaidTotal]]);
    }

    $financials['paidTotal'] = $derived['paidTotal'];
    $financials['dueAmount'] = $derived['dueAmount'];
    $financials['paymentStatus'] = $derived['paymentStatus'];

    return [
        'financials' => $financials,
        'payments' => $payments,
        'invoiceNotes' => (string)($payload['invoiceNotes'] ?? ''),
    ];
}

function app_sales_normalize_order_stage($value): string
{
    $stage = trim((string)($value ?? ''));
    $allowed = ['registered', 'followup', 'in_progress', 'ready_delivery', 'delivered'];
    return in_array($stage, $allowed, true) ? $stage : 'registered';
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

function app_sales_detect_duplicate_order_code_exception(Throwable $e): bool
{
    if (!$e instanceof PDOException) {
        return false;
    }

    $driverCode = (string)$e->getCode();
    if ($driverCode === '23000' && str_contains($e->getMessage(), 'uq_orders_order_code')) {
        return true;
    }

    if (str_contains($e->getMessage(), 'Duplicate entry') && str_contains($e->getMessage(), 'uq_orders_order_code')) {
        return true;
    }

    return false;
}

function app_sales_next_order_daily_sequence(PDO $pdo, string $datePrefix, string $flags = ''): int
{
    // $flags is retained only for backward compatibility with existing call sites.
    $safeDatePrefix = preg_replace('/\D+/', '', $datePrefix);
    if (!is_string($safeDatePrefix) || strlen($safeDatePrefix) !== 6) {
        $safeDatePrefix = app_order_code_date_prefix_jalali();
    }

    $stmt = $pdo->prepare(
        "SELECT COALESCE(
            MAX(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(order_code, '-', 2), '-', -1) AS UNSIGNED)),
            0
        ) AS max_seq
        FROM orders
        WHERE order_code LIKE :order_code_like
          AND order_code REGEXP '^[0-9]{6}-[0-9]{3}-[0-9]$'"
    );
    $stmt->execute([
        'order_code_like' => $safeDatePrefix . '-%',
    ]);
    $row = $stmt->fetch();
    $maxSeq = (int)($row['max_seq'] ?? 0);

    return max(1, $maxSeq + 1);
}

function app_sales_normalize_expected_updated_at($value): ?string
{
    if ($value === null) {
        return null;
    }
    $raw = trim((string)$value);
    return $raw === '' ? null : $raw;
}

function app_sales_timestamp_to_epoch(?string $value): ?int
{
    $raw = trim((string)$value);
    if ($raw === '') {
        return null;
    }

    $ts = strtotime($raw);
    if ($ts === false) {
        return null;
    }

    return (int)$ts;
}

function app_sales_is_order_conflict(array $currentOrderRow, ?string $expectedUpdatedAt): bool
{
    if ($expectedUpdatedAt === null) {
        return false;
    }

    $expectedEpoch = app_sales_timestamp_to_epoch($expectedUpdatedAt);
    $serverEpoch = app_sales_timestamp_to_epoch((string)($currentOrderRow['updated_at'] ?? ''));
    if ($expectedEpoch === null || $serverEpoch === null) {
        return false;
    }

    return $expectedEpoch !== $serverEpoch;
}

function app_sales_respond_order_conflict(array $currentOrderRow, ?PDO $pdo = null): void
{
    $serverOrder = app_order_from_row($currentOrderRow, $pdo);
    app_json([
        'success' => false,
        'error' => 'Order has changed on the server.',
        'code' => 'order_conflict',
        'serverOrder' => $serverOrder,
    ], 409);
}

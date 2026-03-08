<?php
declare(strict_types=1);

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

function app_generate_order_code(string|int $datePrefix = '', string $flags = '00', int $sequence = 1, int $seqPad = 5): string
{
    $date = app_order_code_date_prefix_jalali();
    if (is_int($datePrefix)) {
        // Backward compatibility for old signature: app_generate_order_code($sequence)
        $sequence = $datePrefix;
    } else {
        $candidateDate = preg_replace('/\D+/', '', trim($datePrefix));
        if (is_string($candidateDate) && preg_match('/^\d{6}$/', $candidateDate)) {
            $date = $candidateDate;
        }
    }

    // Flags and seqPad are intentionally ignored in the YYMMDD-SSS-C format.
    $sequence = max(1, $sequence);
    if ($sequence > 999) {
        throw new InvalidArgumentException('Order sequence exceeds daily capacity (999).');
    }

    $seq = str_pad((string)$sequence, 3, '0', STR_PAD_LEFT);
    $core = $date . $seq;

    $sum = 0;
    foreach (str_split($core) as $index => $char) {
        $sum += ((int)$char) * ($index + 1);
    }

    $checksum = $sum % 10;
    return $date . '-' . $seq . '-' . $checksum;
}

function app_order_code_date_prefix_jalali(?int $timestamp = null): string
{
    $ts = $timestamp ?? time();
    $gy = (int)date('Y', $ts);
    $gm = (int)date('n', $ts);
    $gd = (int)date('j', $ts);

    [$jy, $jm, $jd] = app_gregorian_to_jalali($gy, $gm, $gd);

    $yy = str_pad((string)($jy % 100), 2, '0', STR_PAD_LEFT);
    $mm = str_pad((string)$jm, 2, '0', STR_PAD_LEFT);
    $dd = str_pad((string)$jd, 2, '0', STR_PAD_LEFT);
    return $yy . $mm . $dd;
}

function app_gregorian_to_jalali(int $gy, int $gm, int $gd): array
{
    $gDayAcc = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

    if ($gy > 1600) {
        $jy = 979;
        $gy -= 1600;
    } else {
        $jy = 0;
        $gy -= 621;
    }

    $gy2 = $gm > 2 ? $gy + 1 : $gy;
    $days =
        (365 * $gy)
        + intdiv($gy2 + 3, 4)
        - intdiv($gy2 + 99, 100)
        + intdiv($gy2 + 399, 400)
        - 80
        + $gd
        + $gDayAcc[$gm - 1];

    $jy += 33 * intdiv($days, 12053);
    $days %= 12053;
    $jy += 4 * intdiv($days, 1461);
    $days %= 1461;

    if ($days > 365) {
        $jy += intdiv($days - 1, 365);
        $days = ($days - 1) % 365;
    }

    if ($days < 186) {
        $jm = 1 + intdiv($days, 31);
        $jd = 1 + ($days % 31);
    } else {
        $jm = 7 + intdiv($days - 186, 30);
        $jd = 1 + (($days - 186) % 30);
    }

    return [$jy, $jm, $jd];
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

function app_order_from_row(array $row): array
{
    $itemsPayload = (string)($row['items_json'] ?? $row['items'] ?? '[]');
    $items = json_decode($itemsPayload, true);
    if (!is_array($items)) {
        $items = [];
    }
    $items = array_values(array_map('app_normalize_item_for_response', $items));

    $metaPayload = (string)($row['order_meta_json'] ?? '');
    $metaDecoded = $metaPayload !== '' ? json_decode($metaPayload, true) : null;
    if (!is_array($metaDecoded)) {
        $metaDecoded = [];
    }

    $baseTotal = max(0, (int)$row['total']);
    $metaDefaults = app_order_meta_defaults($baseTotal);
    $financials = is_array($metaDecoded['financials'] ?? null) ? $metaDecoded['financials'] : [];
    $financials = array_merge($metaDefaults['financials'], $financials);

    $payments = is_array($metaDecoded['payments'] ?? null) ? $metaDecoded['payments'] : [];
    $payments = array_values(array_filter(array_map(static function ($payment) {
        if (!is_array($payment)) {
            return null;
        }

        $receipt = app_normalize_payment_receipt($payment['receipt'] ?? null);
        return [
            'id' => (string)($payment['id'] ?? uniqid('pay_', true)),
            'date' => (string)($payment['date'] ?? date('Y/m/d')),
            'amount' => max(0, (int)($payment['amount'] ?? 0)),
            'method' => app_normalize_payment_method($payment['method'] ?? 'cash'),
            'reference' => (string)($payment['reference'] ?? ''),
            'note' => (string)($payment['note'] ?? ''),
            'receipt' => $receipt,
        ];
    }, $payments)));

    $paidTotalFromPayments = 0;
    foreach ($payments as $payment) {
        $paidTotalFromPayments += (int)($payment['amount'] ?? 0);
    }

    $grandTotal = max(0, (int)($financials['grandTotal'] ?? $baseTotal));
    if ($grandTotal === 0 && $baseTotal > 0) {
        $grandTotal = $baseTotal;
    }

    $paidTotal = max((int)($financials['paidTotal'] ?? 0), $paidTotalFromPayments);
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
    $financials['subTotal'] = max(0, (int)($financials['subTotal'] ?? $grandTotal));
    $financials['itemDiscountTotal'] = max(0, (int)($financials['itemDiscountTotal'] ?? 0));
    $financials['invoiceDiscountValue'] = max(0, (int)($financials['invoiceDiscountValue'] ?? 0));
    $financials['invoiceDiscountAmount'] = max(0, (int)($financials['invoiceDiscountAmount'] ?? 0));
    $financials['taxRate'] = max(0, (int)($financials['taxRate'] ?? 10));
    $financials['taxAmount'] = max(0, (int)($financials['taxAmount'] ?? 0));
    $financials['taxEnabled'] = (bool)($financials['taxEnabled'] ?? false);
    $financials['invoiceDiscountType'] = (string)($financials['invoiceDiscountType'] ?? 'none');

    $invoiceNotes = (string)($metaDecoded['invoiceNotes'] ?? '');

    return [
        'id' => (string)$row['id'],
        'orderCode' => (string)$row['order_code'],
        'customerName' => (string)$row['customer_name'],
        'phone' => (string)$row['phone'],
        'date' => (string)$row['order_date'],
        'total' => $grandTotal,
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

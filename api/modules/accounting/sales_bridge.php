<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/accounting_helpers.php';

app_handle_preflight(['GET', 'POST']);
$method = app_require_method(['GET', 'POST']);
app_require_module_enabled($pdo, 'accounting');
app_ensure_accounting_schema($pdo);

$actor = app_require_auth(['admin', 'manager']);

if ($method === 'GET') {
    acc_require_permission($actor, 'accounting.sales_bridge.read', $pdo);

    // Return bridge log stats and account mapping config
    $countStmt = $pdo->query('SELECT COUNT(*) AS total FROM acc_sales_bridge_log');
    $totalBridged = (int)($countStmt ? $countStmt->fetch()['total'] : 0);

    $mapRaw = '';
    try {
        $s = $pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key = :k LIMIT 1');
        $s->execute(['k' => 'accounting.bridge.account_map']);
        $row = $s->fetch();
        $mapRaw = $row ? (string)$row['setting_value'] : '';
    } catch (Throwable $e) {
    }
    $accountMap = $mapRaw !== '' ? (json_decode($mapRaw, true) ?? []) : [];

    app_json(['success' => true, 'totalBridged' => $totalBridged, 'accountMap' => $accountMap]);
}

// ─── POST ─────────────────────────────────────────────────────────────────────
acc_require_permission($actor, 'accounting.sales_bridge.run', $pdo);
app_require_csrf();

$payload      = app_read_json_body();
$mode         = acc_normalize_text($payload['mode'] ?? 'range');
$fiscalYearId = acc_parse_id($payload['fiscalYearId'] ?? null);
$orderId      = acc_parse_id($payload['orderId'] ?? null);
$dateFrom     = acc_parse_date(acc_normalize_text($payload['dateFrom'] ?? ''));
$dateTo       = acc_parse_date(acc_normalize_text($payload['dateTo'] ?? ''));

// Load account map from settings
$mapRaw = '';
try {
    $s = $pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key = :k LIMIT 1');
    $s->execute(['k' => 'accounting.bridge.account_map']);
    $row = $s->fetch();
    $mapRaw = $row ? (string)$row['setting_value'] : '';
} catch (Throwable $e) {
}
$accountMap = $mapRaw !== '' ? (json_decode($mapRaw, true) ?? []) : [];

$cashAccountId    = acc_parse_id($accountMap['cash_account_id'] ?? null);
$bankAccountId    = acc_parse_id($accountMap['bank_account_id'] ?? null);
$checkAccountId   = acc_parse_id($accountMap['check_account_id'] ?? null);
$arAccountId      = acc_parse_id($accountMap['ar_account_id'] ?? null);

if ($cashAccountId === null || $bankAccountId === null || $arAccountId === null) {
    app_json([
        'success' => false,
        'error'   => 'Bridge accounts are not configured. Please set accounting.bridge.account_map in settings.',
        'code'    => 'bridge_accounts_not_configured',
    ], 422);
}
if ($checkAccountId === null) {
    $checkAccountId = $arAccountId; // Fallback: checks go to AR
}

if ($fiscalYearId === null) {
    app_json(['success' => false, 'error' => 'fiscalYearId is required.'], 400);
}

// Verify fiscal year
$fyStmt = $pdo->prepare('SELECT * FROM acc_fiscal_years WHERE id = :id LIMIT 1');
$fyStmt->execute(['id' => $fiscalYearId]);
$fy = $fyStmt->fetch();
if (!$fy) {
    app_json(['success' => false, 'error' => 'Fiscal year not found.'], 404);
}
if ((string)$fy['status'] === 'closed') {
    app_json(['success' => false, 'error' => 'Fiscal year is closed.'], 400);
}

// Build orders query
$orderWhere  = [];
$orderParams = [];
if ($mode === 'order') {
    if ($orderId === null) {
        app_json(['success' => false, 'error' => 'orderId is required for mode=order.'], 400);
    }
    $orderWhere[]        = 'id = :order_id';
    $orderParams['order_id'] = $orderId;
} else {
    // range mode: fetch orders with payments in the date window
    if ($dateFrom !== null) {
        $orderWhere[]           = 'created_at >= :date_from';
        $orderParams['date_from'] = $dateFrom . ' 00:00:00';
    }
    if ($dateTo !== null) {
        $orderWhere[]          = 'created_at <= :date_to';
        $orderParams['date_to'] = $dateTo . ' 23:59:59';
    }
    // Only include orders with payments
    $orderWhere[] = "order_meta_json IS NOT NULL AND order_meta_json != 'null'";
}

$orderSql = 'SELECT id, order_code, customer_id, order_meta_json FROM orders';
if ($orderWhere) {
    $orderSql .= ' WHERE ' . implode(' AND ', $orderWhere);
}
$orderSql .= ' ORDER BY id ASC LIMIT 2000';

$ordersStmt = $pdo->prepare($orderSql);
$ordersStmt->execute($orderParams);
$orders = $ordersStmt->fetchAll() ?: [];

$created = 0;
$skipped = 0;
$errors  = [];

// Pre-load already-bridged (order_id, payment_local_id) pairs for these orders
$orderIds = array_column($orders, 'id');
$alreadyBridged = [];
if (count($orderIds) > 0) {
    $inPlaceholders = implode(',', array_fill(0, count($orderIds), '?'));
    $bridgedStmt    = $pdo->prepare("SELECT order_id, payment_local_id FROM acc_sales_bridge_log WHERE order_id IN ({$inPlaceholders})");
    $bridgedStmt->execute(array_values($orderIds));
    foreach ($bridgedStmt->fetchAll() as $br) {
        $alreadyBridged[(int)$br['order_id']][(string)$br['payment_local_id']] = true;
    }
}

foreach ($orders as $order) {
    $oid      = (int)$order['id'];
    $meta     = null;
    $metaRaw  = $order['order_meta_json'] ?? null;
    if (is_string($metaRaw) && $metaRaw !== '' && $metaRaw !== 'null') {
        $meta = json_decode($metaRaw, true);
    }
    if (!is_array($meta)) {
        continue;
    }

    $payments   = $meta['payments'] ?? [];
    $customerId = $order['customer_id'] ? (int)$order['customer_id'] : null;
    if (!is_array($payments) || count($payments) === 0) {
        continue;
    }

    foreach ($payments as $payment) {
        $paymentId = acc_normalize_text($payment['id'] ?? '');
        if ($paymentId === '') {
            continue;
        }

        // Idempotency check
        if (isset($alreadyBridged[$oid][$paymentId])) {
            $skipped++;
            continue;
        }

        $amount = max(0, (int)($payment['amount'] ?? 0));
        if ($amount <= 0) {
            $skipped++;
            continue;
        }

        $method     = acc_normalize_text($payment['method'] ?? 'cash');
        $payDate    = acc_parse_date(acc_normalize_text($payment['date'] ?? '')) ?? date('Y-m-d');

        // Determine debit account based on payment method
        $debitAccountId = match ($method) {
            'card', 'bank_transfer' => $bankAccountId,
            'check', 'cheque'       => $checkAccountId,
            default                 => $cashAccountId, // cash, other
        };

        $sourceCode = (string)($order['order_code'] ?? '');
        $desc       = "دریافت پرداخت سفارش {$sourceCode}";

        try {
            $pdo->beginTransaction();

            $voucherNo = acc_next_voucher_no($pdo, $fiscalYearId);

            $pdo->prepare(
                'INSERT INTO acc_vouchers
                 (fiscal_year_id, voucher_no, voucher_date, description, status, source_type, source_id, source_code, created_by_user_id)
                 VALUES (:fy_id, :no, :date, :desc, :status, :src_type, :src_id, :src_code, :uid)'
            )->execute([
                'fy_id'    => $fiscalYearId,
                'no'       => $voucherNo,
                'date'     => $payDate,
                'desc'     => $desc,
                'status'   => 'posted',
                'src_type' => 'sales.payment',
                'src_id'   => $paymentId,
                'src_code' => $sourceCode,
                'uid'      => $actor['id'],
            ]);
            $voucherId = (int)$pdo->lastInsertId();

            // Line 1: Debit cash/bank/check account
            $pdo->prepare(
                'INSERT INTO acc_voucher_lines (voucher_id, line_no, account_id, description, debit_amount, credit_amount, party_type, party_id)
                 VALUES (:vid, 1, :acc_id, :desc, :debit, 0, :party_type, :party_id)'
            )->execute([
                'vid'        => $voucherId,
                'acc_id'     => $debitAccountId,
                'desc'       => $desc,
                'debit'      => $amount,
                'party_type' => $customerId !== null ? 'customer' : null,
                'party_id'   => $customerId,
            ]);

            // Line 2: Credit AR (حساب‌های دریافتنی تجاری)
            $pdo->prepare(
                'INSERT INTO acc_voucher_lines (voucher_id, line_no, account_id, description, debit_amount, credit_amount, party_type, party_id)
                 VALUES (:vid, 2, :acc_id, :desc, 0, :credit, :party_type, :party_id)'
            )->execute([
                'vid'        => $voucherId,
                'acc_id'     => $arAccountId,
                'desc'       => $desc,
                'credit'     => $amount,
                'party_type' => $customerId !== null ? 'customer' : null,
                'party_id'   => $customerId,
            ]);

            // Log idempotency record
            $pdo->prepare(
                'INSERT INTO acc_sales_bridge_log (order_id, payment_local_id, voucher_id)
                 VALUES (:oid, :pid, :vid)'
            )->execute(['oid' => $oid, 'pid' => $paymentId, 'vid' => $voucherId]);

            $pdo->commit();

            $alreadyBridged[$oid][$paymentId] = true;
            $created++;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $errors[] = "order {$oid}, payment {$paymentId}: " . $e->getMessage();
        }
    }
}

app_audit_log($pdo, 'accounting.sales_bridge.run', 'acc_sales_bridge_log', null, [
    'mode' => $mode, 'created' => $created, 'skipped' => $skipped, 'errors' => count($errors),
], $actor);

app_json(['success' => true, 'created' => $created, 'skipped' => $skipped, 'errors' => $errors]);

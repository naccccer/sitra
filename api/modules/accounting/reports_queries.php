<?php
declare(strict_types=1);

require_once __DIR__ . '/accounting_helpers.php';

// ─── Helper: base voucher WHERE ─────────────────────────────────
function acc_reports_voucher_where(array &$params, ?int $fiscalYearId, ?string $dateFrom, ?string $dateTo): string
{
    $where = ["v.status = 'posted'"];
    if ($fiscalYearId !== null) {
        $where[] = 'v.fiscal_year_id = :fy_id';
        $params['fy_id'] = $fiscalYearId;
    }
    if ($dateFrom !== null) {
        $where[] = 'v.voucher_date >= :date_from';
        $params['date_from'] = $dateFrom;
    }
    if ($dateTo !== null) {
        $where[] = 'v.voucher_date <= :date_to';
        $params['date_to'] = $dateTo;
    }
    return implode(' AND ', $where);
}


function acc_accounting_handle_reports_request(PDO $pdo, string $report, ?int $fiscalYearId, ?string $dateFrom, ?string $dateTo, ?int $accountId): void
{
// ─── Trial Balance (تراز آزمایشی) ────────────────────────────────────────────
if ($report === 'trial_balance') {
    $params = [];
    $voucherWhere = acc_reports_voucher_where($params, $fiscalYearId, $dateFrom, $dateTo);

    // Aggregate debit/credit totals per account
    $sql = "
        SELECT
            a.id,
            a.code,
            a.name,
            a.level,
            a.parent_id,
            a.account_type,
            a.account_nature,
            COALESCE(SUM(vl.debit_amount), 0)  AS debit_total,
            COALESCE(SUM(vl.credit_amount), 0) AS credit_total
        FROM acc_accounts a
        LEFT JOIN acc_voucher_lines vl ON vl.account_id = a.id
        LEFT JOIN acc_vouchers v ON v.id = vl.voucher_id AND {$voucherWhere}
        WHERE a.is_active = 1
        GROUP BY a.id, a.code, a.name, a.level, a.parent_id, a.account_type, a.account_nature
        ORDER BY a.code ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    // Build flat rows with balance
    $result = [];
    $totalDebit  = 0;
    $totalCredit = 0;
    foreach ($rows as $row) {
        $debit  = (int)$row['debit_total'];
        $credit = (int)$row['credit_total'];
        $nature = (string)$row['account_nature'];
        $balance = $nature === 'debit' ? ($debit - $credit) : ($credit - $debit);

        // Only include accounts with activity or postable accounts
        $result[] = [
            'accountId'     => (string)$row['id'],
            'code'          => (string)$row['code'],
            'name'          => (string)$row['name'],
            'level'         => (int)$row['level'],
            'parentId'      => isset($row['parent_id']) ? (string)$row['parent_id'] : null,
            'accountType'   => (string)$row['account_type'],
            'accountNature' => $nature,
            'debitTotal'    => $debit,
            'creditTotal'   => $credit,
            'balance'       => $balance,
            'balanceSide'   => $balance >= 0 ? $nature : ($nature === 'debit' ? 'credit' : 'debit'),
        ];
        $totalDebit  += $debit;
        $totalCredit += $credit;
    }

    app_json([
        'success'     => true,
        'report'      => 'trial_balance',
        'rows'        => $result,
        'totalDebit'  => $totalDebit,
        'totalCredit' => $totalCredit,
        'isBalanced'  => $totalDebit === $totalCredit,
    ]);
}

// ─── General Ledger / دفتر کل ─────────────────────────────────────────────────
if ($report === 'general_ledger') {
    if ($accountId === null) {
        app_json(['success' => false, 'error' => 'accountId is required for general_ledger.'], 400);
    }

    $accStmt = $pdo->prepare('SELECT * FROM acc_accounts WHERE id = :id LIMIT 1');
    $accStmt->execute(['id' => $accountId]);
    $account = $accStmt->fetch();
    if (!$account) {
        app_json(['success' => false, 'error' => 'Account not found.'], 404);
    }

    $params = [];
    $voucherWhere = acc_reports_voucher_where($params, $fiscalYearId, $dateFrom, $dateTo);
    $params['acc_id'] = $accountId;

    $sql = "
        SELECT
            v.voucher_no,
            v.voucher_date,
            v.description       AS voucher_desc,
            v.source_code,
            vl.description      AS line_desc,
            vl.debit_amount,
            vl.credit_amount
        FROM acc_voucher_lines vl
        JOIN acc_vouchers v ON v.id = vl.voucher_id
        WHERE vl.account_id = :acc_id
          AND {$voucherWhere}
        ORDER BY v.voucher_date ASC, v.voucher_no ASC, vl.line_no ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    $nature         = (string)$account['account_nature'];
    $runningBalance = 0;
    $result         = [];
    $totalDebit     = 0;
    $totalCredit    = 0;

    foreach ($rows as $row) {
        $debit  = (int)$row['debit_amount'];
        $credit = (int)$row['credit_amount'];
        $totalDebit  += $debit;
        $totalCredit += $credit;
        $runningBalance += ($nature === 'debit') ? ($debit - $credit) : ($credit - $debit);

        $result[] = [
            'voucherNo'      => (int)$row['voucher_no'],
            'voucherDate'    => (string)$row['voucher_date'],
            'description'    => trim($row['voucher_desc'] . ' ' . $row['line_desc']),
            'sourceCode'     => $row['source_code'] ?? null,
            'debitAmount'    => $debit,
            'creditAmount'   => $credit,
            'runningBalance' => $runningBalance,
        ];
    }

    app_json([
        'success'        => true,
        'report'         => 'general_ledger',
        'account'        => acc_account_from_row($account),
        'rows'           => $result,
        'totalDebit'     => $totalDebit,
        'totalCredit'    => $totalCredit,
        'closingBalance' => $runningBalance,
    ]);
}

// ─── AR Summary / مانده حساب مشتریان ─────────────────────────────────────────
if ($report === 'ar_summary') {
    $params = [];
    $voucherWhere = acc_reports_voucher_where($params, $fiscalYearId, $dateFrom, $dateTo);

    // Find all customer-party voucher lines
    $sql = "
        SELECT
            vl.party_id,
            c.full_name               AS customer_name,
            SUM(vl.debit_amount)      AS total_debit,
            SUM(vl.credit_amount)     AS total_credit,
            SUM(vl.debit_amount) - SUM(vl.credit_amount) AS balance
        FROM acc_voucher_lines vl
        JOIN acc_vouchers v ON v.id = vl.voucher_id
        LEFT JOIN customers c ON c.id = vl.party_id
        WHERE vl.party_type = 'customer'
          AND vl.party_id IS NOT NULL
          AND {$voucherWhere}
        GROUP BY vl.party_id, c.full_name
        ORDER BY balance DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    $result = array_map(static function (array $row): array {
        return [
            'customerId'   => (string)($row['party_id'] ?? ''),
            'customerName' => (string)($row['customer_name'] ?? 'نامشخص'),
            'debit'        => (int)$row['total_debit'],
            'credit'       => (int)$row['total_credit'],
            'balance'      => (int)$row['balance'],
        ];
    }, $rows);

    $totalBalance = array_sum(array_column($result, 'balance'));
    app_json(['success' => true, 'report' => 'ar_summary', 'rows' => $result, 'totalBalance' => $totalBalance]);
}

// ─── P&L Summary / خلاصه درآمد/هزینه ────────────────────────────────────────
if ($report === 'pnl_summary') {
    $params = [];
    $voucherWhere = acc_reports_voucher_where($params, $fiscalYearId, $dateFrom, $dateTo);

    $sql = "
        SELECT
            a.account_type,
            a.account_nature,
            COALESCE(SUM(vl.debit_amount), 0)  AS debit_total,
            COALESCE(SUM(vl.credit_amount), 0) AS credit_total
        FROM acc_accounts a
        JOIN acc_voucher_lines vl ON vl.account_id = a.id
        JOIN acc_vouchers v ON v.id = vl.voucher_id AND {$voucherWhere}
        WHERE a.account_type IN ('revenue', 'expense')
        GROUP BY a.account_type, a.account_nature
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    $totalRevenue = 0;
    $totalExpense = 0;
    foreach ($rows as $row) {
        $net = (int)$row['credit_total'] - (int)$row['debit_total'];
        if ((string)$row['account_type'] === 'revenue') {
            $totalRevenue += $net;
        } else {
            // expense: debit_total - credit_total
            $totalExpense += (int)$row['debit_total'] - (int)$row['credit_total'];
        }
    }
    $netIncome = $totalRevenue - $totalExpense;

    // Also get line-level breakdown by account
    $detailSql = "
        SELECT
            a.id, a.code, a.name, a.account_type, a.account_nature,
            COALESCE(SUM(vl.debit_amount), 0)  AS debit_total,
            COALESCE(SUM(vl.credit_amount), 0) AS credit_total
        FROM acc_accounts a
        JOIN acc_voucher_lines vl ON vl.account_id = a.id
        JOIN acc_vouchers v ON v.id = vl.voucher_id AND {$voucherWhere}
        WHERE a.account_type IN ('revenue', 'expense')
        GROUP BY a.id, a.code, a.name, a.account_type, a.account_nature
        ORDER BY a.code ASC
    ";
    $detailStmt = $pdo->prepare($detailSql);
    $detailStmt->execute($params);
    $detailRows = $detailStmt->fetchAll() ?: [];

    $details = array_map(static function (array $row): array {
        $debit  = (int)$row['debit_total'];
        $credit = (int)$row['credit_total'];
        $type   = (string)$row['account_type'];
        $amount = $type === 'revenue' ? ($credit - $debit) : ($debit - $credit);
        return [
            'accountId'   => (string)$row['id'],
            'code'        => (string)$row['code'],
            'name'        => (string)$row['name'],
            'accountType' => $type,
            'amount'      => $amount,
        ];
    }, $detailRows);

    app_json([
        'success'       => true,
        'report'        => 'pnl_summary',
        'totalRevenue'  => $totalRevenue,
        'totalExpense'  => $totalExpense,
        'netIncome'     => $netIncome,
        'details'       => $details,
    ]);
}

app_json(['success' => false, 'error' => 'Unknown report. Use trial_balance, general_ledger, ar_summary, or pnl_summary.'], 400);
}

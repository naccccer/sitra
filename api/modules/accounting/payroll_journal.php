<?php
declare(strict_types=1);

require_once __DIR__ . '/accounting_helpers.php';

function acc_payroll_default_account_map(): array
{
    return [
        'expense_default' => '6101',
        'payable' => '2105',
        'deduction_liability_default' => '2101',
        'cash' => '1101',
        'bank' => '1102',
        'items' => [
            'base_salary' => '6101',
            'housing_allowance' => '6101',
            'transport_allowance' => '6101',
            'overtime' => '6101',
            'bonus' => '6101',
            'other_earnings' => '6101',
            'insurance' => '2101',
            'tax' => '2101',
            'loan' => '2101',
            'other_deductions' => '2101',
        ],
    ];
}

function acc_payroll_read_account_map(PDO $pdo): array
{
    $configured = acc_read_json_setting($pdo, 'accounting.payroll.account_map', []);
    return array_replace_recursive(acc_payroll_default_account_map(), is_array($configured) ? $configured : []);
}

function acc_payroll_resolve_map_account(PDO $pdo, array $map, string $key, string $errorCode): array
{
    $candidate = $map[$key] ?? $map[$key . '_account_id'] ?? $map[$key . '_account_code'] ?? null;
    if (is_array($candidate)) {
        $candidate = $candidate['accountId'] ?? $candidate['accountCode'] ?? $candidate['id'] ?? $candidate['code'] ?? null;
    }
    $account = acc_find_postable_account($pdo, $candidate);
    if (!$account) {
        throw new RuntimeException($errorCode);
    }
    return $account;
}

function acc_payroll_resolve_item_account(PDO $pdo, array $map, array $item): array
{
    $itemsMap = is_array($map['items'] ?? null) ? $map['items'] : [];
    $candidate = $itemsMap[$item['accountKey'] ?? ''] ?? $itemsMap[$item['itemKey'] ?? ''] ?? null;
    if (is_array($candidate)) {
        $candidate = $candidate['accountId'] ?? $candidate['accountCode'] ?? null;
    }

    if ($candidate === null || $candidate === '') {
        $fallbackKey = $item['type'] === 'deduction' ? 'deduction_liability_default' : 'expense_default';
        return acc_payroll_resolve_map_account($pdo, $map, $fallbackKey, 'payroll_account_map_missing_' . $fallbackKey);
    }

    $account = acc_find_postable_account($pdo, $candidate);
    if (!$account) {
        throw new RuntimeException('payroll_item_account_invalid_' . (string)($item['itemKey'] ?? 'item'));
    }
    return $account;
}

function acc_payroll_create_posted_voucher(
    PDO $pdo,
    int $fiscalYearId,
    string $voucherDate,
    string $description,
    string $sourceType,
    string $sourceId,
    ?string $sourceCode,
    array $lines,
    array $actor
): int {
    if (!acc_validate_lines_balance($lines)) {
        throw new RuntimeException('Payroll journal lines are not balanced.');
    }

    $voucherNo = acc_next_voucher_no($pdo, $fiscalYearId);
    $stmt = $pdo->prepare(
        'INSERT INTO acc_vouchers
         (fiscal_year_id, voucher_no, voucher_date, description, status, source_type, source_id, source_code, created_by_user_id, posted_by_user_id, posted_at)
         VALUES (:fy_id, :voucher_no, :voucher_date, :description, :status, :source_type, :source_id, :source_code, :created_by, :posted_by, CURRENT_TIMESTAMP)'
    );
    $stmt->execute([
        'fy_id' => $fiscalYearId,
        'voucher_no' => $voucherNo,
        'voucher_date' => $voucherDate,
        'description' => $description,
        'status' => 'posted',
        'source_type' => $sourceType,
        'source_id' => $sourceId,
        'source_code' => $sourceCode,
        'created_by' => (int)$actor['id'],
        'posted_by' => (int)$actor['id'],
    ]);
    $voucherId = (int)$pdo->lastInsertId();

    $lineStmt = $pdo->prepare(
        'INSERT INTO acc_voucher_lines
         (voucher_id, line_no, account_id, description, debit_amount, credit_amount, party_type, party_id)
         VALUES (:voucher_id, :line_no, :account_id, :description, :debit_amount, :credit_amount, :party_type, :party_id)'
    );

    foreach ($lines as $lineNo => $line) {
        $lineStmt->execute([
            'voucher_id' => $voucherId,
            'line_no' => $lineNo + 1,
            'account_id' => (int)$line['accountId'],
            'description' => (string)($line['description'] ?? ''),
            'debit_amount' => (int)($line['debitAmount'] ?? 0),
            'credit_amount' => (int)($line['creditAmount'] ?? 0),
            'party_type' => $line['partyType'] ?? null,
            'party_id' => isset($line['partyId']) ? (int)$line['partyId'] : null,
        ]);
    }

    return $voucherId;
}

function acc_payroll_create_accrual_voucher(PDO $pdo, array $payslip, array $actor): int
{
    if (!empty($payslip['accrualVoucherId'])) {
        throw new RuntimeException('Payroll accrual voucher already exists.');
    }

    $map = acc_payroll_read_account_map($pdo);
    $payableAccount = acc_payroll_resolve_map_account($pdo, $map, 'payable', 'payroll_account_map_missing_payable');
    $voucherDate = (string)($payslip['period']['payDate'] ?? '') ?: date('Y-m-d');
    $fiscalYear = acc_find_fiscal_year_for_date($pdo, $voucherDate);
    if (!$fiscalYear) {
        throw new RuntimeException('No fiscal year covers payroll issue date.');
    }
    if ((string)$fiscalYear['status'] !== 'open') {
        throw new RuntimeException('Fiscal year is closed for payroll issue date.');
    }

    $employeeId = (int)$payslip['employee']['id'];
    $employeeName = trim((string)$payslip['employee']['fullName']);
    $periodTitle = (string)$payslip['period']['title'];
    $lines = [];

    foreach ($payslip['items'] as $item) {
        $amount = (int)($item['amount'] ?? 0);
        if ($amount <= 0) {
            continue;
        }
        $account = acc_payroll_resolve_item_account($pdo, $map, $item);
        if ($item['type'] === 'deduction') {
            $lines[] = [
                'accountId' => (int)$account['id'],
                'description' => $employeeName . ' - ' . (string)$item['label'],
                'debitAmount' => 0,
                'creditAmount' => $amount,
                'partyType' => 'employee',
                'partyId' => $employeeId,
            ];
            continue;
        }

        $lines[] = [
            'accountId' => (int)$account['id'],
            'description' => $employeeName . ' - ' . (string)$item['label'],
            'debitAmount' => $amount,
            'creditAmount' => 0,
            'partyType' => 'employee',
            'partyId' => $employeeId,
        ];
    }

    $netTotal = (int)($payslip['totals']['netTotal'] ?? 0);
    if ($netTotal > 0) {
        $lines[] = [
            'accountId' => (int)$payableAccount['id'],
            'description' => 'Payroll payable - ' . $employeeName,
            'debitAmount' => 0,
            'creditAmount' => $netTotal,
            'partyType' => 'employee',
            'partyId' => $employeeId,
        ];
    }

    if ($lines === []) {
        throw new RuntimeException('Payroll has no journalable amounts.');
    }

    return acc_payroll_create_posted_voucher(
        $pdo,
        (int)$fiscalYear['id'],
        $voucherDate,
        'Payroll accrual - ' . $employeeName . ' - ' . $periodTitle,
        'payroll',
        (string)$payslip['id'],
        (string)($payslip['slipNo'] ?? ''),
        $lines,
        $actor
    );
}

function acc_payroll_create_payment_voucher(PDO $pdo, array $payslip, array $payment, array $actor): int
{
    $map = acc_payroll_read_account_map($pdo);
    $payableAccount = acc_payroll_resolve_map_account($pdo, $map, 'payable', 'payroll_account_map_missing_payable');

    $paymentMethod = (string)($payment['paymentMethod'] ?? 'bank');
    $bankOrCashKey = $paymentMethod === 'cash' ? 'cash' : 'bank';
    $settlementAccount = null;
    if (!empty($payment['accountId'])) {
        $settlementAccount = acc_find_postable_account($pdo, $payment['accountId']);
    }
    if (!$settlementAccount) {
        $settlementAccount = acc_payroll_resolve_map_account(
            $pdo,
            $map,
            $bankOrCashKey,
            'payroll_account_map_missing_' . $bankOrCashKey
        );
    }

    $paymentDate = (string)($payment['paymentDate'] ?? date('Y-m-d'));
    $fiscalYear = acc_find_fiscal_year_for_date($pdo, $paymentDate);
    if (!$fiscalYear) {
        throw new RuntimeException('No fiscal year covers payroll payment date.');
    }
    if ((string)$fiscalYear['status'] !== 'open') {
        throw new RuntimeException('Fiscal year is closed for payroll payment date.');
    }

    $employeeId = (int)$payslip['employee']['id'];
    $employeeName = (string)$payslip['employee']['fullName'];
    $amount = (int)($payment['amount'] ?? 0);
    $description = 'Payroll payment - ' . $employeeName . ' - ' . (string)$payslip['slipNo'];

    return acc_payroll_create_posted_voucher(
        $pdo,
        (int)$fiscalYear['id'],
        $paymentDate,
        $description,
        'payroll_payment',
        (string)$payment['id'],
        (string)($payslip['slipNo'] ?? ''),
        [
            [
                'accountId' => (int)$payableAccount['id'],
                'description' => $description,
                'debitAmount' => $amount,
                'creditAmount' => 0,
                'partyType' => 'employee',
                'partyId' => $employeeId,
            ],
            [
                'accountId' => (int)$settlementAccount['id'],
                'description' => $description,
                'debitAmount' => 0,
                'creditAmount' => $amount,
                'partyType' => 'employee',
                'partyId' => $employeeId,
            ],
        ],
        $actor
    );
}

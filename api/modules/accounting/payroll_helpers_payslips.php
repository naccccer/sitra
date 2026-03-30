<?php
declare(strict_types=1);

function acc_payroll_fetch_payslip_detail(PDO $pdo, int $payslipId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM acc_payslips WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $payslipId]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $employee = app_hr_fetch_employee($pdo, (int)$row['employee_id']);
    $period   = acc_payroll_fetch_period($pdo, (int)$row['period_id']);
    if (!$employee || !$period) {
        return null;
    }

    $itemsStmt = $pdo->prepare('SELECT * FROM acc_payslip_items WHERE payslip_id = :id ORDER BY sort_order ASC, id ASC');
    $itemsStmt->execute(['id' => $payslipId]);
    $paymentsStmt = $pdo->prepare('SELECT * FROM acc_payslip_payments WHERE payslip_id = :id ORDER BY payment_date ASC, id ASC');
    $paymentsStmt->execute(['id' => $payslipId]);
    $docsStmt = $pdo->prepare('SELECT * FROM acc_payslip_documents WHERE payslip_id = :id ORDER BY id DESC');
    $docsStmt->execute(['id' => $payslipId]);

    return [
        'id'              => (string)$row['id'],
        'slipNo'          => $row['slip_no'] ?: null,
        'status'          => (string)$row['status'],
        'currencyCode'    => (string)$row['currency_code'],
        'inputs'          => json_decode((string)($row['inputs_json'] ?? 'null'), true) ?: [],
        'notes'           => $row['notes'] ?: null,
        'accrualVoucherId' => $row['accrual_voucher_id'] !== null ? (string)$row['accrual_voucher_id'] : null,
        'employee'        => app_hr_employee_from_row($employee),
        'period'          => acc_payroll_period_from_row($period),
        'items'           => array_map(static fn(array $item): array => [
            'id'         => (string)$item['id'],
            'itemKey'    => (string)$item['item_key'],
            'label'      => (string)$item['item_label'],
            'type'       => (string)$item['item_type'],
            'accountKey' => $item['account_key'] ?: null,
            'amount'     => (int)$item['amount'],
            'sortOrder'  => (int)$item['sort_order'],
        ], $itemsStmt->fetchAll() ?: []),
        'payments'        => array_map(static fn(array $payment): array => [
            'id'            => (string)$payment['id'],
            'paymentDate'   => (string)$payment['payment_date'],
            'paymentMethod' => (string)$payment['payment_method'],
            'accountId'     => $payment['account_id'] !== null ? (string)$payment['account_id'] : null,
            'amount'        => (int)$payment['amount'],
            'referenceNo'   => $payment['reference_no'] ?: null,
            'notes'         => $payment['notes'] ?: null,
            'voucherId'     => $payment['voucher_id'] !== null ? (string)$payment['voucher_id'] : null,
        ], $paymentsStmt->fetchAll() ?: []),
        'documents'       => array_map(static fn(array $doc): array => [
            'id'           => (string)$doc['id'],
            'documentType' => (string)$doc['document_type'],
            'originalName' => (string)$doc['original_name'],
            'filePath'     => (string)$doc['file_path'],
            'mimeType'     => (string)$doc['mime_type'],
            'fileSize'     => (int)$doc['file_size'],
            'createdAt'    => (string)$doc['created_at'],
        ], $docsStmt->fetchAll() ?: []),
        'totals'          => [
            'earningsTotal'    => (int)$row['earnings_total'],
            'deductionsTotal'  => (int)$row['deductions_total'],
            'netTotal'         => (int)$row['net_total'],
            'employerCostTotal' => (int)$row['employer_cost_total'],
            'paymentsTotal'    => (int)$row['payments_total'],
            'balanceDue'       => (int)$row['balance_due'],
        ],
        'approvedAt'  => $row['approved_at'] ?: null,
        'issuedAt'    => $row['issued_at'] ?: null,
        'cancelledAt' => $row['cancelled_at'] ?: null,
    ];
}

function acc_payroll_store_payslip(PDO $pdo, array $payload, array $actor, ?int $payslipId = null): array
{
    $employeeId = acc_parse_id($payload['employeeId'] ?? null);
    if ($employeeId === null) {
        app_json(['success' => false, 'error' => 'employeeId الزامی است.'], 400);
    }
    $employee = app_hr_fetch_employee($pdo, $employeeId);
    if (!$employee) {
        app_json(['success' => false, 'error' => 'پرسنل یافت نشد.'], 404);
    }
    $period = acc_payroll_find_or_create_period($pdo, $payload, $actor);
    $inputs = is_array($payload['inputs'] ?? null) ? $payload['inputs'] : [];
    $notes  = ($v = acc_normalize_text($payload['notes'] ?? '')) !== '' ? $v : null;

    if ($payslipId !== null) {
        $current = acc_payroll_fetch_payslip_detail($pdo, $payslipId);
        if (!$current) {
            app_json(['success' => false, 'error' => 'فیش حقوقی یافت نشد.'], 404);
        }
        if ($current['status'] !== 'draft') {
            app_json(['success' => false, 'error' => 'فقط فیش‌های حقوقی در وضعیت پیش‌نویس قابل ویرایش هستند.'], 400);
        }
    }

    $computed      = acc_payroll_compute_items($pdo, $employee, $inputs);
    $paymentsTotal = 0;
    if ($payslipId !== null) {
        $paymentsTotal = (int)(($current['totals'] ?? [])['paymentsTotal'] ?? 0);
    }
    $balanceDue = $computed['netTotal'] - $paymentsTotal;

    if ($payslipId === null) {
        $pdo->prepare(
            'INSERT INTO acc_payslips
             (period_id, employee_id, status, inputs_json, formula_snapshot_json,
              earnings_total, deductions_total, net_total, employer_cost_total,
              payments_total, balance_due, notes, created_by_user_id, updated_by_user_id)
             VALUES (:period_id, :employee_id, :status, :inputs_json, :formula_snapshot_json,
                     :earnings_total, :deductions_total, :net_total, :employer_cost_total,
                     :payments_total, :balance_due, :notes, :user_id, :user_id2)'
        )->execute([
            'period_id'             => (int)$period['id'],
            'employee_id'           => $employeeId,
            'status'                => 'draft',
            'inputs_json'           => json_encode($inputs, JSON_UNESCAPED_UNICODE),
            'formula_snapshot_json' => json_encode($computed['formulaSnapshot'], JSON_UNESCAPED_UNICODE),
            'earnings_total'        => $computed['earningsTotal'],
            'deductions_total'      => $computed['deductionsTotal'],
            'net_total'             => $computed['netTotal'],
            'employer_cost_total'   => $computed['employerCostTotal'],
            'payments_total'        => $paymentsTotal,
            'balance_due'           => $balanceDue,
            'notes'                 => $notes,
            'user_id'               => (int)$actor['id'],
            'user_id2'              => (int)$actor['id'],
        ]);
        $payslipId = (int)$pdo->lastInsertId();
        $pdo->prepare('UPDATE acc_payslips SET slip_no = :slip_no WHERE id = :id')->execute([
            'slip_no' => 'PR-' . $period['period_key'] . '-' . $employee['employee_code'],
            'id'      => $payslipId,
        ]);
        app_audit_log($pdo, 'accounting.payroll.payslip.created', 'acc_payslips', (string)$payslipId, [
            'employeeId' => $employeeId,
            'periodId'   => (int)$period['id'],
        ], $actor);
    } else {
        $pdo->prepare(
            'UPDATE acc_payslips
             SET period_id = :period_id, employee_id = :employee_id,
                 inputs_json = :inputs_json, formula_snapshot_json = :formula_snapshot_json,
                 earnings_total = :earnings_total, deductions_total = :deductions_total,
                 net_total = :net_total, employer_cost_total = :employer_cost_total,
                 payments_total = :payments_total, balance_due = :balance_due,
                 notes = :notes, updated_by_user_id = :user_id
             WHERE id = :id'
        )->execute([
            'period_id'             => (int)$period['id'],
            'employee_id'           => $employeeId,
            'inputs_json'           => json_encode($inputs, JSON_UNESCAPED_UNICODE),
            'formula_snapshot_json' => json_encode($computed['formulaSnapshot'], JSON_UNESCAPED_UNICODE),
            'earnings_total'        => $computed['earningsTotal'],
            'deductions_total'      => $computed['deductionsTotal'],
            'net_total'             => $computed['netTotal'],
            'employer_cost_total'   => $computed['employerCostTotal'],
            'payments_total'        => $paymentsTotal,
            'balance_due'           => $balanceDue,
            'notes'                 => $notes,
            'user_id'               => (int)$actor['id'],
            'id'                    => $payslipId,
        ]);
        $pdo->prepare('DELETE FROM acc_payslip_items WHERE payslip_id = :id')->execute(['id' => $payslipId]);
        app_audit_log($pdo, 'accounting.payroll.payslip.updated', 'acc_payslips', (string)$payslipId, [
            'employeeId' => $employeeId,
            'periodId'   => (int)$period['id'],
        ], $actor);
    }

    $itemStmt = $pdo->prepare(
        'INSERT INTO acc_payslip_items
         (payslip_id, item_key, item_label, item_type, account_key, amount, formula_meta_json, sort_order)
         VALUES (:payslip_id, :item_key, :item_label, :item_type, :account_key, :amount, :formula_meta_json, :sort_order)'
    );
    foreach ($computed['items'] as $item) {
        $itemStmt->execute([
            'payslip_id'       => $payslipId,
            'item_key'         => $item['itemKey'],
            'item_label'       => $item['label'],
            'item_type'        => $item['type'],
            'account_key'      => $item['accountKey'],
            'amount'           => $item['amount'],
            'formula_meta_json' => json_encode($item['formulaMeta'], JSON_UNESCAPED_UNICODE),
            'sort_order'       => $item['sortOrder'],
        ]);
    }

    return acc_payroll_fetch_payslip_detail($pdo, $payslipId) ?: [];
}

function acc_payroll_delete_payslip(PDO $pdo, int $payslipId): array
{
    $payslip = acc_payroll_fetch_payslip_detail($pdo, $payslipId);
    if (!$payslip) {
        throw new RuntimeException('فیش حقوقی یافت نشد.');
    }
    if ((string)($payslip['status'] ?? 'draft') !== 'draft') {
        throw new RuntimeException('فقط فیش‌های پیش‌نویس قابل حذف هستند.');
    }
    if ((int)(($payslip['totals'] ?? [])['paymentsTotal'] ?? 0) > 0 || !empty($payslip['accrualVoucherId'])) {
        throw new RuntimeException('فیشی که پرداخت یا سند حسابداری دارد قابل حذف نیست.');
    }

    acc_payroll_transact($pdo, function() use ($pdo, $payslipId) {
        $pdo->prepare('DELETE FROM acc_payslip_documents WHERE payslip_id = :id')->execute(['id' => $payslipId]);
        $pdo->prepare('DELETE FROM acc_payslip_items WHERE payslip_id = :id')->execute(['id' => $payslipId]);
        $pdo->prepare('DELETE FROM acc_payslip_payments WHERE payslip_id = :id')->execute(['id' => $payslipId]);
        $pdo->prepare('DELETE FROM acc_payslips WHERE id = :id')->execute(['id' => $payslipId]);
    });

    return $payslip;
}

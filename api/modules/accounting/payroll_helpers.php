<?php
declare(strict_types=1);

require_once __DIR__ . '/../../common/accounting_payroll_schema.php';
require_once __DIR__ . '/payroll_formula_engine.php';
require_once __DIR__ . '/payroll_journal.php';

function acc_payroll_ensure(PDO $pdo): void
{
    if (acc_payroll_schema_ready($pdo)) {
        return;
    }

    try {
        app_ensure_accounting_payroll_schema($pdo);
    } catch (Throwable $e) {
        if (!acc_payroll_schema_ready($pdo)) {
            throw $e;
        }
    }
}

function acc_payroll_schema_ready(PDO $pdo): bool
{
    $tables = [
        'hr_employees',
        'acc_payroll_periods',
        'acc_payslips',
        'acc_payslip_items',
        'acc_payslip_payments',
        'acc_payslip_documents',
    ];
    $placeholders = implode(', ', array_fill(0, count($tables), '?'));
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS total
         FROM information_schema.tables
         WHERE table_schema = DATABASE()
           AND table_name IN (' . $placeholders . ')'
    );
    $stmt->execute($tables);
    return (int)($stmt->fetch()['total'] ?? 0) === count($tables);
}

function acc_payroll_employee_from_row(array $row): array
{
    return app_hr_employee_from_row($row);
}

function acc_payroll_period_from_row(array $row): array
{
    return [
        'id' => (string)$row['id'],
        'periodKey' => (string)$row['period_key'],
        'title' => (string)$row['title'],
        'year' => (int)$row['period_year'],
        'month' => (int)$row['period_month'],
        'startDate' => (string)$row['start_date'],
        'endDate' => (string)$row['end_date'],
        'payDate' => $row['pay_date'] ?: null,
        'status' => (string)$row['status'],
    ];
}

function acc_payroll_fetch_employee(PDO $pdo, int $employeeId): ?array
{
    return app_hr_fetch_employee($pdo, $employeeId);
}

function acc_payroll_fetch_period(PDO $pdo, int $periodId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM acc_payroll_periods WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $periodId]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

function acc_payroll_list_employees(PDO $pdo, string $q, ?bool $isActive): array
{
    return app_hr_list_employees($pdo, $q, $isActive);
}

function acc_payroll_save_employee(PDO $pdo, array $payload, array $actor, ?int $employeeId = null): array
{
    return app_hr_save_employee($pdo, $payload, $actor, $employeeId);
}

function acc_payroll_find_or_create_period(PDO $pdo, array $payload, array $actor): array
{
    $periodId = acc_parse_id($payload['periodId'] ?? null);
    if ($periodId !== null) {
        $row = acc_payroll_fetch_period($pdo, $periodId);
        if (!$row) {
            app_json(['success' => false, 'error' => 'Payroll period not found.'], 404);
        }
        return $row;
    }

    $periodKey = acc_normalize_text($payload['periodKey'] ?? '');
    if ($periodKey === '' && isset($payload['year'], $payload['month'])) {
        $periodKey = sprintf('%04d-%02d', (int)$payload['year'], (int)$payload['month']);
    }
    if (!preg_match('/^\d{4}-\d{2}$/', $periodKey)) {
        app_json(['success' => false, 'error' => 'periodKey in YYYY-MM format is required.'], 400);
    }

    $stmt = $pdo->prepare('SELECT * FROM acc_payroll_periods WHERE period_key = :period_key LIMIT 1');
    $stmt->execute(['period_key' => $periodKey]);
    $row = $stmt->fetch();
    if ($row) {
        return $row;
    }

    $year = (int)substr($periodKey, 0, 4);
    $month = (int)substr($periodKey, 5, 2);
    $startDate = acc_parse_date((string)($payload['startDate'] ?? ($periodKey . '-01'))) ?? ($periodKey . '-01');
    $endDate = acc_parse_date((string)($payload['endDate'] ?? date('Y-m-t', strtotime($startDate)))) ?? date('Y-m-t', strtotime($startDate));
    $payDate = acc_parse_date((string)($payload['payDate'] ?? $endDate));
    $title = acc_normalize_text($payload['title'] ?? ('Payroll ' . $periodKey));

    $insert = $pdo->prepare('INSERT INTO acc_payroll_periods (period_key, title, period_year, period_month, start_date, end_date, pay_date, status, created_by_user_id, updated_by_user_id) VALUES (:period_key, :title, :period_year, :period_month, :start_date, :end_date, :pay_date, :status, :user_id, :user_id2)');
    $insert->execute([
        'period_key' => $periodKey,
        'title' => $title,
        'period_year' => $year,
        'period_month' => $month,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'pay_date' => $payDate,
        'status' => 'open',
        'user_id' => (int)$actor['id'],
        'user_id2' => (int)$actor['id'],
    ]);
    return acc_payroll_fetch_period($pdo, (int)$pdo->lastInsertId()) ?: [];
}

function acc_payroll_fetch_payslip_detail(PDO $pdo, int $payslipId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM acc_payslips WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $payslipId]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $employee = acc_payroll_fetch_employee($pdo, (int)$row['employee_id']);
    $period = acc_payroll_fetch_period($pdo, (int)$row['period_id']);
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
        'id' => (string)$row['id'],
        'slipNo' => $row['slip_no'] ?: null,
        'status' => (string)$row['status'],
        'currencyCode' => (string)$row['currency_code'],
        'inputs' => json_decode((string)($row['inputs_json'] ?? 'null'), true) ?: [],
        'notes' => $row['notes'] ?: null,
        'accrualVoucherId' => $row['accrual_voucher_id'] !== null ? (string)$row['accrual_voucher_id'] : null,
        'employee' => acc_payroll_employee_from_row($employee),
        'period' => acc_payroll_period_from_row($period),
        'items' => array_map(static fn(array $item): array => ['id' => (string)$item['id'], 'itemKey' => (string)$item['item_key'], 'label' => (string)$item['item_label'], 'type' => (string)$item['item_type'], 'accountKey' => $item['account_key'] ?: null, 'amount' => (int)$item['amount'], 'sortOrder' => (int)$item['sort_order']], $itemsStmt->fetchAll() ?: []),
        'payments' => array_map(static fn(array $payment): array => ['id' => (string)$payment['id'], 'paymentDate' => (string)$payment['payment_date'], 'paymentMethod' => (string)$payment['payment_method'], 'accountId' => $payment['account_id'] !== null ? (string)$payment['account_id'] : null, 'amount' => (int)$payment['amount'], 'referenceNo' => $payment['reference_no'] ?: null, 'notes' => $payment['notes'] ?: null, 'voucherId' => $payment['voucher_id'] !== null ? (string)$payment['voucher_id'] : null], $paymentsStmt->fetchAll() ?: []),
        'documents' => array_map(static fn(array $doc): array => ['id' => (string)$doc['id'], 'documentType' => (string)$doc['document_type'], 'originalName' => (string)$doc['original_name'], 'filePath' => (string)$doc['file_path'], 'mimeType' => (string)$doc['mime_type'], 'fileSize' => (int)$doc['file_size'], 'createdAt' => (string)$doc['created_at']], $docsStmt->fetchAll() ?: []),
        'totals' => ['earningsTotal' => (int)$row['earnings_total'], 'deductionsTotal' => (int)$row['deductions_total'], 'netTotal' => (int)$row['net_total'], 'employerCostTotal' => (int)$row['employer_cost_total'], 'paymentsTotal' => (int)$row['payments_total'], 'balanceDue' => (int)$row['balance_due']],
        'approvedAt' => $row['approved_at'] ?: null,
        'issuedAt' => $row['issued_at'] ?: null,
        'cancelledAt' => $row['cancelled_at'] ?: null,
    ];
}

function acc_payroll_store_payslip(PDO $pdo, array $payload, array $actor, ?int $payslipId = null): array
{
    $employeeId = acc_parse_id($payload['employeeId'] ?? null);
    if ($employeeId === null) {
        app_json(['success' => false, 'error' => 'employeeId is required.'], 400);
    }
    $employee = acc_payroll_fetch_employee($pdo, $employeeId);
    if (!$employee) {
        app_json(['success' => false, 'error' => 'Employee not found.'], 404);
    }
    $period = acc_payroll_find_or_create_period($pdo, $payload, $actor);
    $inputs = is_array($payload['inputs'] ?? null) ? $payload['inputs'] : [];
    $notes = ($v = acc_normalize_text($payload['notes'] ?? '')) !== '' ? $v : null;

    if ($payslipId !== null) {
        $current = acc_payroll_fetch_payslip_detail($pdo, $payslipId);
        if (!$current) {
            app_json(['success' => false, 'error' => 'Payslip not found.'], 404);
        }
        if ($current['status'] !== 'draft') {
            app_json(['success' => false, 'error' => 'Only draft payslips can be edited.'], 400);
        }
    }

    $computed = acc_payroll_compute_items($pdo, $employee, $inputs);
    $paymentsTotal = 0;
    if ($payslipId !== null) {
        $currentTotals = $current['totals'] ?? [];
        $paymentsTotal = (int)($currentTotals['paymentsTotal'] ?? 0);
    }
    $balanceDue = $computed['netTotal'] - $paymentsTotal;

    if ($payslipId === null) {
        $sql = 'INSERT INTO acc_payslips (period_id, employee_id, status, inputs_json, formula_snapshot_json, earnings_total, deductions_total, net_total, employer_cost_total, payments_total, balance_due, notes, created_by_user_id, updated_by_user_id) VALUES (:period_id, :employee_id, :status, :inputs_json, :formula_snapshot_json, :earnings_total, :deductions_total, :net_total, :employer_cost_total, :payments_total, :balance_due, :notes, :user_id, :user_id2)';
        $params = ['period_id' => (int)$period['id'], 'employee_id' => $employeeId, 'status' => 'draft', 'inputs_json' => json_encode($inputs, JSON_UNESCAPED_UNICODE), 'formula_snapshot_json' => json_encode($computed['formulaSnapshot'], JSON_UNESCAPED_UNICODE), 'earnings_total' => $computed['earningsTotal'], 'deductions_total' => $computed['deductionsTotal'], 'net_total' => $computed['netTotal'], 'employer_cost_total' => $computed['employerCostTotal'], 'payments_total' => $paymentsTotal, 'balance_due' => $balanceDue, 'notes' => $notes, 'user_id' => (int)$actor['id'], 'user_id2' => (int)$actor['id']];
        $pdo->prepare($sql)->execute($params);
        $payslipId = (int)$pdo->lastInsertId();
        $pdo->prepare('UPDATE acc_payslips SET slip_no = :slip_no WHERE id = :id')->execute(['slip_no' => 'PR-' . $period['period_key'] . '-' . $employee['employee_code'], 'id' => $payslipId]);
        app_audit_log($pdo, 'accounting.payroll.payslip.created', 'acc_payslips', (string)$payslipId, ['employeeId' => $employeeId, 'periodId' => (int)$period['id']], $actor);
    } else {
        $sql = 'UPDATE acc_payslips SET period_id = :period_id, employee_id = :employee_id, inputs_json = :inputs_json, formula_snapshot_json = :formula_snapshot_json, earnings_total = :earnings_total, deductions_total = :deductions_total, net_total = :net_total, employer_cost_total = :employer_cost_total, payments_total = :payments_total, balance_due = :balance_due, notes = :notes, updated_by_user_id = :user_id WHERE id = :id';
        $params = ['period_id' => (int)$period['id'], 'employee_id' => $employeeId, 'inputs_json' => json_encode($inputs, JSON_UNESCAPED_UNICODE), 'formula_snapshot_json' => json_encode($computed['formulaSnapshot'], JSON_UNESCAPED_UNICODE), 'earnings_total' => $computed['earningsTotal'], 'deductions_total' => $computed['deductionsTotal'], 'net_total' => $computed['netTotal'], 'employer_cost_total' => $computed['employerCostTotal'], 'payments_total' => $paymentsTotal, 'balance_due' => $balanceDue, 'notes' => $notes, 'user_id' => (int)$actor['id'], 'id' => $payslipId];
        $pdo->prepare($sql)->execute($params);
        $pdo->prepare('DELETE FROM acc_payslip_items WHERE payslip_id = :id')->execute(['id' => $payslipId]);
        app_audit_log($pdo, 'accounting.payroll.payslip.updated', 'acc_payslips', (string)$payslipId, ['employeeId' => $employeeId, 'periodId' => (int)$period['id']], $actor);
    }

    $itemStmt = $pdo->prepare('INSERT INTO acc_payslip_items (payslip_id, item_key, item_label, item_type, account_key, amount, formula_meta_json, sort_order) VALUES (:payslip_id, :item_key, :item_label, :item_type, :account_key, :amount, :formula_meta_json, :sort_order)');
    foreach ($computed['items'] as $item) {
        $itemStmt->execute(['payslip_id' => $payslipId, 'item_key' => $item['itemKey'], 'item_label' => $item['label'], 'item_type' => $item['type'], 'account_key' => $item['accountKey'], 'amount' => $item['amount'], 'formula_meta_json' => json_encode($item['formulaMeta'], JSON_UNESCAPED_UNICODE), 'sort_order' => $item['sortOrder']]);
    }

    return acc_payroll_fetch_payslip_detail($pdo, $payslipId) ?: [];
}

function acc_payroll_fetch_latest_period(PDO $pdo): ?array
{
    $stmt = $pdo->query('SELECT * FROM acc_payroll_periods ORDER BY period_key DESC, id DESC LIMIT 1');
    $row = $stmt ? $stmt->fetch() : false;
    return is_array($row) ? $row : null;
}

function acc_payroll_fetch_workspace(PDO $pdo, ?int $periodId = null): ?array
{
    $period = $periodId !== null ? acc_payroll_fetch_period($pdo, $periodId) : acc_payroll_fetch_latest_period($pdo);
    if (!$period) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id, status, net_total, payments_total, balance_due
         FROM acc_payslips
         WHERE period_id = :period_id
         ORDER BY id ASC'
    );
    $stmt->execute(['period_id' => (int)$period['id']]);
    $rows = $stmt->fetchAll() ?: [];

    $summary = [
        'employees' => 0,
        'draft' => 0,
        'approved' => 0,
        'issued' => 0,
        'cancelled' => 0,
        'net' => 0,
        'paid' => 0,
        'due' => 0,
    ];
    $actionable = [
        'approve' => [],
        'issue' => [],
        'payments' => [],
    ];

    foreach ($rows as $row) {
        $status = (string)($row['status'] ?? 'draft');
        $id = (string)($row['id'] ?? '');
        $due = (int)($row['balance_due'] ?? 0);
        $summary['employees']++;
        $summary['net'] += (int)($row['net_total'] ?? 0);
        $summary['paid'] += (int)($row['payments_total'] ?? 0);
        $summary['due'] += $due;

        if (array_key_exists($status, $summary)) {
            $summary[$status]++;
        }
        if ($status === 'draft' && $id !== '') {
            $actionable['approve'][] = $id;
        }
        if ($status === 'approved' && $id !== '') {
            $actionable['issue'][] = $id;
        }
        if ($status === 'issued' && $id !== '' && $due > 0) {
            $actionable['payments'][] = $id;
        }
    }

    $blockers = [];
    if ($summary['employees'] === 0) {
        $blockers[] = [
            'step' => 'prepare',
            'code' => 'no_payslips',
            'message' => 'برای این دوره هنوز فیشی ثبت نشده است.',
        ];
    }
    if (($summary['draft'] + $summary['approved']) === 0 && $summary['issued'] === 0) {
        $blockers[] = [
            'step' => 'approve_issue',
            'code' => 'no_actionable_payslips',
            'message' => 'هیچ فیشی برای تایید یا صدور وجود ندارد.',
        ];
    }
    if ($summary['issued'] === 0) {
        $blockers[] = [
            'step' => 'payments',
            'code' => 'no_issued_payslips',
            'message' => 'ابتدا حداقل یک فیش را صادر کنید.',
        ];
    }

    return [
        'period' => acc_payroll_period_from_row($period),
        'summary' => $summary,
        'actionable' => $actionable,
        'stepStatus' => [
            'period' => 'ready',
            'prepare' => $summary['employees'] > 0 ? 'ready' : 'blocked',
            'approve_issue' => ($summary['draft'] + $summary['approved']) > 0 ? 'ready' : ($summary['issued'] > 0 ? 'completed' : 'blocked'),
            'payments' => $summary['issued'] > 0 ? ($summary['due'] > 0 ? 'ready' : 'completed') : 'blocked',
        ],
        'blockers' => $blockers,
    ];
}

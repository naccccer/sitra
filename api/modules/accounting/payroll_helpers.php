<?php
declare(strict_types=1);

require_once __DIR__ . '/../../common/accounting_payroll_schema.php';
require_once __DIR__ . '/payroll_formula_engine.php';
require_once __DIR__ . '/payroll_journal.php';

function acc_payroll_ensure(PDO $pdo): void
{
    app_ensure_accounting_payroll_schema($pdo);
}

function acc_payroll_employee_from_row(array $row): array
{
    return [
        'id' => (string)$row['id'],
        'employeeCode' => (string)$row['employee_code'],
        'personnelNo' => $row['personnel_no'] ?: null,
        'firstName' => (string)$row['first_name'],
        'lastName' => (string)$row['last_name'],
        'fullName' => trim((string)$row['first_name'] . ' ' . (string)$row['last_name']),
        'nationalId' => $row['national_id'] ?: null,
        'mobile' => $row['mobile'] ?: null,
        'bankName' => $row['bank_name'] ?: null,
        'bankAccountNo' => $row['bank_account_no'] ?: null,
        'bankSheba' => $row['bank_sheba'] ?: null,
        'baseSalary' => (int)$row['base_salary'],
        'defaultInputs' => json_decode((string)($row['default_inputs_json'] ?? 'null'), true) ?: [],
        'notes' => $row['notes'] ?: null,
        'isActive' => ((int)($row['is_active'] ?? 0)) === 1,
        'createdAt' => (string)($row['created_at'] ?? ''),
        'updatedAt' => (string)($row['updated_at'] ?? ''),
    ];
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
    $stmt = $pdo->prepare('SELECT * FROM acc_payroll_employees WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $employeeId]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
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
    $where = [];
    $params = [];
    if ($q !== '') {
        $where[] = '(employee_code LIKE :q OR personnel_no LIKE :q OR first_name LIKE :q OR last_name LIKE :q)';
        $params['q'] = '%' . $q . '%';
    }
    if ($isActive !== null) {
        $where[] = 'is_active = :is_active';
        $params['is_active'] = $isActive ? 1 : 0;
    }
    $stmt = $pdo->prepare('SELECT * FROM acc_payroll_employees' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY last_name ASC, first_name ASC, id ASC');
    $stmt->execute($params);
    return array_map('acc_payroll_employee_from_row', $stmt->fetchAll() ?: []);
}

function acc_payroll_save_employee(PDO $pdo, array $payload, array $actor, ?int $employeeId = null): array
{
    $employeeCode = acc_normalize_text($payload['employeeCode'] ?? '');
    $firstName = acc_normalize_text($payload['firstName'] ?? '');
    $lastName = acc_normalize_text($payload['lastName'] ?? '');
    if ($employeeCode === '' || $firstName === '' || $lastName === '') {
        app_json(['success' => false, 'error' => 'employeeCode, firstName and lastName are required.'], 400);
    }

    $values = [
        'employee_code' => $employeeCode,
        'personnel_no' => ($v = acc_normalize_text($payload['personnelNo'] ?? '')) !== '' ? $v : null,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'national_id' => ($v = acc_normalize_text($payload['nationalId'] ?? '')) !== '' ? $v : null,
        'mobile' => ($v = acc_normalize_text($payload['mobile'] ?? '')) !== '' ? $v : null,
        'bank_name' => ($v = acc_normalize_text($payload['bankName'] ?? '')) !== '' ? $v : null,
        'bank_account_no' => ($v = acc_normalize_text($payload['bankAccountNo'] ?? '')) !== '' ? $v : null,
        'bank_sheba' => ($v = acc_normalize_text($payload['bankSheba'] ?? '')) !== '' ? $v : null,
        'base_salary' => max(0, (int)($payload['baseSalary'] ?? 0)),
        'default_inputs_json' => json_encode(is_array($payload['defaultInputs'] ?? null) ? $payload['defaultInputs'] : [], JSON_UNESCAPED_UNICODE),
        'notes' => ($v = acc_normalize_text($payload['notes'] ?? '')) !== '' ? $v : null,
        'is_active' => acc_parse_bool($payload['isActive'] ?? true, true) ? 1 : 0,
    ];

    if ($employeeId === null) {
        $sql = 'INSERT INTO acc_payroll_employees (employee_code, personnel_no, first_name, last_name, national_id, mobile, bank_name, bank_account_no, bank_sheba, base_salary, default_inputs_json, notes, is_active, created_by_user_id, updated_by_user_id) VALUES (:employee_code, :personnel_no, :first_name, :last_name, :national_id, :mobile, :bank_name, :bank_account_no, :bank_sheba, :base_salary, :default_inputs_json, :notes, :is_active, :user_id, :user_id2)';
        $pdo->prepare($sql)->execute($values + ['user_id' => (int)$actor['id'], 'user_id2' => (int)$actor['id']]);
        $employeeId = (int)$pdo->lastInsertId();
        app_audit_log($pdo, 'accounting.payroll.employee.created', 'acc_payroll_employees', (string)$employeeId, ['employeeCode' => $employeeCode], $actor);
    } else {
        $sql = 'UPDATE acc_payroll_employees SET employee_code = :employee_code, personnel_no = :personnel_no, first_name = :first_name, last_name = :last_name, national_id = :national_id, mobile = :mobile, bank_name = :bank_name, bank_account_no = :bank_account_no, bank_sheba = :bank_sheba, base_salary = :base_salary, default_inputs_json = :default_inputs_json, notes = :notes, is_active = :is_active, updated_by_user_id = :user_id WHERE id = :id';
        $pdo->prepare($sql)->execute($values + ['user_id' => (int)$actor['id'], 'id' => $employeeId]);
        app_audit_log($pdo, 'accounting.payroll.employee.updated', 'acc_payroll_employees', (string)$employeeId, ['employeeCode' => $employeeCode], $actor);
    }

    $row = acc_payroll_fetch_employee($pdo, $employeeId);
    return acc_payroll_employee_from_row($row ?: []);
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
        'id' => (string)$row['payslip_id'],
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
    $paymentsTotal = $payslipId !== null ? (int)(acc_payroll_fetch_payslip_detail($pdo, $payslipId)['totals']['paymentsTotal'] ?? 0) : 0;
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

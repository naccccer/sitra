<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/accounting_helpers.php';
require_once __DIR__ . '/payroll_helpers.php';
require_once __DIR__ . '/payroll_patch.php';
app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
app_require_module_enabled($pdo, 'accounting');
acc_payroll_ensure($pdo);
$actor = app_require_auth(['admin', 'manager']);
$entity = acc_normalize_text($_GET['entity'] ?? '');
if ($method === 'GET') {
    acc_require_permission($actor, 'accounting.payroll.read', $pdo);
    if ($entity === 'period') {
        $periodId = acc_parse_id($_GET['id'] ?? null);
        if ($periodId !== null) {
            $period = acc_payroll_fetch_period($pdo, $periodId);
            if (!$period) {
                app_json(['success' => false, 'error' => 'Payroll period not found.'], 404);
            }
            app_json(['success' => true, 'period' => acc_payroll_period_from_row($period)]);
        }
        $status = acc_normalize_text($_GET['status'] ?? '');
        $where = [];
        $params = [];
        if ($status !== '' && in_array($status, ['open', 'issued', 'closed'], true)) {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }
        $stmt = $pdo->prepare(
            'SELECT * FROM acc_payroll_periods'
            . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY period_key DESC, id DESC'
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll() ?: [];
        app_json([
            'success' => true,
            'periods' => array_map('acc_payroll_period_from_row', $rows),
        ]);
    }
    if ($entity === 'employee') {
        $employeeId = acc_parse_id($_GET['id'] ?? null);
        if ($employeeId !== null) {
            $employee = acc_payroll_fetch_employee($pdo, $employeeId);
            if (!$employee) {
                app_json(['success' => false, 'error' => 'Employee not found.'], 404);
            }
            app_json(['success' => true, 'employee' => acc_payroll_employee_from_row($employee)]);
        }
        $q = acc_normalize_text($_GET['q'] ?? '');
        $isActive = array_key_exists('isActive', $_GET) ? acc_parse_bool($_GET['isActive'], true) : null;
        app_json(['success' => true, 'employees' => acc_payroll_list_employees($pdo, $q, $isActive)]);
    }
    if ($entity === 'workspace') {
        $periodId = acc_parse_id($_GET['periodId'] ?? ($_GET['id'] ?? null));
        $workspace = acc_payroll_fetch_workspace($pdo, $periodId);
        if (!$workspace) {
            app_json([
                'success' => false,
                'error' => 'Payroll workspace not found.',
                'errorObj' => [
                    'code' => 'workspace_not_found',
                    'message' => 'Payroll workspace not found.',
                    'status' => 404,
                ],
            ], 404);
        }
        app_json(['success' => true, 'workspace' => $workspace]);
    }
    $payslipId = acc_parse_id($_GET['id'] ?? null);
    if ($payslipId !== null) {
        $payslip = acc_payroll_fetch_payslip_detail($pdo, $payslipId);
        if (!$payslip) {
            app_json(['success' => false, 'error' => 'Payslip not found.'], 404);
        }
        app_json(['success' => true, 'payslip' => $payslip]);
    }
    $where = [];
    $params = [];
    $employeeId = acc_parse_id($_GET['employeeId'] ?? null);
    $periodId = acc_parse_id($_GET['periodId'] ?? null);
    $status = acc_normalize_text($_GET['status'] ?? '');
    $periodKey = acc_normalize_text($_GET['periodKey'] ?? '');
    $q = acc_normalize_text($_GET['q'] ?? '');
    $page = max(1, (int)($_GET['page'] ?? 1));
    $pageSize = min(100, max(10, (int)($_GET['pageSize'] ?? 20)));
    $offset = ($page - 1) * $pageSize;
    if ($employeeId !== null) {
        $where[] = 'ps.employee_id = :employee_id';
        $params['employee_id'] = $employeeId;
    }
    if ($periodId !== null) {
        $where[] = 'ps.period_id = :period_id';
        $params['period_id'] = $periodId;
    }
    if ($status !== '' && in_array($status, ['draft', 'approved', 'issued', 'cancelled'], true)) {
        $where[] = 'ps.status = :status';
        $params['status'] = $status;
    }
    if ($periodKey !== '') {
        $where[] = 'p.period_key = :period_key';
        $params['period_key'] = $periodKey;
    }
    if ($q !== '') {
        $where[] = '(ps.slip_no LIKE :q OR e.employee_code LIKE :q OR e.first_name LIKE :q OR e.last_name LIKE :q)';
        $params['q'] = '%' . $q . '%';
    }
    $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $countStmt = $pdo->prepare('SELECT COUNT(*) AS total FROM acc_payslips ps JOIN hr_employees e ON e.id = ps.employee_id JOIN acc_payroll_periods p ON p.id = ps.period_id' . $whereSql);
    $countStmt->execute($params);
    $total = (int)($countStmt->fetch()['total'] ?? 0);
    $sql = 'SELECT ps.*, e.employee_code, e.personnel_no, e.first_name, e.last_name, e.national_id, e.mobile, e.department, e.job_title, e.bank_name, e.bank_account_no, e.bank_sheba, e.base_salary, e.is_active, p.period_key, p.title AS period_title, p.pay_date FROM acc_payslips ps JOIN hr_employees e ON e.id = ps.employee_id JOIN acc_payroll_periods p ON p.id = ps.period_id' . $whereSql . ' ORDER BY p.period_key DESC, e.last_name ASC, e.first_name ASC LIMIT :limit OFFSET :offset';
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }
    $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll() ?: [];
    $payslips = array_map(static function (array $row): array {
        return [
            'id' => (string)$row['id'],
            'slipNo' => $row['slip_no'] ?: null,
            'status' => (string)$row['status'],
            'employee' => ['id' => (string)$row['employee_id'], 'employeeCode' => (string)$row['employee_code'], 'personnelNo' => $row['personnel_no'] ?: null, 'fullName' => trim((string)$row['first_name'] . ' ' . (string)$row['last_name']), 'nationalId' => $row['national_id'] ?: null, 'mobile' => $row['mobile'] ?: null, 'department' => $row['department'] ?: null, 'jobTitle' => $row['job_title'] ?: null, 'bankName' => $row['bank_name'] ?: null, 'bankAccountNo' => $row['bank_account_no'] ?: null, 'bankSheba' => $row['bank_sheba'] ?: null, 'baseSalary' => (int)$row['base_salary'], 'isActive' => ((int)($row['is_active'] ?? 0)) === 1],
            'period' => ['id' => (string)$row['period_id'], 'periodKey' => (string)$row['period_key'], 'title' => (string)$row['period_title'], 'payDate' => $row['pay_date'] ?: null],
            'totals' => ['earningsTotal' => (int)$row['earnings_total'], 'deductionsTotal' => (int)$row['deductions_total'], 'netTotal' => (int)$row['net_total'], 'paymentsTotal' => (int)$row['payments_total'], 'balanceDue' => (int)$row['balance_due']],
            'issuedAt' => $row['issued_at'] ?: null,
        ];
    }, $rows);
    app_json(['success' => true, 'payslips' => $payslips, 'total' => $total, 'page' => $page, 'pageSize' => $pageSize, 'totalPages' => max(1, (int)ceil($total / $pageSize))]);
}
$payload = app_read_json_body();
if ($method !== 'GET') {
    app_require_csrf();
}
if ($method === 'POST') {
    $entity = acc_normalize_text($payload['entity'] ?? $entity);
    if ($entity === 'period') {
        acc_require_permission($actor, 'accounting.payroll.write', $pdo);
        try {
            $period = acc_payroll_find_or_create_period($pdo, $payload, $actor);
            app_json(['success' => true, 'period' => acc_payroll_period_from_row($period)], 201);
        } catch (Throwable $e) {
            app_json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }
    acc_require_permission($actor, 'accounting.payroll.write', $pdo);
    try {
        if ($entity === 'employee') {
            app_json(['success' => true, 'employee' => acc_payroll_save_employee($pdo, $payload, $actor)], 201);
        }
        $pdo->beginTransaction();
        $payslip = acc_payroll_store_payslip($pdo, $payload, $actor);
        $pdo->commit();
        app_json(['success' => true, 'payslip' => $payslip], 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        app_json(['success' => false, 'error' => $e->getMessage()], 422);
    }
}
if ($method === 'PUT') {
    $entity = acc_normalize_text($payload['entity'] ?? $entity);
    if ($entity === 'period') {
        acc_require_permission($actor, 'accounting.payroll.write', $pdo);
        $periodId = acc_parse_id($payload['id'] ?? null);
        if ($periodId === null) {
            app_json(['success' => false, 'error' => 'Valid period id is required.'], 400);
        }
        $existing = acc_payroll_fetch_period($pdo, $periodId);
        if (!$existing) {
            app_json(['success' => false, 'error' => 'Payroll period not found.'], 404);
        }
        $title = ($v = acc_normalize_text($payload['title'] ?? (string)$existing['title'])) !== '' ? $v : (string)$existing['title'];
        $startDate = acc_parse_date(acc_normalize_text($payload['startDate'] ?? '')) ?? (string)$existing['start_date'];
        $endDate = acc_parse_date(acc_normalize_text($payload['endDate'] ?? '')) ?? (string)$existing['end_date'];
        $payDate = acc_parse_date(acc_normalize_text($payload['payDate'] ?? '')) ?? ($existing['pay_date'] ?: null);
        $status = acc_normalize_text($payload['status'] ?? (string)$existing['status']);
        if (!in_array($status, ['open', 'issued', 'closed'], true)) {
            $status = (string)$existing['status'];
        }
        $pdo->prepare(
            'UPDATE acc_payroll_periods
             SET title = :title, start_date = :start_date, end_date = :end_date, pay_date = :pay_date, status = :status, updated_by_user_id = :user_id
             WHERE id = :id'
        )->execute([
            'title' => $title,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'pay_date' => $payDate,
            'status' => $status,
            'user_id' => (int)$actor['id'],
            'id' => $periodId,
        ]);
        $period = acc_payroll_fetch_period($pdo, $periodId);
        app_json(['success' => true, 'period' => acc_payroll_period_from_row($period ?: $existing)]);
    }
    acc_require_permission($actor, 'accounting.payroll.write', $pdo);
    try {
        if ($entity === 'employee') {
            $employeeId = acc_parse_id($payload['id'] ?? null);
            if ($employeeId === null) {
                app_json(['success' => false, 'error' => 'Valid employee id is required.'], 400);
            }
            app_json(['success' => true, 'employee' => acc_payroll_save_employee($pdo, $payload, $actor, $employeeId)]);
        }
        $payslipId = acc_parse_id($payload['id'] ?? null);
        if ($payslipId === null) {
            app_json(['success' => false, 'error' => 'Valid payslip id is required.'], 400);
        }
        $pdo->beginTransaction();
        $payslip = acc_payroll_store_payslip($pdo, $payload, $actor, $payslipId);
        $pdo->commit();
        app_json(['success' => true, 'payslip' => $payslip]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        app_json(['success' => false, 'error' => $e->getMessage()], 422);
    }
}
if ($method === 'DELETE') {
    acc_require_permission($actor, 'accounting.payroll.write', $pdo);
    $entity = acc_normalize_text($payload['entity'] ?? $entity);
    if ($entity !== 'period') {
        app_json(['success' => false, 'error' => 'Delete is only supported for payroll periods.'], 400);
    }
    $periodId = acc_parse_id($payload['id'] ?? ($_GET['id'] ?? null));
    if ($periodId === null) {
        app_json(['success' => false, 'error' => 'Valid period id is required.'], 400);
    }
    $period = acc_payroll_fetch_period($pdo, $periodId);
    if (!$period) {
        app_json(['success' => false, 'error' => 'Payroll period not found.'], 404);
    }

    $statsStmt = $pdo->prepare(
        'SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status <> \'draft\' THEN 1 ELSE 0 END) AS non_draft_total,
            SUM(CASE WHEN payments_total > 0 THEN 1 ELSE 0 END) AS paid_total,
            SUM(CASE WHEN accrual_voucher_id IS NOT NULL THEN 1 ELSE 0 END) AS journaled_total
         FROM acc_payslips
         WHERE period_id = :period_id'
    );
    $statsStmt->execute(['period_id' => $periodId]);
    $stats = $statsStmt->fetch() ?: [];
    $payslipCount = (int)($stats['total'] ?? 0);
    $nonDraftTotal = (int)($stats['non_draft_total'] ?? 0);
    $paidTotal = (int)($stats['paid_total'] ?? 0);
    $journaledTotal = (int)($stats['journaled_total'] ?? 0);

    if ($nonDraftTotal > 0 || $paidTotal > 0 || $journaledTotal > 0) {
        app_json([
            'success' => false,
            'error' => 'This period contains approved/issued or paid payslips and cannot be deleted.',
        ], 422);
    }

    $pdo->beginTransaction();
    try {
        if ($payslipCount > 0) {
            $pdo->prepare('DELETE FROM acc_payslips WHERE period_id = :period_id')->execute([
                'period_id' => $periodId,
            ]);
        }
        $pdo->prepare('DELETE FROM acc_payroll_periods WHERE id = :id')->execute(['id' => $periodId]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        app_json(['success' => false, 'error' => $e->getMessage()], 422);
    }

    app_audit_log($pdo, 'accounting_payroll.period.deleted', 'acc_payroll_periods', (string)$periodId, [
        'periodKey' => (string)($period['period_key'] ?? ''),
        'deletedPayslips' => $payslipCount,
    ], $actor);

    app_json([
        'success' => true,
        'deleted' => [
            'id' => (string)$periodId,
            'periodKey' => (string)($period['period_key'] ?? ''),
            'payslipsDeleted' => $payslipCount,
        ],
    ]);
}
acc_payroll_handle_patch($pdo, $actor, $payload);

<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/accounting_helpers.php';
require_once __DIR__ . '/payroll_helpers.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
app_require_module_enabled($pdo, 'accounting');
app_ensure_accounting_schema($pdo);
acc_payroll_ensure($pdo);

$actor = app_require_auth(['admin', 'manager']);
$entity = acc_normalize_text($_GET['entity'] ?? '');

if ($method === 'GET') {
    acc_require_permission($actor, 'accounting.payroll.read', $pdo);

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
    $countStmt = $pdo->prepare('SELECT COUNT(*) AS total FROM acc_payslips ps JOIN acc_payroll_employees e ON e.id = ps.employee_id JOIN acc_payroll_periods p ON p.id = ps.period_id' . $whereSql);
    $countStmt->execute($params);
    $total = (int)($countStmt->fetch()['total'] ?? 0);

    $sql = 'SELECT ps.*, e.employee_code, e.first_name, e.last_name, p.period_key, p.title AS period_title, p.pay_date FROM acc_payslips ps JOIN acc_payroll_employees e ON e.id = ps.employee_id JOIN acc_payroll_periods p ON p.id = ps.period_id' . $whereSql . ' ORDER BY p.period_key DESC, e.last_name ASC, e.first_name ASC LIMIT :limit OFFSET :offset';
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
            'employee' => ['id' => (string)$row['employee_id'], 'employeeCode' => (string)$row['employee_code'], 'fullName' => trim((string)$row['first_name'] . ' ' . (string)$row['last_name'])],
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

$payslipId = acc_parse_id($payload['id'] ?? null);
$action = acc_normalize_text($payload['action'] ?? '');
if ($payslipId === null) {
    app_json(['success' => false, 'error' => 'Valid payslip id is required.'], 400);
}

$payslip = acc_payroll_fetch_payslip_detail($pdo, $payslipId);
if (!$payslip) {
    app_json(['success' => false, 'error' => 'Payslip not found.'], 404);
}

try {
    if ($action === 'approve') {
        acc_require_permission($actor, 'accounting.payroll.approve', $pdo);
        if ($payslip['status'] !== 'draft') {
            app_json(['success' => false, 'error' => 'Only draft payslips can be approved.'], 400);
        }
        $pdo->prepare('UPDATE acc_payslips SET status = :status, approved_by_user_id = :user_id, approved_at = CURRENT_TIMESTAMP, updated_by_user_id = :user_id2 WHERE id = :id')->execute(['status' => 'approved', 'user_id' => (int)$actor['id'], 'user_id2' => (int)$actor['id'], 'id' => $payslipId]);
        app_audit_log($pdo, 'accounting.payroll.payslip.approved', 'acc_payslips', (string)$payslipId, [], $actor);
    } elseif ($action === 'issue') {
        acc_require_permission($actor, 'accounting.payroll.issue', $pdo);
        if ($payslip['status'] !== 'approved') {
            app_json(['success' => false, 'error' => 'Only approved payslips can be issued.'], 400);
        }
        $pdo->beginTransaction();
        $voucherId = acc_payroll_create_accrual_voucher($pdo, $payslip, $actor);
        $pdo->prepare('UPDATE acc_payslips SET status = :status, accrual_voucher_id = :voucher_id, issued_by_user_id = :user_id, issued_at = CURRENT_TIMESTAMP, updated_by_user_id = :user_id2 WHERE id = :id')->execute(['status' => 'issued', 'voucher_id' => $voucherId, 'user_id' => (int)$actor['id'], 'user_id2' => (int)$actor['id'], 'id' => $payslipId]);
        $pdo->prepare('UPDATE acc_payroll_periods SET status = :status, updated_by_user_id = :user_id WHERE id = :id AND status = :current_status')->execute(['status' => 'issued', 'user_id' => (int)$actor['id'], 'id' => (int)$payslip['period']['id'], 'current_status' => 'open']);
        $pdo->commit();
        app_audit_log($pdo, 'accounting.payroll.payslip.issued', 'acc_payslips', (string)$payslipId, ['voucherId' => $voucherId], $actor);
    } elseif ($action === 'cancel') {
        acc_require_permission($actor, 'accounting.payroll.write', $pdo);
        if ($payslip['status'] === 'cancelled') {
            app_json(['success' => false, 'error' => 'Payslip is already cancelled.'], 400);
        }
        if ((int)$payslip['totals']['paymentsTotal'] > 0) {
            app_json(['success' => false, 'error' => 'Paid payslips cannot be cancelled.'], 400);
        }
        $pdo->beginTransaction();
        if (!empty($payslip['accrualVoucherId'])) {
            $pdo->prepare('UPDATE acc_vouchers SET status = :status WHERE id = :id')->execute(['status' => 'cancelled', 'id' => (int)$payslip['accrualVoucherId']]);
        }
        $pdo->prepare('UPDATE acc_payslips SET status = :status, cancelled_by_user_id = :user_id, cancelled_at = CURRENT_TIMESTAMP, updated_by_user_id = :user_id2 WHERE id = :id')->execute(['status' => 'cancelled', 'user_id' => (int)$actor['id'], 'user_id2' => (int)$actor['id'], 'id' => $payslipId]);
        $pdo->commit();
        app_audit_log($pdo, 'accounting.payroll.payslip.cancelled', 'acc_payslips', (string)$payslipId, [], $actor);
    } elseif ($action === 'record_payment') {
        if (
            !app_user_has_permission($actor, 'accounting.payroll.payments', $pdo)
            && !app_user_has_permission($actor, 'accounting.payroll.record_payment', $pdo)
        ) {
            app_json(['success' => false, 'error' => 'Access denied.'], 403);
        }
        if ($payslip['status'] !== 'issued') {
            app_json(['success' => false, 'error' => 'Only issued payslips can be paid.'], 400);
        }
        $amount = max(0, (int)($payload['amount'] ?? 0));
        if ($amount <= 0 || $amount > (int)$payslip['totals']['balanceDue']) {
            app_json(['success' => false, 'error' => 'Payment amount must be positive and within balance due.'], 400);
        }
        $paymentDate = acc_parse_date(acc_normalize_text($payload['paymentDate'] ?? '')) ?? date('Y-m-d');
        $paymentMethod = acc_normalize_text($payload['paymentMethod'] ?? 'bank');
        if (!in_array($paymentMethod, ['cash', 'bank'], true)) {
            app_json(['success' => false, 'error' => 'paymentMethod must be cash or bank.'], 400);
        }
        $pdo->beginTransaction();
        $pdo->prepare('INSERT INTO acc_payslip_payments (payslip_id, payment_date, payment_method, account_id, amount, reference_no, notes, created_by_user_id) VALUES (:payslip_id, :payment_date, :payment_method, :account_id, :amount, :reference_no, :notes, :user_id)')->execute(['payslip_id' => $payslipId, 'payment_date' => $paymentDate, 'payment_method' => $paymentMethod, 'account_id' => acc_parse_id($payload['accountId'] ?? null), 'amount' => $amount, 'reference_no' => ($v = acc_normalize_text($payload['referenceNo'] ?? '')) !== '' ? $v : null, 'notes' => ($v = acc_normalize_text($payload['notes'] ?? '')) !== '' ? $v : null, 'user_id' => (int)$actor['id']]);
        $paymentId = (int)$pdo->lastInsertId();
        $voucherId = acc_payroll_create_payment_voucher($pdo, $payslip, ['id' => $paymentId, 'paymentDate' => $paymentDate, 'paymentMethod' => $paymentMethod, 'accountId' => acc_parse_id($payload['accountId'] ?? null), 'amount' => $amount], $actor);
        $pdo->prepare('UPDATE acc_payslip_payments SET voucher_id = :voucher_id WHERE id = :id')->execute(['voucher_id' => $voucherId, 'id' => $paymentId]);
        $newPaymentsTotal = (int)$payslip['totals']['paymentsTotal'] + $amount;
        $newBalanceDue = (int)$payslip['totals']['netTotal'] - $newPaymentsTotal;
        $pdo->prepare('UPDATE acc_payslips SET payments_total = :payments_total, balance_due = :balance_due, last_payment_date = :last_payment_date, updated_by_user_id = :user_id WHERE id = :id')->execute(['payments_total' => $newPaymentsTotal, 'balance_due' => $newBalanceDue, 'last_payment_date' => $paymentDate, 'user_id' => (int)$actor['id'], 'id' => $payslipId]);
        $pdo->commit();
        app_audit_log($pdo, 'accounting.payroll.payment.recorded', 'acc_payslip_payments', (string)$paymentId, ['payslipId' => $payslipId, 'voucherId' => $voucherId, 'amount' => $amount], $actor);
    } else {
        app_json(['success' => false, 'error' => 'Unknown action. Use approve, issue, cancel, or record_payment.'], 400);
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    app_json(['success' => false, 'error' => $e->getMessage()], 422);
}

$updated = acc_payroll_fetch_payslip_detail($pdo, $payslipId);
app_json(['success' => true, 'payslip' => $updated]);

<?php
declare(strict_types=1);

/**
 * HR-owned public read-model facade for payroll employee projections.
 */
function app_hr_payroll_list_payslips(
    PDO $pdo,
    ?int $employeeId,
    ?int $periodId,
    string $status,
    string $periodKey,
    string $q,
    int $page,
    int $pageSize
): array {
    $where = [];
    $params = [];
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
    $stmt->bindValue(':offset', ($page - 1) * $pageSize, PDO::PARAM_INT);
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
    return ['payslips' => $payslips, 'total' => $total];
}

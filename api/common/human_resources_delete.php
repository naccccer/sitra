<?php
declare(strict_types=1);

function app_hr_count_employee_payslips(PDO $pdo, int $employeeId): int
{
    $stmt = $pdo->prepare('SELECT COUNT(*) AS total FROM acc_payslips WHERE employee_id = :employee_id');
    $stmt->execute(['employee_id' => $employeeId]);
    return (int)($stmt->fetch()['total'] ?? 0);
}

function app_hr_delete_employee(PDO $pdo, int $employeeId, array $actor): array
{
    $current = app_hr_fetch_employee($pdo, $employeeId);
    if (!$current) {
        app_json(['success' => false, 'error' => 'Employee not found.'], 404);
    }

    $payslipRefs = app_hr_count_employee_payslips($pdo, $employeeId);
    if ($payslipRefs > 0) {
        app_json([
            'success' => false,
            'error' => 'امکان حذف این پرسنل وجود ندارد چون فیش حقوق وابسته دارد.',
            'code' => 'hr_employee_has_payslips',
            'payslipRefs' => $payslipRefs,
        ], 409);
    }

    $pdo->prepare('DELETE FROM hr_employees WHERE id = :id')->execute(['id' => $employeeId]);

    app_audit_log(
        $pdo,
        'human_resources.employee.deleted',
        'hr_employees',
        (string)$employeeId,
        ['employeeCode' => (string)($current['employee_code'] ?? '')],
        $actor
    );

    return [
        'id' => (string)$employeeId,
        'employeeCode' => (string)($current['employee_code'] ?? ''),
    ];
}

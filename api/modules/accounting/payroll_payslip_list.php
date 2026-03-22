<?php
declare(strict_types=1);

require_once __DIR__ . '/../human_resources/human_resources_payroll_read_model.php';

function acc_payroll_list_payslips(
    PDO $pdo,
    ?int $employeeId,
    ?int $periodId,
    string $status,
    string $periodKey,
    string $q,
    int $page,
    int $pageSize
): array {
    return app_hr_payroll_list_payslips($pdo, $employeeId, $periodId, $status, $periodKey, $q, $page, $pageSize);
}

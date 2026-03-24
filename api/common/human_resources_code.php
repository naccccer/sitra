<?php
declare(strict_types=1);

function app_hr_generate_employee_code(PDO $pdo): string
{
    $stmt = $pdo->query(
        "SELECT MAX(CAST(employee_code AS UNSIGNED)) AS max_code
         FROM hr_employees
         WHERE employee_code REGEXP '^[0-9]+$'"
    );
    $maxCode = (int)($stmt->fetch()['max_code'] ?? 0);
    $nextCode = max(1001, $maxCode + 1);
    return (string)$nextCode;
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/accounting_helpers.php';
require_once __DIR__ . '/payroll_helpers.php';

app_handle_preflight(['POST']);
app_require_method(['POST']);
app_require_module_enabled($pdo, 'accounting');
app_ensure_accounting_schema($pdo);
acc_payroll_ensure($pdo);

$actor = app_require_auth(['admin', 'manager']);
if (
    !app_user_has_permission($actor, 'accounting.payroll.write', $pdo)
    && !app_user_has_permission($actor, 'accounting.payroll.import', $pdo)
) {
    app_json(['success' => false, 'error' => 'Access denied.'], 403);
}
app_require_csrf();

$payload = app_read_json_body();
$rows = $payload['rows'] ?? null;
if (!is_array($rows) || $rows === []) {
    app_json(['success' => false, 'error' => 'rows array is required.'], 400);
}

try {
    $period = acc_payroll_find_or_create_period($pdo, $payload, $actor);
} catch (Throwable $e) {
    app_json(['success' => false, 'error' => $e->getMessage()], 422);
}

$results = [];
$warnings = [];
$errors = [];
$created = 0;
$updated = 0;

$findByCode = $pdo->prepare('SELECT * FROM acc_payroll_employees WHERE employee_code = :employee_code LIMIT 1');
$findPayslip = $pdo->prepare('SELECT id, status FROM acc_payslips WHERE employee_id = :employee_id AND period_id = :period_id LIMIT 1');

foreach ($rows as $index => $row) {
    if (!is_array($row)) {
        $errors[] = ['rowIndex' => $index, 'error' => 'Row must be an object.'];
        continue;
    }

    $employeeId = acc_parse_id($row['employeeId'] ?? null);
    $employeeCode = acc_normalize_text($row['employeeCode'] ?? '');
    $employee = null;

    if ($employeeId !== null) {
        $employee = acc_payroll_fetch_employee($pdo, $employeeId);
    } elseif ($employeeCode !== '') {
        $findByCode->execute(['employee_code' => $employeeCode]);
        $employee = $findByCode->fetch() ?: null;
    }

    if (!$employee) {
        $errors[] = ['rowIndex' => $index, 'employeeCode' => $employeeCode !== '' ? $employeeCode : null, 'error' => 'Employee not found.'];
        continue;
    }

    $inputs = is_array($row['inputs'] ?? null) ? $row['inputs'] : [];
    if ($inputs === []) {
        $warnings[] = ['rowIndex' => $index, 'employeeId' => (string)$employee['id'], 'warning' => 'No inputs supplied; employee defaults/base salary were used.'];
    }

    $findPayslip->execute(['employee_id' => (int)$employee['id'], 'period_id' => (int)$period['id']]);
    $existing = $findPayslip->fetch();
    if ($existing && (string)$existing['status'] !== 'draft') {
        $errors[] = ['rowIndex' => $index, 'employeeId' => (string)$employee['id'], 'error' => 'Existing payslip is not in draft status.'];
        continue;
    }

    try {
        $pdo->beginTransaction();
        $payslip = acc_payroll_store_payslip($pdo, [
            'employeeId' => (int)$employee['id'],
            'periodId' => (int)$period['id'],
            'inputs' => $inputs,
            'notes' => acc_normalize_text($row['notes'] ?? ''),
        ], $actor, $existing ? (int)$existing['id'] : null);
        $pdo->commit();

        if ($existing) {
            $updated++;
        } else {
            $created++;
        }

        $results[] = [
            'rowIndex' => $index,
            'status' => $existing ? 'updated' : 'created',
            'employeeId' => $payslip['employee']['id'],
            'payslipId' => $payslip['id'],
            'netTotal' => $payslip['totals']['netTotal'],
        ];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $errors[] = ['rowIndex' => $index, 'employeeId' => (string)$employee['id'], 'error' => $e->getMessage()];
    }
}

app_audit_log($pdo, 'accounting.payroll.imported', 'acc_payroll_periods', (string)$period['id'], [
    'created' => $created,
    'updated' => $updated,
    'warnings' => count($warnings),
    'errors' => count($errors),
], $actor);

app_json([
    'success' => true,
    'period' => acc_payroll_period_from_row($period),
    'created' => $created,
    'updated' => $updated,
    'results' => $results,
    'warnings' => $warnings,
    'errors' => $errors,
]);

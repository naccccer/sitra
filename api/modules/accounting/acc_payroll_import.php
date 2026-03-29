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
app_ensure_audit_logs_table($pdo);

$actor = app_require_auth(['admin', 'manager']);
if (
    !app_user_has_permission($actor, 'accounting.payroll.write', $pdo)
    && !app_user_has_permission($actor, 'accounting.payroll.import', $pdo)
) {
    app_json(['success' => false, 'error' => 'دسترسی غیرمجاز است.'], 403);
}
app_require_csrf();

$payload = app_read_json_body();
$dryRun = acc_parse_bool($payload['dryRun'] ?? false, false) === true;
$rows = $payload['rows'] ?? null;
if (!is_array($rows) || $rows === []) {
    app_json(['success' => false, 'error' => 'آرایه rows الزامی است.'], 400);
}

$period = null;
if ($dryRun) {
    $periodId = acc_parse_id($payload['periodId'] ?? null);
    if ($periodId !== null) {
        $period = acc_payroll_fetch_period($pdo, $periodId);
    } else {
        $periodKey = acc_normalize_text($payload['periodKey'] ?? '');
        if ($periodKey !== '') {
            $stmt = $pdo->prepare('SELECT * FROM acc_payroll_periods WHERE period_key = :period_key LIMIT 1');
            $stmt->execute(['period_key' => $periodKey]);
            $row = $stmt->fetch();
            $period = is_array($row) ? $row : null;
        }
    }
    if (!$period) {
        app_json(['success' => false, 'error' => 'برای پیش‌نمایش، periodId یا periodKey معتبر و موجود الزامی است.'], 422);
    }
} else {
    try {
        $period = acc_payroll_find_or_create_period($pdo, $payload, $actor);
    } catch (Throwable $e) {
        app_json(['success' => false, 'error' => $e->getMessage()], 422);
    }
}

$results = [];
$warnings = [];
$errors = [];
$created = 0;
$updated = 0;

$findPayslip = $pdo->prepare('SELECT id, status FROM acc_payslips WHERE employee_id = :employee_id AND period_id = :period_id LIMIT 1');

foreach ($rows as $index => $row) {
    if (!is_array($row)) {
        $errors[] = ['rowIndex' => $index, 'error' => 'هر ردیف باید به‌صورت آبجکت ارسال شود.'];
        continue;
    }

    $employeeId = acc_parse_id($row['employeeId'] ?? ($row['employee_id'] ?? null));
    $employeeCode = acc_normalize_text($row['employeeCode'] ?? ($row['employee_code'] ?? ''));
    $nationalId = acc_normalize_text($row['nationalId'] ?? ($row['national_id'] ?? ''));
    $employee = null;

    if ($employeeId !== null) {
        $employee = app_hr_fetch_employee($pdo, $employeeId);
    } elseif ($employeeCode !== '') {
        $employee = app_hr_find_employee_by_code($pdo, $employeeCode);
        if (!$employee && $nationalId !== '') {
            $employee = app_hr_find_employee_by_national_id($pdo, $nationalId);
        }
    } elseif ($nationalId !== '') {
        $employee = app_hr_find_employee_by_national_id($pdo, $nationalId);
    }

    if (!$employee) {
        $errors[] = ['rowIndex' => $index, 'employeeCode' => $employeeCode !== '' ? $employeeCode : null, 'error' => 'پرسنل یافت نشد.'];
        continue;
    }

    $inputs = is_array($row['inputs'] ?? null) ? $row['inputs'] : [];
    if ($inputs === []) {
        $warnings[] = ['rowIndex' => $index, 'employeeId' => (string)$employee['id'], 'warning' => 'هیچ ورودی‌ای ارسال نشد؛ مقادیر پیش‌فرض و حقوق پایه پرسنل استفاده شد.'];
    }

    $findPayslip->execute(['employee_id' => (int)$employee['id'], 'period_id' => (int)$period['id']]);
    $existing = $findPayslip->fetch();
    if ($existing && (string)$existing['status'] !== 'draft') {
        $errors[] = ['rowIndex' => $index, 'employeeId' => (string)$employee['id'], 'error' => 'فیش حقوقی موجود در وضعیت پیش‌نویس نیست.'];
        continue;
    }

    try {
        if ($dryRun) {
            $computed = acc_payroll_compute_items($pdo, $employee, $inputs);
            if ($existing) {
                $updated++;
            } else {
                $created++;
            }
            $results[] = [
                'rowIndex' => $index,
                'status' => $existing ? 'preview_update' : 'preview_create',
                'employeeId' => (string)$employee['id'],
                'payslipId' => $existing ? (string)$existing['id'] : null,
                'netTotal' => (int)($computed['netTotal'] ?? 0),
            ];
            continue;
        }

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

if (!$dryRun) {
    app_audit_log($pdo, 'accounting.payroll.imported', 'acc_payroll_periods', (string)$period['id'], [
        'created' => $created,
        'updated' => $updated,
        'warnings' => count($warnings),
        'errors' => count($errors),
    ], $actor);
}

app_json([
    'success' => true,
    'dryRun' => $dryRun,
    'period' => acc_payroll_period_from_row($period),
    'created' => $created,
    'updated' => $updated,
    'results' => $results,
    'warnings' => $warnings,
    'errors' => $errors,
]);

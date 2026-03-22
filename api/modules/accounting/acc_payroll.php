<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/accounting_helpers.php';
require_once __DIR__ . '/payroll_helpers.php';
require_once __DIR__ . '/payroll_payslip_list.php';
require_once __DIR__ . '/payroll_workspace.php';
require_once __DIR__ . '/payroll_patch.php';
app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
app_require_module_enabled($pdo, 'accounting');
acc_payroll_ensure($pdo);
$actor = app_require_auth(['admin', 'manager']);
$entity = acc_normalize_text($_GET['entity'] ?? '');

// ─── GET ──────────────────────────────────────────────────────────────────────
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
        $rows   = acc_payroll_list_periods($pdo, $status);
        app_json([
            'success' => true,
            'periods' => array_map('acc_payroll_period_from_row', $rows),
        ]);
    }
    if ($entity === 'employee') {
        $employeeId = acc_parse_id($_GET['id'] ?? null);
        if ($employeeId !== null) {
            $employee = app_hr_fetch_employee($pdo, $employeeId);
            if (!$employee) {
                app_json(['success' => false, 'error' => 'Employee not found.'], 404);
            }
            app_json(['success' => true, 'employee' => app_hr_employee_from_row($employee)]);
        }
        $q        = acc_normalize_text($_GET['q'] ?? '');
        $isActive = array_key_exists('isActive', $_GET) ? acc_parse_bool($_GET['isActive'], true) : null;
        app_json(['success' => true, 'employees' => app_hr_list_employees($pdo, $q, $isActive)]);
    }
    if ($entity === 'workspace') {
        $periodId  = acc_parse_id($_GET['periodId'] ?? ($_GET['id'] ?? null));
        $workspace = acc_payroll_fetch_workspace($pdo, $periodId);
        if (!$workspace) {
            app_json([
                'success'  => false,
                'error'    => 'Payroll workspace not found.',
                'errorObj' => [
                    'code'    => 'workspace_not_found',
                    'message' => 'Payroll workspace not found.',
                    'status'  => 404,
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
    $employeeId = acc_parse_id($_GET['employeeId'] ?? null);
    $periodId   = acc_parse_id($_GET['periodId'] ?? null);
    $status     = acc_normalize_text($_GET['status'] ?? '');
    $periodKey  = acc_normalize_text($_GET['periodKey'] ?? '');
    $q          = acc_normalize_text($_GET['q'] ?? '');
    $page       = max(1, (int)($_GET['page'] ?? 1));
    $pageSize   = min(100, max(10, (int)($_GET['pageSize'] ?? 20)));
    $list       = acc_payroll_list_payslips($pdo, $employeeId, $periodId, $status, $periodKey, $q, $page, $pageSize);
    $total      = (int)($list['total'] ?? 0);
    $payslips   = is_array($list['payslips'] ?? null) ? $list['payslips'] : [];
    app_json([
        'success'    => true,
        'payslips'   => $payslips,
        'total'      => $total,
        'page'       => $page,
        'pageSize'   => $pageSize,
        'totalPages' => max(1, (int)ceil($total / $pageSize)),
    ]);
}

$payload = app_read_json_body();
if ($method !== 'GET') {
    app_require_csrf();
}

// ─── POST ─────────────────────────────────────────────────────────────────────
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
    if ($entity === 'employee') {
        try {
            $employee = app_hr_save_employee($pdo, $payload, $actor);
        } catch (Throwable $e) {
            app_json(['success' => false, 'error' => $e->getMessage()], 422);
        }
        app_json(['success' => true, 'employee' => $employee], 201);
    }
    try {
        $payslip = acc_payroll_transact($pdo, fn() => acc_payroll_store_payslip($pdo, $payload, $actor));
    } catch (Throwable $e) {
        app_json(['success' => false, 'error' => $e->getMessage()], 422);
    }
    app_json(['success' => true, 'payslip' => $payslip], 201);
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
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
        $period = acc_payroll_update_period($pdo, $periodId, $payload, $existing, $actor);
        app_json(['success' => true, 'period' => acc_payroll_period_from_row($period)]);
    }
    acc_require_permission($actor, 'accounting.payroll.write', $pdo);
    if ($entity === 'employee') {
        $employeeId = acc_parse_id($payload['id'] ?? null);
        if ($employeeId === null) {
            app_json(['success' => false, 'error' => 'Valid employee id is required.'], 400);
        }
        try {
            $employee = app_hr_save_employee($pdo, $payload, $actor, $employeeId);
        } catch (Throwable $e) {
            app_json(['success' => false, 'error' => $e->getMessage()], 422);
        }
        app_json(['success' => true, 'employee' => $employee]);
    }
    $payslipId = acc_parse_id($payload['id'] ?? null);
    if ($payslipId === null) {
        app_json(['success' => false, 'error' => 'Valid payslip id is required.'], 400);
    }
    try {
        $payslip = acc_payroll_transact($pdo, fn() => acc_payroll_store_payslip($pdo, $payload, $actor, $payslipId));
    } catch (Throwable $e) {
        app_json(['success' => false, 'error' => $e->getMessage()], 422);
    }
    app_json(['success' => true, 'payslip' => $payslip]);
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    acc_require_permission($actor, 'accounting.payroll.write', $pdo);
    $entity   = acc_normalize_text($payload['entity'] ?? $entity);
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

    try {
        $payslipCount = acc_payroll_delete_period($pdo, $periodId);
    } catch (Throwable $e) {
        app_json(['success' => false, 'error' => $e->getMessage()], 422);
    }

    app_audit_log($pdo, 'accounting_payroll.period.deleted', 'acc_payroll_periods', (string)$periodId, [
        'periodKey'       => (string)($period['period_key'] ?? ''),
        'deletedPayslips' => $payslipCount,
    ], $actor);

    app_json([
        'success' => true,
        'deleted' => [
            'id'              => (string)$periodId,
            'periodKey'       => (string)($period['period_key'] ?? ''),
            'payslipsDeleted' => $payslipCount,
        ],
    ]);
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
acc_payroll_handle_patch($pdo, $actor, $payload);

<?php
declare(strict_types=1);

require_once __DIR__ . '/payroll_helpers.php';
function acc_payroll_workspace_human_workflow_state(array $counts): string
{
    $total = (int)($counts['payslipCount'] ?? 0);
    $finalized = (int)($counts['finalizedPayslips'] ?? 0);
    $cancelled = (int)($counts['cancelledPayslips'] ?? 0);
    $canFinalize = (bool)($counts['canFinalize'] ?? false);
    if ($total > 0 && ($finalized + $cancelled) === $total) {
        return 'finalized';
    }
    if ($canFinalize) {
        return 'ready_to_finalize';
    }
    return 'in_progress';
}
function acc_payroll_workspace_workflow_label(string $state): string
{
    if ($state === 'finalized') {
        return 'نهایی شده';
    }
    if ($state === 'ready_to_finalize') {
        return 'آماده نهایی‌سازی';
    }
    return 'در حال تکمیل';
}

function acc_payroll_workspace_payment_status(int $netTotal, int $balanceDue): string
{
    if ($netTotal <= 0 || $balanceDue <= 0) {
        return 'paid';
    }
    if ($balanceDue >= $netTotal) {
        return 'unpaid';
    }
    return 'partial';
}

function acc_payroll_workspace_payment_label(string $status): string
{
    if ($status === 'paid') {
        return 'تسویه شده';
    }
    if ($status === 'partial') {
        return 'پرداخت ناقص';
    }
    return 'تسویه نشده';
}

function acc_payroll_workspace_row_errors(array $row): array
{
    $errors = [];
    $status = (string)($row['status'] ?? 'draft');
    $net = (int)($row['net_total'] ?? 0);
    $payments = (int)($row['payments_total'] ?? 0);
    $due = (int)($row['balance_due'] ?? 0);

    if (!in_array($status, acc_payroll_valid_payslip_statuses(), true)) {
        $errors[] = 'invalid_status';
    }
    if ($net < 0) {
        $errors[] = 'negative_net_total';
    }
    if ($payments < 0) {
        $errors[] = 'negative_payments_total';
    }
    if ($payments > $net && $net >= 0) {
        $errors[] = 'payments_exceed_net_total';
    }
    if ($due < 0) {
        $errors[] = 'negative_balance_due';
    }
    if (($net - $payments) !== $due) {
        $errors[] = 'balance_mismatch';
    }

    return $errors;
}

function acc_payroll_workspace_row_incomplete(array $row): bool
{
    $status = (string)($row['status'] ?? 'draft');
    if (!in_array($status, ['draft', 'approved'], true)) {
        return false;
    }

    $earnings = (int)($row['earnings_total'] ?? 0);
    $net = (int)($row['net_total'] ?? 0);
    return $earnings <= 0 || $net <= 0;
}

function acc_payroll_workspace_readiness(array $rows): array
{
    $employeeMap = [];
    $counts = [
        'personnelCount' => 0,
        'payslipCount' => 0,
        'rowsWithErrors' => 0,
        'incompletePayslips' => 0,
        'readyToFinalize' => 0,
        'finalizedPayslips' => 0,
        'cancelledPayslips' => 0,
        'canFinalize' => false,
    ];

    foreach ($rows as $row) {
        $status = (string)($row['status'] ?? 'draft');
        $employeeId = (int)($row['employee_id'] ?? 0);
        $errors = acc_payroll_workspace_row_errors($row);
        $incomplete = acc_payroll_workspace_row_incomplete($row);

        $counts['payslipCount']++;
        if ($employeeId > 0) {
            $employeeMap[(string)$employeeId] = true;
        }
        if (count($errors) > 0) {
            $counts['rowsWithErrors']++;
        }
        if ($incomplete) {
            $counts['incompletePayslips']++;
        }
        if ($status === 'issued') {
            $counts['finalizedPayslips']++;
        }
        if ($status === 'cancelled') {
            $counts['cancelledPayslips']++;
        }
        if (in_array($status, ['draft', 'approved'], true) && count($errors) === 0 && !$incomplete) {
            $counts['readyToFinalize']++;
        }
    }

    $counts['personnelCount'] = count($employeeMap);
    $counts['canFinalize'] = $counts['payslipCount'] > 0
        && $counts['rowsWithErrors'] === 0
        && $counts['incompletePayslips'] === 0
        && $counts['readyToFinalize'] > 0
        && $counts['finalizedPayslips'] < $counts['payslipCount'];

    $blockers = [];
    if ($counts['payslipCount'] <= 0) {
        $blockers[] = [
            'code' => 'no_payslips',
            'step' => 'entry_review',
            'message' => 'برای این دوره هنوز فیشی ثبت نشده است.',
            'count' => 0,
        ];
    }
    if ($counts['rowsWithErrors'] > 0) {
        $blockers[] = [
            'code' => 'rows_with_errors',
            'step' => 'entry_review',
            'message' => 'برخی فیش‌ها خطای محاسباتی یا ناسازگاری داده دارند.',
            'count' => $counts['rowsWithErrors'],
        ];
    }
    if ($counts['incompletePayslips'] > 0) {
        $blockers[] = [
            'code' => 'incomplete_payslips',
            'step' => 'entry_review',
            'message' => 'برخی فیش‌ها ناقص هستند و باید کامل شوند.',
            'count' => $counts['incompletePayslips'],
        ];
    }

    $checklist = [
        [
            'id' => 'has_payslips',
            'label' => 'ثبت فیش برای دوره',
            'ok' => $counts['payslipCount'] > 0,
            'value' => $counts['payslipCount'],
        ],
        [
            'id' => 'no_errors',
            'label' => 'عدم وجود خطای داده',
            'ok' => $counts['rowsWithErrors'] === 0,
            'value' => $counts['rowsWithErrors'],
        ],
        [
            'id' => 'no_incomplete',
            'label' => 'تکمیل همه فیش‌ها',
            'ok' => $counts['incompletePayslips'] === 0,
            'value' => $counts['incompletePayslips'],
        ],
        [
            'id' => 'ready_to_finalize',
            'label' => 'فیش‌های آماده نهایی‌سازی',
            'ok' => $counts['readyToFinalize'] > 0 || ($counts['finalizedPayslips'] + $counts['cancelledPayslips']) === $counts['payslipCount'],
            'value' => $counts['readyToFinalize'],
        ],
    ];

    return [
        'counts' => $counts,
        'checklist' => $checklist,
        'blockers' => $blockers,
        'canFinalize' => (bool)$counts['canFinalize'],
    ];
}

function acc_payroll_fetch_workspace(PDO $pdo, ?int $periodId = null): ?array
{
    $period = $periodId !== null ? acc_payroll_fetch_period($pdo, $periodId) : acc_payroll_fetch_latest_period($pdo);
    if (!$period) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id, status, employee_id, earnings_total, net_total, payments_total, balance_due
         FROM acc_payslips
         WHERE period_id = :period_id
         ORDER BY id ASC'
    );
    $stmt->execute(['period_id' => (int)$period['id']]);
    $rows = $stmt->fetchAll() ?: [];

    $summary = [
        'employees' => 0,
        'draft' => 0,
        'approved' => 0,
        'issued' => 0,
        'cancelled' => 0,
        'net' => 0,
        'paid' => 0,
        'due' => 0,
    ];
    $actionable = [
        'approve' => [],
        'issue' => [],
        'payments' => [],
    ];

    foreach ($rows as $row) {
        $status = (string)($row['status'] ?? 'draft');
        $id = (string)($row['id'] ?? '');
        $due = (int)($row['balance_due'] ?? 0);

        $summary['employees']++;
        $summary['net'] += (int)($row['net_total'] ?? 0);
        $summary['paid'] += (int)($row['payments_total'] ?? 0);
        $summary['due'] += $due;

        if (array_key_exists($status, $summary)) {
            $summary[$status]++;
        }
        if ($status === 'draft' && $id !== '') {
            $actionable['approve'][] = $id;
        }
        if ($status === 'approved' && $id !== '') {
            $actionable['issue'][] = $id;
        }
        if ($status === 'issued' && $id !== '' && $due > 0) {
            $actionable['payments'][] = $id;
        }
    }

    $readiness = acc_payroll_workspace_readiness($rows);
    $workflowState = acc_payroll_workspace_human_workflow_state($readiness['counts']);
    $paymentStatus = acc_payroll_workspace_payment_status((int)$summary['net'], (int)$summary['due']);

    return [
        'period' => acc_payroll_period_from_row($period),
        'workflowState' => $workflowState,
        'summary' => array_merge($summary, [
            'workflowState' => $workflowState,
            'workflowStatusLabel' => acc_payroll_workspace_workflow_label($workflowState),
            'settlementStatus' => $paymentStatus,
            'settlementStatusLabel' => acc_payroll_workspace_payment_label($paymentStatus),
        ]),
        'checklist' => $readiness['checklist'],
        'importStatus' => [
            'mode' => 'excel_primary',
            'totalRows' => (int)$readiness['counts']['payslipCount'],
            'validRows' => max(0, (int)$readiness['counts']['payslipCount'] - (int)$readiness['counts']['rowsWithErrors']),
            'errorRows' => (int)$readiness['counts']['rowsWithErrors'],
            'manualEntrySupported' => true,
        ],
        'finalizationReadiness' => [
            'canFinalize' => (bool)$readiness['canFinalize'],
            'counts' => $readiness['counts'],
            'blockers' => $readiness['blockers'],
        ],
        'actionable' => $actionable,
        'stepStatus' => [
            'period' => 'ready',
            'entry_review' => $summary['employees'] > 0 ? 'ready' : 'blocked',
            'finalize' => $workflowState === 'finalized'
                ? 'completed'
                : ((bool)$readiness['canFinalize'] ? 'ready' : 'blocked'),
            'prepare' => $summary['employees'] > 0 ? 'ready' : 'blocked',
            'approve_issue' => ($summary['draft'] + $summary['approved']) > 0 ? 'ready' : ($summary['issued'] > 0 ? 'completed' : 'blocked'),
            'payments' => $summary['issued'] > 0 ? ($summary['due'] > 0 ? 'ready' : 'completed') : 'blocked',
        ],
        'blockers' => $readiness['blockers'],
    ];
}
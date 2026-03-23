<?php
declare(strict_types=1);

require_once __DIR__ . '/payroll_helpers.php';

function acc_payroll_fetch_workspace(PDO $pdo, ?int $periodId = null): ?array
{
    $period = $periodId !== null ? acc_payroll_fetch_period($pdo, $periodId) : acc_payroll_fetch_latest_period($pdo);
    if (!$period) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id, status, net_total, payments_total, balance_due
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

    $blockers = [];
    if ($summary['employees'] === 0) {
        $blockers[] = [
            'step' => 'prepare',
            'code' => 'no_payslips',
            'message' => 'برای این دوره هنوز فیـشی ثبت نشده است.',
        ];
    }
    if (($summary['draft'] + $summary['approved']) === 0 && $summary['issued'] === 0) {
        $blockers[] = [
            'step' => 'approve_issue',
            'code' => 'no_actionable_payslips',
            'message' => 'هیچ فیـشی برای تایید یا صدور وجود ندارد.',
        ];
    }
    if ($summary['issued'] === 0) {
        $blockers[] = [
            'step' => 'payments',
            'code' => 'no_issued_payslips',
            'message' => 'ابتدا حداقل یک فیش را صادر کنید.',
        ];
    }

    return [
        'period' => acc_payroll_period_from_row($period),
        'summary' => $summary,
        'actionable' => $actionable,
        'stepStatus' => [
            'period' => 'ready',
            'prepare' => $summary['employees'] > 0 ? 'ready' : 'blocked',
            'approve_issue' => ($summary['draft'] + $summary['approved']) > 0 ? 'ready' : ($summary['issued'] > 0 ? 'completed' : 'blocked'),
            'payments' => $summary['issued'] > 0 ? ($summary['due'] > 0 ? 'ready' : 'completed') : 'blocked',
        ],
        'blockers' => $blockers,
    ];
}

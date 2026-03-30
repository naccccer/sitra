<?php
declare(strict_types=1);

require_once __DIR__ . '/payroll_helpers.php';
require_once __DIR__ . '/payroll_workspace.php';

function acc_payroll_finalize_list_payslip_ids(PDO $pdo, int $periodId, string $status): array
{
    $stmt = $pdo->prepare(
        'SELECT id
         FROM acc_payslips
         WHERE period_id = :period_id AND status = :status
         ORDER BY id ASC'
    );
    $stmt->execute([
        'period_id' => $periodId,
        'status' => $status,
    ]);

    $ids = [];
    foreach ($stmt->fetchAll() ?: [] as $row) {
        $id = acc_parse_id($row['id'] ?? null);
        if ($id !== null) {
            $ids[] = $id;
        }
    }
    return $ids;
}

function acc_payroll_require_finalize_permission(array $actor, PDO $pdo): void
{
    if (app_user_has_permission($actor, 'accounting.payroll.write', $pdo)) {
        return;
    }

    $canApprove = app_user_has_permission($actor, 'accounting.payroll.approve', $pdo);
    $canIssue = app_user_has_permission($actor, 'accounting.payroll.issue', $pdo);
    if ($canApprove && $canIssue) {
        return;
    }

    acc_payroll_patch_fail('Access denied.', 403, 'access_denied');
}

function acc_payroll_finalize_period(PDO $pdo, array $actor, array $payload): array
{
    $periodId = acc_parse_id($payload['periodId'] ?? ($payload['id'] ?? null));
    if ($periodId === null) {
        acc_payroll_patch_fail('Valid periodId is required.', 400, 'missing_period_id');
    }

    $period = acc_payroll_fetch_period($pdo, $periodId);
    if (!$period) {
        acc_payroll_patch_fail('Payroll period not found.', 404, 'period_not_found');
    }

    $workspace = acc_payroll_fetch_workspace($pdo, $periodId);
    if (!$workspace) {
        acc_payroll_patch_fail('Payroll workspace not found.', 404, 'workspace_not_found');
    }

    $readiness = is_array($workspace['finalizationReadiness'] ?? null)
        ? $workspace['finalizationReadiness']
        : [];
    if (!(bool)($readiness['canFinalize'] ?? false)) {
        acc_payroll_patch_fail('Period is not ready for finalization.', 422, 'finalization_not_ready');
    }

    $approvedCount = 0;
    $issuedCount = 0;

    try {
        $pdo->beginTransaction();

        $draftIds = acc_payroll_finalize_list_payslip_ids($pdo, $periodId, 'draft');
        if (count($draftIds) > 0) {
            $pdo->prepare(
                'UPDATE acc_payslips
                 SET status = :status,
                     approved_by_user_id = :user_id,
                     approved_at = CURRENT_TIMESTAMP,
                     updated_by_user_id = :user_id2
                 WHERE period_id = :period_id AND status = :current_status'
            )->execute([
                'status' => 'approved',
                'user_id' => (int)$actor['id'],
                'user_id2' => (int)$actor['id'],
                'period_id' => $periodId,
                'current_status' => 'draft',
            ]);
            $approvedCount = count($draftIds);

            foreach ($draftIds as $draftId) {
                app_audit_log($pdo, 'accounting.payroll.payslip.approved', 'acc_payslips', (string)$draftId, [
                    'source' => 'finalize_period',
                    'periodId' => $periodId,
                ], $actor);
            }
        }

        $approvedIds = acc_payroll_finalize_list_payslip_ids($pdo, $periodId, 'approved');
        if (count($approvedIds) <= 0) {
            acc_payroll_patch_fail('No approved payslips found for finalization.', 422, 'no_approved_payslips');
        }

        foreach ($approvedIds as $payslipId) {
            $payslip = acc_payroll_fetch_payslip_detail($pdo, $payslipId);
            if (!$payslip) {
                acc_payroll_patch_fail('Payslip not found during finalization.', 404, 'payslip_not_found');
            }
            if ((string)($payslip['status'] ?? '') !== 'approved') {
                acc_payroll_patch_fail('Only approved payslips can be finalized.', 422, 'invalid_status_for_finalize');
            }

            $voucherId = acc_payroll_create_accrual_voucher($pdo, $payslip, $actor);

            $pdo->prepare(
                'UPDATE acc_payslips
                 SET status = :status,
                     accrual_voucher_id = :voucher_id,
                     issued_by_user_id = :user_id,
                     issued_at = CURRENT_TIMESTAMP,
                     updated_by_user_id = :user_id2
                 WHERE id = :id'
            )->execute([
                'status' => 'issued',
                'voucher_id' => $voucherId,
                'user_id' => (int)$actor['id'],
                'user_id2' => (int)$actor['id'],
                'id' => $payslipId,
            ]);

            $issuedCount++;
            app_audit_log($pdo, 'accounting.payroll.payslip.issued', 'acc_payslips', (string)$payslipId, [
                'voucherId' => $voucherId,
                'source' => 'finalize_period',
                'periodId' => $periodId,
            ], $actor);
        }

        $pdo->prepare(
            'UPDATE acc_payroll_periods
             SET status = :status, updated_by_user_id = :user_id
             WHERE id = :id'
        )->execute([
            'status' => 'issued',
            'user_id' => (int)$actor['id'],
            'id' => $periodId,
        ]);

        $pdo->commit();
    } catch (AccPayrollPatchError $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        acc_payroll_patch_fail($e->getMessage(), 422, 'finalize_period_failed');
    }

    app_audit_log($pdo, 'accounting.payroll.period.finalized', 'acc_payroll_periods', (string)$periodId, [
        'approvedCount' => $approvedCount,
        'issuedCount' => $issuedCount,
    ], $actor);

    $refreshedWorkspace = acc_payroll_fetch_workspace($pdo, $periodId);

    return [
        'periodId' => (string)$periodId,
        'periodStatus' => (string)(($refreshedWorkspace['period']['status'] ?? 'issued')),
        'approvedCount' => $approvedCount,
        'issuedCount' => $issuedCount,
        'errorCount' => 0,
        'workflowState' => (string)($refreshedWorkspace['workflowState'] ?? 'in_progress'),
    ];
}

function acc_payroll_reopen_period(PDO $pdo, array $actor, array $payload): array
{
    $periodId = acc_parse_id($payload['periodId'] ?? ($payload['id'] ?? null));
    if ($periodId === null) {
        acc_payroll_patch_fail('Valid periodId is required.', 400, 'missing_period_id');
    }

    $period = acc_payroll_fetch_period($pdo, $periodId);
    if (!$period) {
        acc_payroll_patch_fail('Payroll period not found.', 404, 'period_not_found');
    }
    if ((string)($period['status'] ?? 'open') !== 'issued') {
        acc_payroll_patch_fail('Only finalized payroll periods can be reopened.', 422, 'period_not_finalized');
    }

    $statsStmt = $pdo->prepare(
        'SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = \'issued\' THEN 1 ELSE 0 END) AS issued_total,
            SUM(CASE WHEN payments_total > 0 THEN 1 ELSE 0 END) AS paid_total
         FROM acc_payslips
         WHERE period_id = :period_id'
    );
    $statsStmt->execute(['period_id' => $periodId]);
    $stats = $statsStmt->fetch() ?: [];
    $issuedTotal = (int)($stats['issued_total'] ?? 0);
    $paidTotal = (int)($stats['paid_total'] ?? 0);

    if ($issuedTotal <= 0) {
        acc_payroll_patch_fail('This period has no finalized payslips to reopen.', 422, 'no_issued_payslips');
    }
    if ($paidTotal > 0) {
        acc_payroll_patch_fail('Paid payroll periods cannot be reopened.', 422, 'paid_period_cannot_be_reopened');
    }

    try {
        $pdo->beginTransaction();

        $voucherStmt = $pdo->prepare(
            'SELECT DISTINCT accrual_voucher_id
             FROM acc_payslips
             WHERE period_id = :period_id
               AND status = :status
               AND accrual_voucher_id IS NOT NULL'
        );
        $voucherStmt->execute([
            'period_id' => $periodId,
            'status' => 'issued',
        ]);
        $voucherIds = [];
        foreach ($voucherStmt->fetchAll() ?: [] as $row) {
            $voucherId = acc_parse_id($row['accrual_voucher_id'] ?? null);
            if ($voucherId !== null) {
                $voucherIds[] = $voucherId;
            }
        }

        if (count($voucherIds) > 0) {
            $placeholders = implode(',', array_fill(0, count($voucherIds), '?'));
            $pdo->prepare("UPDATE acc_vouchers SET status = 'cancelled' WHERE id IN ($placeholders)")
                ->execute($voucherIds);
        }

        $pdo->prepare(
            'UPDATE acc_payslips
             SET status = :status,
                 accrual_voucher_id = NULL,
                 approved_by_user_id = NULL,
                 approved_at = NULL,
                 issued_by_user_id = NULL,
                 issued_at = NULL,
                 updated_by_user_id = :user_id
             WHERE period_id = :period_id AND status = :current_status'
        )->execute([
            'status' => 'draft',
            'user_id' => (int)$actor['id'],
            'period_id' => $periodId,
            'current_status' => 'issued',
        ]);

        $pdo->prepare(
            'UPDATE acc_payroll_periods
             SET status = :status, updated_by_user_id = :user_id
             WHERE id = :id'
        )->execute([
            'status' => 'open',
            'user_id' => (int)$actor['id'],
            'id' => $periodId,
        ]);

        $pdo->commit();
    } catch (AccPayrollPatchError $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        acc_payroll_patch_fail($e->getMessage(), 422, 'reopen_period_failed');
    }

    app_audit_log($pdo, 'accounting.payroll.period.reopened', 'acc_payroll_periods', (string)$periodId, [
        'reopenedPayslips' => $issuedTotal,
    ], $actor);

    $refreshedWorkspace = acc_payroll_fetch_workspace($pdo, $periodId);

    return [
        'periodId' => (string)$periodId,
        'periodStatus' => (string)(($refreshedWorkspace['period']['status'] ?? 'open')),
        'reopenedCount' => $issuedTotal,
        'workflowState' => (string)($refreshedWorkspace['workflowState'] ?? 'in_progress'),
    ];
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/payroll_finalize.php';

final class AccPayrollPatchError extends RuntimeException
{
    public int $status;
    public string $codeName;

    public function __construct(string $message, int $status = 400, string $codeName = 'payroll_patch_error')
    {
        parent::__construct($message);
        $this->status = $status;
        $this->codeName = $codeName;
    }
}

function acc_payroll_patch_fail(string $message, int $status = 400, string $codeName = 'payroll_patch_error'): void
{
    throw new AccPayrollPatchError($message, $status, $codeName);
}

function acc_payroll_require_patch_permission(array $actor, string $action, PDO $pdo, bool $isBulk): void
{
    if ($isBulk && $action === 'record_payment') {
        acc_payroll_patch_fail('Bulk payment recording is not supported.', 400, 'bulk_record_payment_not_supported');
    }
    if ($isBulk && $action === 'finalize_period') {
        acc_payroll_patch_fail('Bulk finalize is not supported.', 400, 'bulk_finalize_not_supported');
    }

    if ($action === 'approve') {
        acc_require_permission($actor, 'accounting.payroll.approve', $pdo);
        return;
    }
    if ($action === 'issue') {
        acc_require_permission($actor, 'accounting.payroll.issue', $pdo);
        return;
    }
    if ($action === 'cancel') {
        acc_require_permission($actor, 'accounting.payroll.write', $pdo);
        return;
    }
    if ($action === 'record_payment') {
        if (
            !app_user_has_permission($actor, 'accounting.payroll.payments', $pdo)
            && !app_user_has_permission($actor, 'accounting.payroll.record_payment', $pdo)
        ) {
            acc_payroll_patch_fail('Access denied.', 403, 'access_denied');
        }
        return;
    }
    if ($action === 'finalize_period') {
        acc_payroll_require_finalize_permission($actor, $pdo);
        return;
    }

    acc_payroll_patch_fail('Unknown action. Use approve, issue, cancel, record_payment, or finalize_period.', 400, 'unknown_action');
}

function acc_payroll_apply_patch_action(PDO $pdo, array $actor, int $payslipId, string $action, array $payload): array
{
    $payslip = acc_payroll_fetch_payslip_detail($pdo, $payslipId);
    if (!$payslip) {
        acc_payroll_patch_fail('Payslip not found.', 404, 'payslip_not_found');
    }

    try {
        if ($action === 'approve') {
            if ($payslip['status'] !== 'draft') {
                acc_payroll_patch_fail('Only draft payslips can be approved.', 400, 'invalid_status_for_approve');
            }
            $pdo->prepare(
                'UPDATE acc_payslips
                 SET status = :status, approved_by_user_id = :user_id, approved_at = CURRENT_TIMESTAMP, updated_by_user_id = :user_id2
                 WHERE id = :id'
            )->execute([
                'status' => 'approved',
                'user_id' => (int)$actor['id'],
                'user_id2' => (int)$actor['id'],
                'id' => $payslipId,
            ]);
            app_audit_log($pdo, 'accounting.payroll.payslip.approved', 'acc_payslips', (string)$payslipId, [], $actor);
        } elseif ($action === 'issue') {
            if ($payslip['status'] !== 'approved') {
                acc_payroll_patch_fail('Only approved payslips can be issued.', 400, 'invalid_status_for_issue');
            }
            $pdo->beginTransaction();
            $voucherId = acc_payroll_create_accrual_voucher($pdo, $payslip, $actor);
            $pdo->prepare(
                'UPDATE acc_payslips
                 SET status = :status, accrual_voucher_id = :voucher_id, issued_by_user_id = :user_id, issued_at = CURRENT_TIMESTAMP, updated_by_user_id = :user_id2
                 WHERE id = :id'
            )->execute([
                'status' => 'issued',
                'voucher_id' => $voucherId,
                'user_id' => (int)$actor['id'],
                'user_id2' => (int)$actor['id'],
                'id' => $payslipId,
            ]);
            $pdo->prepare(
                'UPDATE acc_payroll_periods
                 SET status = :status, updated_by_user_id = :user_id
                 WHERE id = :id AND status = :current_status'
            )->execute([
                'status' => 'issued',
                'user_id' => (int)$actor['id'],
                'id' => (int)$payslip['period']['id'],
                'current_status' => 'open',
            ]);
            $pdo->commit();
            app_audit_log($pdo, 'accounting.payroll.payslip.issued', 'acc_payslips', (string)$payslipId, ['voucherId' => $voucherId], $actor);
        } elseif ($action === 'cancel') {
            if ($payslip['status'] === 'cancelled') {
                acc_payroll_patch_fail('Payslip is already cancelled.', 400, 'already_cancelled');
            }
            if ((int)($payslip['totals']['paymentsTotal'] ?? 0) > 0) {
                acc_payroll_patch_fail('Paid payslips cannot be cancelled.', 400, 'paid_payslip_cannot_be_cancelled');
            }
            $pdo->beginTransaction();
            if (!empty($payslip['accrualVoucherId'])) {
                $pdo->prepare('UPDATE acc_vouchers SET status = :status WHERE id = :id')->execute([
                    'status' => 'cancelled',
                    'id' => (int)$payslip['accrualVoucherId'],
                ]);
            }
            $pdo->prepare(
                'UPDATE acc_payslips
                 SET status = :status, cancelled_by_user_id = :user_id, cancelled_at = CURRENT_TIMESTAMP, updated_by_user_id = :user_id2
                 WHERE id = :id'
            )->execute([
                'status' => 'cancelled',
                'user_id' => (int)$actor['id'],
                'user_id2' => (int)$actor['id'],
                'id' => $payslipId,
            ]);
            $pdo->commit();
            app_audit_log($pdo, 'accounting.payroll.payslip.cancelled', 'acc_payslips', (string)$payslipId, [], $actor);
        } elseif ($action === 'record_payment') {
            if ($payslip['status'] !== 'issued') {
                acc_payroll_patch_fail('Only issued payslips can be paid.', 400, 'invalid_status_for_payment');
            }
            $amount = max(0, (int)($payload['amount'] ?? 0));
            if ($amount <= 0 || $amount > (int)($payslip['totals']['balanceDue'] ?? 0)) {
                acc_payroll_patch_fail('Payment amount must be positive and within balance due.', 400, 'invalid_payment_amount');
            }
            $paymentDate = acc_parse_date(acc_normalize_text($payload['paymentDate'] ?? '')) ?? date('Y-m-d');
            $paymentMethod = acc_normalize_text($payload['paymentMethod'] ?? 'bank');
            if (!in_array($paymentMethod, ['cash', 'bank'], true)) {
                acc_payroll_patch_fail('paymentMethod must be cash or bank.', 400, 'invalid_payment_method');
            }
            $pdo->beginTransaction();
            $pdo->prepare(
                'INSERT INTO acc_payslip_payments
                 (payslip_id, payment_date, payment_method, account_id, amount, reference_no, notes, created_by_user_id)
                 VALUES (:payslip_id, :payment_date, :payment_method, :account_id, :amount, :reference_no, :notes, :user_id)'
            )->execute([
                'payslip_id' => $payslipId,
                'payment_date' => $paymentDate,
                'payment_method' => $paymentMethod,
                'account_id' => acc_parse_id($payload['accountId'] ?? null),
                'amount' => $amount,
                'reference_no' => ($v = acc_normalize_text($payload['referenceNo'] ?? '')) !== '' ? $v : null,
                'notes' => ($v = acc_normalize_text($payload['notes'] ?? '')) !== '' ? $v : null,
                'user_id' => (int)$actor['id'],
            ]);
            $paymentId = (int)$pdo->lastInsertId();
            $voucherId = acc_payroll_create_payment_voucher($pdo, $payslip, [
                'id' => $paymentId,
                'paymentDate' => $paymentDate,
                'paymentMethod' => $paymentMethod,
                'accountId' => acc_parse_id($payload['accountId'] ?? null),
                'amount' => $amount,
            ], $actor);
            $pdo->prepare('UPDATE acc_payslip_payments SET voucher_id = :voucher_id WHERE id = :id')->execute([
                'voucher_id' => $voucherId,
                'id' => $paymentId,
            ]);
            $newPaymentsTotal = (int)($payslip['totals']['paymentsTotal'] ?? 0) + $amount;
            $newBalanceDue = (int)($payslip['totals']['netTotal'] ?? 0) - $newPaymentsTotal;
            $pdo->prepare(
                'UPDATE acc_payslips
                 SET payments_total = :payments_total, balance_due = :balance_due, last_payment_date = :last_payment_date, updated_by_user_id = :user_id
                 WHERE id = :id'
            )->execute([
                'payments_total' => $newPaymentsTotal,
                'balance_due' => $newBalanceDue,
                'last_payment_date' => $paymentDate,
                'user_id' => (int)$actor['id'],
                'id' => $payslipId,
            ]);
            $pdo->commit();
            app_audit_log($pdo, 'accounting.payroll.payment.recorded', 'acc_payslip_payments', (string)$paymentId, [
                'payslipId' => $payslipId,
                'voucherId' => $voucherId,
                'amount' => $amount,
            ], $actor);
        }
    } catch (AccPayrollPatchError $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        acc_payroll_patch_fail($e->getMessage(), 422, 'patch_runtime_error');
    }

    return acc_payroll_fetch_payslip_detail($pdo, $payslipId) ?: [];
}

function acc_payroll_handle_patch(PDO $pdo, array $actor, array $payload): void
{
    $action = acc_normalize_text($payload['action'] ?? '');
    $ids = [];
    if (is_array($payload['ids'] ?? null)) {
        foreach ($payload['ids'] as $rawId) {
            $parsed = acc_parse_id($rawId);
            if ($parsed !== null) {
                $ids[(string)$parsed] = $parsed;
            }
        }
    }

    try {
        if ($action === 'finalize_period') {
            acc_payroll_require_patch_permission($actor, $action, $pdo, false);
            $result = acc_payroll_finalize_period($pdo, $actor, $payload);
            $periodId = acc_parse_id($result['periodId'] ?? ($payload['periodId'] ?? null));
            $workspace = $periodId !== null ? acc_payroll_fetch_workspace($pdo, $periodId) : null;
            app_json([
                'success' => true,
                'action' => $action,
                'result' => $result,
                'workspace' => $workspace,
            ]);
        }

        if (count($ids) > 0) {
            if (count($ids) > 200) {
                acc_payroll_patch_fail('Bulk actions are limited to 200 payslips per request.', 422, 'bulk_limit_exceeded');
            }
            acc_payroll_require_patch_permission($actor, $action, $pdo, true);
            $results = [];
            $succeeded = 0;
            foreach ($ids as $id) {
                try {
                    $updated = acc_payroll_apply_patch_action($pdo, $actor, $id, $action, $payload);
                    $results[] = ['id' => (string)$id, 'success' => true, 'payslip' => $updated];
                    $succeeded++;
                } catch (AccPayrollPatchError $e) {
                    $results[] = ['id' => (string)$id, 'success' => false, 'error' => $e->getMessage(), 'errorObj' => ['code' => $e->codeName, 'message' => $e->getMessage(), 'status' => $e->status]];
                } catch (Throwable $e) {
                    $results[] = ['id' => (string)$id, 'success' => false, 'error' => $e->getMessage(), 'errorObj' => ['code' => 'bulk_item_error', 'message' => $e->getMessage(), 'status' => 422]];
                }
            }
            app_json([
                'success' => $succeeded > 0,
                'action' => $action,
                'total' => count($ids),
                'succeeded' => $succeeded,
                'failed' => count($ids) - $succeeded,
                'results' => $results,
            ], $succeeded > 0 ? 200 : 422);
        }

        acc_payroll_require_patch_permission($actor, $action, $pdo, false);
        $payslipId = acc_parse_id($payload['id'] ?? null);
        if ($payslipId === null) {
            acc_payroll_patch_fail('Valid payslip id is required.', 400, 'missing_payslip_id');
        }
        $updated = acc_payroll_apply_patch_action($pdo, $actor, $payslipId, $action, $payload);
        app_json(['success' => true, 'payslip' => $updated]);
    } catch (AccPayrollPatchError $e) {
        app_json([
            'success' => false,
            'error' => $e->getMessage(),
            'errorObj' => [
                'code' => $e->codeName,
                'message' => $e->getMessage(),
                'status' => $e->status,
            ],
        ], $e->status);
    } catch (Throwable $e) {
        app_json([
            'success' => false,
            'error' => $e->getMessage(),
            'errorObj' => [
                'code' => 'patch_unhandled_exception',
                'message' => $e->getMessage(),
                'status' => 422,
            ],
        ], 422);
    }
}

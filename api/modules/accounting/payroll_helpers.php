<?php
declare(strict_types=1);

require_once __DIR__ . '/accounting_helpers.php';
require_once __DIR__ . '/../../common/accounting_payroll_schema.php';
require_once __DIR__ . '/payroll_formula_engine.php';
require_once __DIR__ . '/payroll_journal.php';

// ─── Schema management ────────────────────────────────────────────────────────

function acc_payroll_ensure(PDO $pdo): void
{
    if (acc_payroll_schema_ready($pdo)) {
        return;
    }

    try {
        app_ensure_accounting_payroll_schema($pdo);
    } catch (Throwable $e) {
        if (!acc_payroll_schema_ready($pdo)) {
            throw $e;
        }
    }
}

function acc_payroll_schema_ready(PDO $pdo): bool
{
    $tables = [
        'acc_payroll_periods',
        'acc_payslips',
        'acc_payslip_items',
        'acc_payslip_payments',
        'acc_payslip_documents',
    ];
    $placeholders = implode(', ', array_fill(0, count($tables), '?'));
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS total
         FROM information_schema.tables
         WHERE table_schema = DATABASE()
           AND table_name IN (' . $placeholders . ')'
    );
    $stmt->execute($tables);
    if ((int)($stmt->fetch()['total'] ?? 0) !== count($tables)) {
        return false;
    }

    // HR store readiness is validated through HR-owned helper access.
    try {
        app_hr_fetch_employee($pdo, 0);
    } catch (Throwable $e) {
        return false;
    }
    return true;
}

// ─── Lifecycle constants ──────────────────────────────────────────────────────

/**
 * Canonical set of valid period statuses.
 * Single source of truth used by GET filter and PUT validation.
 */
function acc_payroll_valid_period_statuses(): array
{
    return ['open', 'issued', 'closed'];
}

/**
 * Canonical set of valid payslip statuses.
 * Reflects the full lifecycle: draft → approved → issued → cancelled.
 * Referenced by patch handler for status-guard logic.
 */
function acc_payroll_valid_payslip_statuses(): array
{
    return ['draft', 'approved', 'issued', 'cancelled'];
}

// ─── Transaction helper ───────────────────────────────────────────────────────

/**
 * Runs $fn inside a database transaction.
 * Commits on success and returns the callable's result.
 * Rolls back and re-throws on any error, leaving HTTP handling to the caller.
 */
function acc_payroll_transact(PDO $pdo, callable $fn)
{
    $pdo->beginTransaction();
    try {
        $result = $fn();
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function acc_payroll_period_from_row(array $row): array
{
    return [
        'id'        => (string)$row['id'],
        'periodKey' => (string)$row['period_key'],
        'title'     => (string)$row['title'],
        'year'      => (int)$row['period_year'],
        'month'     => (int)$row['period_month'],
        'startDate' => (string)$row['start_date'],
        'endDate'   => (string)$row['end_date'],
        'payDate'   => $row['pay_date'] ?: null,
        'status'    => (string)$row['status'],
    ];
}

// ─── Period queries ───────────────────────────────────────────────────────────

function acc_payroll_fetch_period(PDO $pdo, int $periodId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM acc_payroll_periods WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $periodId]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

function acc_payroll_fetch_latest_period(PDO $pdo): ?array
{
    $stmt = $pdo->query('SELECT * FROM acc_payroll_periods ORDER BY period_key DESC, id DESC LIMIT 1');
    $row = $stmt ? $stmt->fetch() : false;
    return is_array($row) ? $row : null;
}

function acc_payroll_find_or_create_period(PDO $pdo, array $payload, array $actor): array
{
    $periodId = acc_parse_id($payload['periodId'] ?? null);
    if ($periodId !== null) {
        $row = acc_payroll_fetch_period($pdo, $periodId);
        if (!$row) {
            app_json(['success' => false, 'error' => 'Payroll period not found.'], 404);
        }
        return $row;
    }

    $periodKey = acc_normalize_text($payload['periodKey'] ?? '');
    if ($periodKey === '' && isset($payload['year'], $payload['month'])) {
        $periodKey = sprintf('%04d-%02d', (int)$payload['year'], (int)$payload['month']);
    }
    if (!preg_match('/^\d{4}-\d{2}$/', $periodKey)) {
        app_json(['success' => false, 'error' => 'periodKey in YYYY-MM format is required.'], 400);
    }

    $stmt = $pdo->prepare('SELECT * FROM acc_payroll_periods WHERE period_key = :period_key LIMIT 1');
    $stmt->execute(['period_key' => $periodKey]);
    $row = $stmt->fetch();
    if ($row) {
        return $row;
    }

    $year      = (int)substr($periodKey, 0, 4);
    $month     = (int)substr($periodKey, 5, 2);
    $startDate = acc_parse_date((string)($payload['startDate'] ?? ($periodKey . '-01'))) ?? ($periodKey . '-01');
    $endDate   = acc_parse_date((string)($payload['endDate'] ?? date('Y-m-t', strtotime($startDate)))) ?? date('Y-m-t', strtotime($startDate));
    $payDate   = acc_parse_date((string)($payload['payDate'] ?? $endDate));
    $title     = acc_normalize_text($payload['title'] ?? ('Payroll ' . $periodKey));

    $insert = $pdo->prepare(
        'INSERT INTO acc_payroll_periods
         (period_key, title, period_year, period_month, start_date, end_date, pay_date, status, created_by_user_id, updated_by_user_id)
         VALUES (:period_key, :title, :period_year, :period_month, :start_date, :end_date, :pay_date, :status, :user_id, :user_id2)'
    );
    $insert->execute([
        'period_key'   => $periodKey,
        'title'        => $title,
        'period_year'  => $year,
        'period_month' => $month,
        'start_date'   => $startDate,
        'end_date'     => $endDate,
        'pay_date'     => $payDate,
        'status'       => 'open',
        'user_id'      => (int)$actor['id'],
        'user_id2'     => (int)$actor['id'],
    ]);
    return acc_payroll_fetch_period($pdo, (int)$pdo->lastInsertId()) ?: [];
}

/**
 * Returns all period rows matching an optional status filter.
 * Result is an array of raw DB rows; caller maps with acc_payroll_period_from_row.
 */
function acc_payroll_list_periods(PDO $pdo, string $status): array
{
    $where  = [];
    $params = [];
    if ($status !== '' && in_array($status, acc_payroll_valid_period_statuses(), true)) {
        $where[]          = 'status = :status';
        $params['status'] = $status;
    }
    $stmt = $pdo->prepare(
        'SELECT * FROM acc_payroll_periods'
        . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
        . ' ORDER BY period_key DESC, id DESC'
    );
    $stmt->execute($params);
    return $stmt->fetchAll() ?: [];
}

/**
 * Normalizes payload fields, runs the UPDATE, and returns the refreshed raw row.
 * The returned row is a raw DB row; caller maps with acc_payroll_period_from_row.
 */
function acc_payroll_update_period(PDO $pdo, int $periodId, array $payload, array $existing, array $actor): array
{
    $title     = ($v = acc_normalize_text($payload['title'] ?? (string)$existing['title'])) !== '' ? $v : (string)$existing['title'];
    $startDate = acc_parse_date(acc_normalize_text($payload['startDate'] ?? '')) ?? (string)$existing['start_date'];
    $endDate   = acc_parse_date(acc_normalize_text($payload['endDate'] ?? '')) ?? (string)$existing['end_date'];
    $payDate   = acc_parse_date(acc_normalize_text($payload['payDate'] ?? '')) ?? ($existing['pay_date'] ?: null);
    $status    = acc_normalize_text($payload['status'] ?? (string)$existing['status']);
    if (!in_array($status, acc_payroll_valid_period_statuses(), true)) {
        $status = (string)$existing['status'];
    }
    $pdo->prepare(
        'UPDATE acc_payroll_periods
         SET title = :title, start_date = :start_date, end_date = :end_date,
             pay_date = :pay_date, status = :status, updated_by_user_id = :user_id
         WHERE id = :id'
    )->execute([
        'title'      => $title,
        'start_date' => $startDate,
        'end_date'   => $endDate,
        'pay_date'   => $payDate,
        'status'     => $status,
        'user_id'    => (int)$actor['id'],
        'id'         => $periodId,
    ]);
    return acc_payroll_fetch_period($pdo, $periodId) ?: $existing;
}

/**
 * Validates the period can be deleted (no approved/issued/paid/journaled payslips),
 * then deletes cascade-style in a transaction.
 *
 * Returns the count of draft payslips deleted.
 * Throws RuntimeException with a human-readable message if deletion is not allowed.
 */
function acc_payroll_delete_period(PDO $pdo, int $periodId): int
{
    $statsStmt = $pdo->prepare(
        'SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status <> \'draft\' THEN 1 ELSE 0 END) AS non_draft_total,
            SUM(CASE WHEN payments_total > 0 THEN 1 ELSE 0 END) AS paid_total,
            SUM(CASE WHEN accrual_voucher_id IS NOT NULL THEN 1 ELSE 0 END) AS journaled_total
         FROM acc_payslips
         WHERE period_id = :period_id'
    );
    $statsStmt->execute(['period_id' => $periodId]);
    $stats          = $statsStmt->fetch() ?: [];
    $payslipCount   = (int)($stats['total'] ?? 0);
    $nonDraftTotal  = (int)($stats['non_draft_total'] ?? 0);
    $paidTotal      = (int)($stats['paid_total'] ?? 0);
    $journaledTotal = (int)($stats['journaled_total'] ?? 0);

    if ($nonDraftTotal > 0 || $paidTotal > 0 || $journaledTotal > 0) {
        throw new RuntimeException('This period contains approved/issued or paid payslips and cannot be deleted.');
    }

    acc_payroll_transact($pdo, function() use ($pdo, $payslipCount, $periodId) {
        if ($payslipCount > 0) {
            $pdo->prepare('DELETE FROM acc_payslips WHERE period_id = :period_id')
                ->execute(['period_id' => $periodId]);
        }
        $pdo->prepare('DELETE FROM acc_payroll_periods WHERE id = :id')
            ->execute(['id' => $periodId]);
    });

    return $payslipCount;
}

// ─── Payslip queries ──────────────────────────────────────────────────────────

function acc_payroll_fetch_payslip_detail(PDO $pdo, int $payslipId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM acc_payslips WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $payslipId]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $employee = app_hr_fetch_employee($pdo, (int)$row['employee_id']);
    $period   = acc_payroll_fetch_period($pdo, (int)$row['period_id']);
    if (!$employee || !$period) {
        return null;
    }

    $itemsStmt = $pdo->prepare('SELECT * FROM acc_payslip_items WHERE payslip_id = :id ORDER BY sort_order ASC, id ASC');
    $itemsStmt->execute(['id' => $payslipId]);
    $paymentsStmt = $pdo->prepare('SELECT * FROM acc_payslip_payments WHERE payslip_id = :id ORDER BY payment_date ASC, id ASC');
    $paymentsStmt->execute(['id' => $payslipId]);
    $docsStmt = $pdo->prepare('SELECT * FROM acc_payslip_documents WHERE payslip_id = :id ORDER BY id DESC');
    $docsStmt->execute(['id' => $payslipId]);

    return [
        'id'              => (string)$row['id'],
        'slipNo'          => $row['slip_no'] ?: null,
        'status'          => (string)$row['status'],
        'currencyCode'    => (string)$row['currency_code'],
        'inputs'          => json_decode((string)($row['inputs_json'] ?? 'null'), true) ?: [],
        'notes'           => $row['notes'] ?: null,
        'accrualVoucherId' => $row['accrual_voucher_id'] !== null ? (string)$row['accrual_voucher_id'] : null,
        'employee'        => app_hr_employee_from_row($employee),
        'period'          => acc_payroll_period_from_row($period),
        'items'           => array_map(static fn(array $item): array => [
            'id'         => (string)$item['id'],
            'itemKey'    => (string)$item['item_key'],
            'label'      => (string)$item['item_label'],
            'type'       => (string)$item['item_type'],
            'accountKey' => $item['account_key'] ?: null,
            'amount'     => (int)$item['amount'],
            'sortOrder'  => (int)$item['sort_order'],
        ], $itemsStmt->fetchAll() ?: []),
        'payments'        => array_map(static fn(array $payment): array => [
            'id'            => (string)$payment['id'],
            'paymentDate'   => (string)$payment['payment_date'],
            'paymentMethod' => (string)$payment['payment_method'],
            'accountId'     => $payment['account_id'] !== null ? (string)$payment['account_id'] : null,
            'amount'        => (int)$payment['amount'],
            'referenceNo'   => $payment['reference_no'] ?: null,
            'notes'         => $payment['notes'] ?: null,
            'voucherId'     => $payment['voucher_id'] !== null ? (string)$payment['voucher_id'] : null,
        ], $paymentsStmt->fetchAll() ?: []),
        'documents'       => array_map(static fn(array $doc): array => [
            'id'           => (string)$doc['id'],
            'documentType' => (string)$doc['document_type'],
            'originalName' => (string)$doc['original_name'],
            'filePath'     => (string)$doc['file_path'],
            'mimeType'     => (string)$doc['mime_type'],
            'fileSize'     => (int)$doc['file_size'],
            'createdAt'    => (string)$doc['created_at'],
        ], $docsStmt->fetchAll() ?: []),
        'totals'          => [
            'earningsTotal'    => (int)$row['earnings_total'],
            'deductionsTotal'  => (int)$row['deductions_total'],
            'netTotal'         => (int)$row['net_total'],
            'employerCostTotal' => (int)$row['employer_cost_total'],
            'paymentsTotal'    => (int)$row['payments_total'],
            'balanceDue'       => (int)$row['balance_due'],
        ],
        'approvedAt'  => $row['approved_at'] ?: null,
        'issuedAt'    => $row['issued_at'] ?: null,
        'cancelledAt' => $row['cancelled_at'] ?: null,
    ];
}

function acc_payroll_store_payslip(PDO $pdo, array $payload, array $actor, ?int $payslipId = null): array
{
    $employeeId = acc_parse_id($payload['employeeId'] ?? null);
    if ($employeeId === null) {
        app_json(['success' => false, 'error' => 'employeeId is required.'], 400);
    }
    $employee = app_hr_fetch_employee($pdo, $employeeId);
    if (!$employee) {
        app_json(['success' => false, 'error' => 'Employee not found.'], 404);
    }
    $period = acc_payroll_find_or_create_period($pdo, $payload, $actor);
    $inputs = is_array($payload['inputs'] ?? null) ? $payload['inputs'] : [];
    $notes  = ($v = acc_normalize_text($payload['notes'] ?? '')) !== '' ? $v : null;

    if ($payslipId !== null) {
        $current = acc_payroll_fetch_payslip_detail($pdo, $payslipId);
        if (!$current) {
            app_json(['success' => false, 'error' => 'Payslip not found.'], 404);
        }
        if ($current['status'] !== 'draft') {
            app_json(['success' => false, 'error' => 'Only draft payslips can be edited.'], 400);
        }
    }

    $computed      = acc_payroll_compute_items($pdo, $employee, $inputs);
    $paymentsTotal = 0;
    if ($payslipId !== null) {
        $paymentsTotal = (int)(($current['totals'] ?? [])['paymentsTotal'] ?? 0);
    }
    $balanceDue = $computed['netTotal'] - $paymentsTotal;

    if ($payslipId === null) {
        $pdo->prepare(
            'INSERT INTO acc_payslips
             (period_id, employee_id, status, inputs_json, formula_snapshot_json,
              earnings_total, deductions_total, net_total, employer_cost_total,
              payments_total, balance_due, notes, created_by_user_id, updated_by_user_id)
             VALUES (:period_id, :employee_id, :status, :inputs_json, :formula_snapshot_json,
                     :earnings_total, :deductions_total, :net_total, :employer_cost_total,
                     :payments_total, :balance_due, :notes, :user_id, :user_id2)'
        )->execute([
            'period_id'             => (int)$period['id'],
            'employee_id'           => $employeeId,
            'status'                => 'draft',
            'inputs_json'           => json_encode($inputs, JSON_UNESCAPED_UNICODE),
            'formula_snapshot_json' => json_encode($computed['formulaSnapshot'], JSON_UNESCAPED_UNICODE),
            'earnings_total'        => $computed['earningsTotal'],
            'deductions_total'      => $computed['deductionsTotal'],
            'net_total'             => $computed['netTotal'],
            'employer_cost_total'   => $computed['employerCostTotal'],
            'payments_total'        => $paymentsTotal,
            'balance_due'           => $balanceDue,
            'notes'                 => $notes,
            'user_id'               => (int)$actor['id'],
            'user_id2'              => (int)$actor['id'],
        ]);
        $payslipId = (int)$pdo->lastInsertId();
        $pdo->prepare('UPDATE acc_payslips SET slip_no = :slip_no WHERE id = :id')->execute([
            'slip_no' => 'PR-' . $period['period_key'] . '-' . $employee['employee_code'],
            'id'      => $payslipId,
        ]);
        app_audit_log($pdo, 'accounting.payroll.payslip.created', 'acc_payslips', (string)$payslipId, [
            'employeeId' => $employeeId,
            'periodId'   => (int)$period['id'],
        ], $actor);
    } else {
        $pdo->prepare(
            'UPDATE acc_payslips
             SET period_id = :period_id, employee_id = :employee_id,
                 inputs_json = :inputs_json, formula_snapshot_json = :formula_snapshot_json,
                 earnings_total = :earnings_total, deductions_total = :deductions_total,
                 net_total = :net_total, employer_cost_total = :employer_cost_total,
                 payments_total = :payments_total, balance_due = :balance_due,
                 notes = :notes, updated_by_user_id = :user_id
             WHERE id = :id'
        )->execute([
            'period_id'             => (int)$period['id'],
            'employee_id'           => $employeeId,
            'inputs_json'           => json_encode($inputs, JSON_UNESCAPED_UNICODE),
            'formula_snapshot_json' => json_encode($computed['formulaSnapshot'], JSON_UNESCAPED_UNICODE),
            'earnings_total'        => $computed['earningsTotal'],
            'deductions_total'      => $computed['deductionsTotal'],
            'net_total'             => $computed['netTotal'],
            'employer_cost_total'   => $computed['employerCostTotal'],
            'payments_total'        => $paymentsTotal,
            'balance_due'           => $balanceDue,
            'notes'                 => $notes,
            'user_id'               => (int)$actor['id'],
            'id'                    => $payslipId,
        ]);
        $pdo->prepare('DELETE FROM acc_payslip_items WHERE payslip_id = :id')->execute(['id' => $payslipId]);
        app_audit_log($pdo, 'accounting.payroll.payslip.updated', 'acc_payslips', (string)$payslipId, [
            'employeeId' => $employeeId,
            'periodId'   => (int)$period['id'],
        ], $actor);
    }

    $itemStmt = $pdo->prepare(
        'INSERT INTO acc_payslip_items
         (payslip_id, item_key, item_label, item_type, account_key, amount, formula_meta_json, sort_order)
         VALUES (:payslip_id, :item_key, :item_label, :item_type, :account_key, :amount, :formula_meta_json, :sort_order)'
    );
    foreach ($computed['items'] as $item) {
        $itemStmt->execute([
            'payslip_id'       => $payslipId,
            'item_key'         => $item['itemKey'],
            'item_label'       => $item['label'],
            'item_type'        => $item['type'],
            'account_key'      => $item['accountKey'],
            'amount'           => $item['amount'],
            'formula_meta_json' => json_encode($item['formulaMeta'], JSON_UNESCAPED_UNICODE),
            'sort_order'       => $item['sortOrder'],
        ]);
    }

    return acc_payroll_fetch_payslip_detail($pdo, $payslipId) ?: [];
}

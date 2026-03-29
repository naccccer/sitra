<?php
declare(strict_types=1);

require_once __DIR__ . '/accounting_helpers.php';
require_once __DIR__ . '/../../common/accounting_payroll_schema.php';
require_once __DIR__ . '/payroll_formula_engine.php';
require_once __DIR__ . '/payroll_journal.php';
require_once __DIR__ . '/payroll_helpers_payslips.php';

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
            app_json(['success' => false, 'error' => 'دوره حقوق و دستمزد یافت نشد.'], 404);
        }
        return $row;
    }

    $periodKey = acc_normalize_text($payload['periodKey'] ?? '');
    if ($periodKey === '' && isset($payload['year'], $payload['month'])) {
        $periodKey = sprintf('%04d-%02d', (int)$payload['year'], (int)$payload['month']);
    }
    if (!preg_match('/^\d{4}-\d{2}$/', $periodKey)) {
        app_json(['success' => false, 'error' => 'periodKey با فرمت YYYY-MM الزامی است.'], 400);
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

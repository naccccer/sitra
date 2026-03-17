<?php
declare(strict_types=1);

// ─── Generic helpers ─────────────────────────────────────────────────────────

function acc_parse_id($value): ?int
{
    $raw = trim((string)$value);
    if ($raw === '' || !ctype_digit($raw)) {
        return null;
    }
    $id = (int)$raw;
    return $id > 0 ? $id : null;
}

function acc_parse_bool($value, bool $fallback = false): bool
{
    if (is_bool($value)) {
        return $value;
    }
    $raw = strtolower(trim((string)$value));
    if (in_array($raw, ['1', 'true', 'yes'], true)) {
        return true;
    }
    if (in_array($raw, ['0', 'false', 'no'], true)) {
        return false;
    }
    return $fallback;
}

function acc_normalize_text($value): string
{
    return trim((string)$value);
}

function acc_require_permission(array $actor, string $permission, PDO $pdo): void
{
    if (!app_user_has_permission($actor, $permission, $pdo)) {
        app_json(['success' => false, 'error' => 'Access denied.'], 403);
    }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function acc_parse_date(string $value): ?string
{
    $v = trim($value);
    if ($v === '') {
        return null;
    }
    // Accept YYYY-MM-DD
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
        return $v;
    }
    return null;
}

// ─── Response mappers ────────────────────────────────────────────────────────

function acc_fiscal_year_from_row(array $row): array
{
    return [
        'id'              => (string)$row['id'],
        'title'           => (string)$row['title'],
        'startDate'       => (string)$row['start_date'],
        'endDate'         => (string)$row['end_date'],
        'status'          => (string)$row['status'],
        'isDefault'       => ((int)($row['is_default'] ?? 0)) === 1,
        'closedAt'        => $row['closed_at'] ?? null,
        'createdAt'       => (string)($row['created_at'] ?? ''),
    ];
}

function acc_account_from_row(array $row): array
{
    return [
        'id'            => (string)$row['id'],
        'code'          => (string)$row['code'],
        'name'          => (string)$row['name'],
        'nameEn'        => (string)($row['name_en'] ?? ''),
        'level'         => (int)$row['level'],
        'parentId'      => isset($row['parent_id']) ? (string)$row['parent_id'] : null,
        'accountType'   => (string)$row['account_type'],
        'accountNature' => (string)$row['account_nature'],
        'isPostable'    => ((int)($row['is_postable'] ?? 0)) === 1,
        'isSystem'      => ((int)($row['is_system'] ?? 0)) === 1,
        'isActive'      => ((int)($row['is_active'] ?? 0)) === 1,
        'notes'         => $row['notes'] ?? null,
        'createdAt'     => (string)($row['created_at'] ?? ''),
    ];
}

function acc_voucher_from_row(array $row, array $lines = []): array
{
    return [
        'id'                 => (string)$row['id'],
        'fiscalYearId'       => (string)$row['fiscal_year_id'],
        'voucherNo'          => (int)$row['voucher_no'],
        'voucherDate'        => (string)$row['voucher_date'],
        'description'        => (string)$row['description'],
        'status'             => (string)$row['status'],
        'sourceType'         => $row['source_type'] ?? null,
        'sourceId'           => $row['source_id'] ?? null,
        'sourceCode'         => $row['source_code'] ?? null,
        'createdByUserId'    => isset($row['created_by_user_id']) ? (string)$row['created_by_user_id'] : null,
        'createdByUsername'  => $row['created_by_username'] ?? null,
        'postedByUserId'     => isset($row['posted_by_user_id']) ? (string)$row['posted_by_user_id'] : null,
        'postedAt'           => $row['posted_at'] ?? null,
        'createdAt'          => (string)($row['created_at'] ?? ''),
        'updatedAt'          => (string)($row['updated_at'] ?? ''),
        'lines'              => $lines,
    ];
}

function acc_voucher_line_from_row(array $row): array
{
    return [
        'id'           => (string)$row['id'],
        'voucherId'    => (string)$row['voucher_id'],
        'lineNo'       => (int)$row['line_no'],
        'accountId'    => (string)$row['account_id'],
        'accountCode'  => $row['account_code'] ?? null,
        'accountName'  => $row['account_name'] ?? null,
        'description'  => (string)$row['description'],
        'debitAmount'  => (int)$row['debit_amount'],
        'creditAmount' => (int)$row['credit_amount'],
        'partyType'    => $row['party_type'] ?? null,
        'partyId'      => isset($row['party_id']) ? (string)$row['party_id'] : null,
    ];
}

// ─── Voucher number generator ────────────────────────────────────────────────
// Uses SELECT MAX(...) FOR UPDATE inside a transaction to avoid gaps

function acc_next_voucher_no(PDO $pdo, int $fiscalYearId): int
{
    $stmt = $pdo->prepare(
        'SELECT COALESCE(MAX(voucher_no), 0) + 1 AS next_no
         FROM acc_vouchers
         WHERE fiscal_year_id = :fy_id
         FOR UPDATE'
    );
    $stmt->execute(['fy_id' => $fiscalYearId]);
    return (int)($stmt->fetch()['next_no'] ?? 1);
}

// ─── Voucher lines fetcher ────────────────────────────────────────────────────

function acc_fetch_voucher_lines(PDO $pdo, int $voucherId): array
{
    $stmt = $pdo->prepare(
        'SELECT vl.*, a.code AS account_code, a.name AS account_name
         FROM acc_voucher_lines vl
         JOIN acc_accounts a ON a.id = vl.account_id
         WHERE vl.voucher_id = :vid
         ORDER BY vl.line_no ASC, vl.id ASC'
    );
    $stmt->execute(['vid' => $voucherId]);
    return array_map('acc_voucher_line_from_row', $stmt->fetchAll() ?: []);
}

// ─── Balance validation ────────────────────────────────────────────────────────

function acc_validate_lines_balance(array $lines): bool
{
    $debitSum = 0;
    $creditSum = 0;
    foreach ($lines as $line) {
        $debitSum  += (int)($line['debitAmount'] ?? 0);
        $creditSum += (int)($line['creditAmount'] ?? 0);
    }
    return $debitSum > 0 && $debitSum === $creditSum;
}

// ─── Account tree builder ────────────────────────────────────────────────────

function acc_build_account_tree(array $flatAccounts): array
{
    $byId = [];
    $roots = [];
    foreach ($flatAccounts as $acc) {
        $acc['children'] = [];
        $byId[$acc['id']] = &$acc;
        unset($acc);
    }
    foreach ($byId as &$acc) {
        if ($acc['parentId'] === null) {
            $roots[] = &$acc;
        } else {
            $parentId = $acc['parentId'];
            if (isset($byId[$parentId])) {
                $byId[$parentId]['children'][] = &$acc;
            }
        }
    }
    return $roots;
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/accounting_helpers.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
app_require_module_enabled($pdo, 'accounting');
app_ensure_accounting_schema($pdo);

$actor = app_require_auth(['admin', 'manager']);
if ($method === 'GET') {
    acc_require_permission($actor, 'accounting.fiscal_years.read', $pdo);
} else {
    acc_require_permission($actor, 'accounting.settings.write', $pdo);
    app_require_csrf();
}

// ─── GET ─────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM acc_fiscal_years ORDER BY start_date DESC');
    $rows = $stmt ? $stmt->fetchAll() : [];
    $fiscalYears = array_map('acc_fiscal_year_from_row', $rows);

    $default = null;
    foreach ($fiscalYears as $fy) {
        if ($fy['isDefault']) {
            $default = $fy;
            break;
        }
    }
    if ($default === null && count($fiscalYears) > 0) {
        // Fall back to the most recent open year
        foreach ($fiscalYears as $fy) {
            if ($fy['status'] === 'open') {
                $default = $fy;
                break;
            }
        }
    }

    app_json(['success' => true, 'fiscalYears' => $fiscalYears, 'currentDefault' => $default]);
}

$payload = app_read_json_body();

// ─── POST ─────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $title     = acc_normalize_text($payload['title'] ?? '');
    $startDate = acc_parse_date(acc_normalize_text($payload['startDate'] ?? ''));
    $endDate   = acc_parse_date(acc_normalize_text($payload['endDate'] ?? ''));

    if ($title === '' || $startDate === null || $endDate === null) {
        app_json(['success' => false, 'error' => 'title, startDate and endDate are required.'], 400);
    }
    if ($startDate >= $endDate) {
        app_json(['success' => false, 'error' => 'startDate must be before endDate.'], 400);
    }

    $pdo->prepare(
        'INSERT INTO acc_fiscal_years (title, start_date, end_date, status, is_default, created_by_user_id)
         VALUES (:title, :start, :end, :status, 0, :uid)'
    )->execute([
        'title'  => $title,
        'start'  => $startDate,
        'end'    => $endDate,
        'status' => 'open',
        'uid'    => $actor['id'],
    ]);
    $id = (int)$pdo->lastInsertId();

    // If this is the first fiscal year, make it default
    $countStmt = $pdo->query('SELECT COUNT(*) AS cnt FROM acc_fiscal_years');
    if ($countStmt && (int)($countStmt->fetch()['cnt'] ?? 0) === 1) {
        $pdo->prepare('UPDATE acc_fiscal_years SET is_default = 1 WHERE id = :id')->execute(['id' => $id]);
    }

    $fetch = $pdo->prepare('SELECT * FROM acc_fiscal_years WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();

    app_audit_log($pdo, 'accounting.fiscal_year.created', 'acc_fiscal_years', (string)$id, ['title' => $title], $actor);
    app_json(['success' => true, 'fiscalYear' => $row ? acc_fiscal_year_from_row($row) : null], 201);
}

// ─── PATCH (set_default / close / update / delete) ───────────────────────────
$id     = acc_parse_id($payload['id'] ?? null);
$action = acc_normalize_text($payload['action'] ?? '');

if ($id === null) {
    app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
}

$fetch = $pdo->prepare('SELECT * FROM acc_fiscal_years WHERE id = :id LIMIT 1');
$fetch->execute(['id' => $id]);
$current = $fetch->fetch();
if (!$current) {
    app_json(['success' => false, 'error' => 'Fiscal year not found.'], 404);
}

if ($action === 'set_default') {
    $pdo->exec('UPDATE acc_fiscal_years SET is_default = 0');
    $pdo->prepare('UPDATE acc_fiscal_years SET is_default = 1 WHERE id = :id')->execute(['id' => $id]);
    app_audit_log($pdo, 'accounting.fiscal_year.set_default', 'acc_fiscal_years', (string)$id, [], $actor);
} elseif ($action === 'close') {
    if ((string)$current['status'] === 'closed') {
        app_json(['success' => false, 'error' => 'Fiscal year is already closed.'], 400);
    }
    $pdo->prepare(
        'UPDATE acc_fiscal_years SET status = :s, closed_by_user_id = :uid, closed_at = CURRENT_TIMESTAMP WHERE id = :id'
    )->execute(['s' => 'closed', 'uid' => $actor['id'], 'id' => $id]);
    app_audit_log($pdo, 'accounting.fiscal_year.closed', 'acc_fiscal_years', (string)$id, [], $actor);
} elseif ($action === 'update') {
    $title     = acc_normalize_text($payload['title'] ?? '');
    $startDate = acc_parse_date(acc_normalize_text($payload['startDate'] ?? ''));
    $endDate   = acc_parse_date(acc_normalize_text($payload['endDate'] ?? ''));
    if ($title === '' || $startDate === null || $endDate === null) {
        app_json(['success' => false, 'error' => 'title, startDate and endDate are required.'], 400);
    }
    if ($startDate >= $endDate) {
        app_json(['success' => false, 'error' => 'startDate must be before endDate.'], 400);
    }
    $pdo->prepare(
        'UPDATE acc_fiscal_years SET title = :title, start_date = :start, end_date = :end WHERE id = :id'
    )->execute([
        'title' => $title,
        'start' => $startDate,
        'end' => $endDate,
        'id' => $id,
    ]);
    app_audit_log($pdo, 'accounting.fiscal_year.updated', 'acc_fiscal_years', (string)$id, ['title' => $title], $actor);
} elseif ($action === 'delete') {
    $voucherCountStmt = $pdo->prepare('SELECT COUNT(*) AS cnt FROM acc_vouchers WHERE fiscal_year_id = :id');
    $voucherCountStmt->execute(['id' => $id]);
    $voucherCount = (int)($voucherCountStmt->fetch()['cnt'] ?? 0);
    if ($voucherCount > 0) {
        app_json(['success' => false, 'error' => 'Fiscal year has vouchers and cannot be deleted.'], 400);
    }
    $wasDefault = (int)($current['is_default'] ?? 0) === 1;
    $pdo->prepare('DELETE FROM acc_fiscal_years WHERE id = :id')->execute(['id' => $id]);
    if ($wasDefault) {
        $fallbackStmt = $pdo->query("SELECT id FROM acc_fiscal_years WHERE status = 'open' ORDER BY start_date DESC, id DESC LIMIT 1");
        $fallbackId = (int)($fallbackStmt ? ($fallbackStmt->fetch()['id'] ?? 0) : 0);
        if ($fallbackId > 0) {
            $pdo->exec('UPDATE acc_fiscal_years SET is_default = 0');
            $pdo->prepare('UPDATE acc_fiscal_years SET is_default = 1 WHERE id = :id')->execute(['id' => $fallbackId]);
        }
    }
    app_audit_log($pdo, 'accounting.fiscal_year.deleted', 'acc_fiscal_years', (string)$id, ['wasDefault' => $wasDefault], $actor);
    app_json(['success' => true, 'deletedId' => (string)$id]);
} else {
    app_json(['success' => false, 'error' => 'Unknown action. Use set_default, close, update or delete.'], 400);
}

$fetch->execute(['id' => $id]);
$row = $fetch->fetch();
app_json(['success' => true, 'fiscalYear' => $row ? acc_fiscal_year_from_row($row) : null]);

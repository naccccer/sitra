<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/accounting_helpers.php';
require_once __DIR__ . '/vouchers_write_handlers.php';


app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
app_require_module_enabled($pdo, 'accounting');
app_ensure_accounting_schema($pdo);

$actor = app_require_auth(['admin', 'manager']);
if ($method === 'GET') {
    acc_require_permission($actor, 'accounting.vouchers.read', $pdo);
} elseif ($method === 'PATCH') {
    // post action needs vouchers.post; cancel/other need vouchers.write
    acc_require_permission($actor, 'accounting.vouchers.write', $pdo);
    app_require_csrf();
} else {
    acc_require_permission($actor, 'accounting.vouchers.write', $pdo);
    app_require_csrf();
}

// ─── GET ─────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    // Single voucher with lines
    if (isset($_GET['id'])) {
        $id = acc_parse_id($_GET['id']);
        if ($id === null) {
            app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
        }
        $stmt = $pdo->prepare(
            'SELECT v.*, u.username AS created_by_username
             FROM acc_vouchers v
             LEFT JOIN users u ON u.id = v.created_by_user_id
             WHERE v.id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if (!$row) {
            app_json(['success' => false, 'error' => 'Voucher not found.'], 404);
        }
        $lines = acc_fetch_voucher_lines($pdo, $id);
        app_json(['success' => true, 'voucher' => acc_voucher_from_row($row, $lines)]);
    }

    // List
    $fiscalYearId = acc_parse_id($_GET['fiscalYearId'] ?? null);
    $status       = acc_normalize_text($_GET['status'] ?? '');
    $dateFrom     = acc_parse_date(acc_normalize_text($_GET['dateFrom'] ?? ''));
    $dateTo       = acc_parse_date(acc_normalize_text($_GET['dateTo'] ?? ''));
    $sourceType   = acc_normalize_text($_GET['sourceType'] ?? '');
    $q            = acc_normalize_text($_GET['q'] ?? '');
    $page         = max(1, (int)($_GET['page'] ?? 1));
    $pageSize     = min(100, max(10, (int)($_GET['pageSize'] ?? 20)));
    $offset       = ($page - 1) * $pageSize;

    $where  = [];
    $params = [];

    if ($fiscalYearId !== null) {
        $where[] = 'v.fiscal_year_id = :fy_id';
        $params['fy_id'] = $fiscalYearId;
    }
    if ($status !== '' && in_array($status, ['draft', 'posted', 'cancelled'], true)) {
        $where[] = 'v.status = :status';
        $params['status'] = $status;
    }
    if ($dateFrom !== null) {
        $where[] = 'v.voucher_date >= :date_from';
        $params['date_from'] = $dateFrom;
    }
    if ($dateTo !== null) {
        $where[] = 'v.voucher_date <= :date_to';
        $params['date_to'] = $dateTo;
    }
    if ($sourceType !== '') {
        $where[] = 'v.source_type = :source_type';
        $params['source_type'] = $sourceType;
    }
    if ($q !== '') {
        $where[] = '(v.description LIKE :q OR v.source_code LIKE :q)';
        $params['q'] = '%' . $q . '%';
    }

    $whereSql = $where ? (' WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare('SELECT COUNT(*) AS total FROM acc_vouchers v' . $whereSql);
    $countStmt->execute($params);
    $total = (int)($countStmt->fetch()['total'] ?? 0);

    $listStmt = $pdo->prepare(
        'SELECT v.*, u.username AS created_by_username
         FROM acc_vouchers v
         LEFT JOIN users u ON u.id = v.created_by_user_id'
        . $whereSql .
        ' ORDER BY v.voucher_date DESC, v.voucher_no DESC
         LIMIT :limit OFFSET :offset'
    );
    foreach ($params as $k => $v) {
        $listStmt->bindValue(':' . $k, $v);
    }
    $listStmt->bindValue(':limit',  $pageSize, PDO::PARAM_INT);
    $listStmt->bindValue(':offset', $offset,   PDO::PARAM_INT);
    $listStmt->execute();
    $rows = $listStmt->fetchAll() ?: [];

    $vouchers = array_map(static function (array $row) use ($pdo): array {
        $lines = acc_fetch_voucher_lines($pdo, (int)$row['id']);
        return acc_voucher_from_row($row, $lines);
    }, $rows);

    app_json([
        'success'    => true,
        'vouchers'   => $vouchers,
        'total'      => $total,
        'page'       => $page,
        'pageSize'   => $pageSize,
        'totalPages' => max(1, (int)ceil($total / $pageSize)),
    ]);
}

$payload = app_read_json_body();
acc_accounting_handle_vouchers_write_request($pdo, $actor, $method, $payload);

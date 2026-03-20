<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
app_require_module_enabled($pdo, 'customers');
app_ensure_customers_domain_schema($pdo);

if ($method === 'GET') {
    app_require_permission('customers.read', $pdo);
} else {
    $actor = app_require_permission('customers.write', $pdo);
    app_require_csrf();
}

if ($method === 'GET') {
    $scope = app_customers_normalize_text($_GET['scope'] ?? '');
    if ($scope === 'directory') {
        $customerType = app_customers_normalize_text($_GET['customerType'] ?? '');
        if ($customerType !== '' && !app_customer_is_valid_type($customerType)) {
            app_json(['success' => false, 'error' => 'Valid customerType is required.'], 400);
        }

        $directory = app_customer_directory_fetch($pdo, [
            'q' => app_customers_normalize_text($_GET['q'] ?? ''),
            'isActive' => app_customer_directory_parse_bool_filter($_GET['isActive'] ?? null),
            'customerType' => $customerType !== '' ? $customerType : null,
            'hasDue' => app_customer_directory_parse_bool_filter($_GET['hasDue'] ?? null),
            'page' => max(1, (int)($_GET['page'] ?? 1)),
            'pageSize' => max(1, min(200, (int)($_GET['pageSize'] ?? 50))),
        ]);

        app_json(['success' => true] + $directory);
    }

    $q = app_customers_normalize_text($_GET['q'] ?? '');
    $isActiveRaw = app_customers_normalize_text($_GET['isActive'] ?? '');
    $page = max(1, (int)($_GET['page'] ?? 1));
    $pageSize = max(1, min(200, (int)($_GET['pageSize'] ?? 50)));
    $offset = ($page - 1) * $pageSize;

    $where = [];
    $params = [];
    if ($q !== '') {
        $where[] = '(full_name LIKE :q OR COALESCE(default_phone, "") LIKE :q)';
        $params['q'] = '%' . $q . '%';
    }
    if ($isActiveRaw !== '') {
        $where[] = 'is_active = :is_active';
        $params['is_active'] = app_customer_parse_bool($isActiveRaw, true) ? 1 : 0;
    }
    $whereSql = $where ? (' WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM customers' . $whereSql);
    $countStmt->execute($params);
    $total = (int)($countStmt->fetchColumn() ?: 0);

    $stmt = $pdo->prepare('SELECT * FROM customers' . $whereSql . ' ORDER BY id DESC LIMIT :limit OFFSET :offset');
    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }
    $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    app_json([
        'success' => true,
        'customers' => array_map('app_customer_from_row', $stmt->fetchAll()),
        'pagination' => [
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
        ],
    ]);
}

$payload = app_read_json_body();

if ($method === 'POST') {
    app_customer_create_from_payload($pdo, $payload, $actor);
}

if ($method === 'PUT') {
    app_customer_update_from_payload($pdo, $payload, $actor);
}

if ($method === 'PATCH') {
    app_customer_toggle_active_from_payload($pdo, $payload, $actor);
}


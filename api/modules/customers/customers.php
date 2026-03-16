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

function app_customers_parse_bool($value, bool $fallback = false): bool
{
    if (is_bool($value)) {
        return $value;
    }
    $raw = strtolower(trim((string)$value));
    if ($raw === '1' || $raw === 'true' || $raw === 'yes' || $raw === 'on') {
        return true;
    }
    if ($raw === '0' || $raw === 'false' || $raw === 'no' || $raw === 'off') {
        return false;
    }
    return $fallback;
}

if ($method === 'GET') {
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
        $params['is_active'] = app_customers_parse_bool($isActiveRaw, true) ? 1 : 0;
    }
    $whereSql = $where ? (' WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM customers' . $whereSql);
    $countStmt->execute($params);
    $total = (int)($countStmt->fetchColumn() ?: 0);

    $sql = 'SELECT * FROM customers' . $whereSql . ' ORDER BY id DESC LIMIT :limit OFFSET :offset';
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }
    $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    app_json([
        'success' => true,
        'customers' => array_map('app_customer_from_row', $rows),
        'pagination' => [
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
        ],
    ]);
}

$payload = app_read_json_body();

if ($method === 'POST') {
    $fullName = app_customers_normalize_text($payload['fullName'] ?? '');
    $defaultPhone = app_customers_normalize_text($payload['defaultPhone'] ?? '');
    $address = app_customers_normalize_text($payload['address'] ?? '');
    $notes = app_customers_normalize_text($payload['notes'] ?? '');

    if ($fullName === '') {
        app_json(['success' => false, 'error' => 'fullName is required.'], 400);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO customers (full_name, default_phone, address, notes, is_active)
         VALUES (:full_name, :default_phone, :address, :notes, 1)'
    );
    $stmt->execute([
        'full_name' => $fullName,
        'default_phone' => $defaultPhone !== '' ? $defaultPhone : null,
        'address' => $address !== '' ? $address : null,
        'notes' => $notes !== '' ? $notes : null,
    ]);

    $id = (int)$pdo->lastInsertId();
    $customer = app_customer_find($pdo, $id);
    app_audit_log($pdo, 'customers.customer.created', 'customers', (string)$id, [
        'fullName' => $fullName,
    ], $actor);

    app_json([
        'success' => true,
        'customer' => $customer ? app_customer_from_row($customer) : null,
    ], 201);
}

if ($method === 'PUT') {
    $id = app_customers_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid customer id is required.'], 400);
    }

    $current = app_customer_find($pdo, $id);
    if (!$current) {
        app_json(['success' => false, 'error' => 'Customer not found.'], 404);
    }

    $fullName = app_customers_normalize_text($payload['fullName'] ?? $current['full_name']);
    $defaultPhone = app_customers_normalize_text($payload['defaultPhone'] ?? $current['default_phone']);
    $address = app_customers_normalize_text($payload['address'] ?? $current['address']);
    $notes = app_customers_normalize_text($payload['notes'] ?? $current['notes']);
    $applyToOrderHistory = app_customers_parse_bool($payload['applyToOrderHistory'] ?? false, false);

    if ($fullName === '') {
        app_json(['success' => false, 'error' => 'fullName is required.'], 400);
    }

    $stmt = $pdo->prepare(
        'UPDATE customers
         SET full_name = :full_name,
             default_phone = :default_phone,
             address = :address,
             notes = :notes,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $stmt->execute([
        'id' => $id,
        'full_name' => $fullName,
        'default_phone' => $defaultPhone !== '' ? $defaultPhone : null,
        'address' => $address !== '' ? $address : null,
        'notes' => $notes !== '' ? $notes : null,
    ]);

    $updatedOrderSnapshots = 0;
    if ($applyToOrderHistory) {
        $updatedOrderSnapshots = app_customer_apply_snapshot_to_orders($pdo, $id, $fullName, $defaultPhone);
    }

    $customer = app_customer_find($pdo, $id);
    app_audit_log($pdo, 'customers.customer.updated', 'customers', (string)$id, [
        'applyToOrderHistory' => $applyToOrderHistory,
        'updatedOrderSnapshots' => $updatedOrderSnapshots,
    ], $actor);

    app_json([
        'success' => true,
        'customer' => $customer ? app_customer_from_row($customer) : null,
        'updatedOrderSnapshots' => $updatedOrderSnapshots,
    ]);
}

if ($method === 'PATCH') {
    $id = app_customers_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid customer id is required.'], 400);
    }
    $isActive = app_customers_parse_bool($payload['isActive'] ?? true, true);

    $stmt = $pdo->prepare(
        'UPDATE customers
         SET is_active = :is_active,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $stmt->execute([
        'id' => $id,
        'is_active' => $isActive ? 1 : 0,
    ]);
    $customer = app_customer_find($pdo, $id);
    if (!$customer) {
        app_json(['success' => false, 'error' => 'Customer not found.'], 404);
    }

    app_audit_log($pdo, 'customers.customer.active.changed', 'customers', (string)$id, [
        'isActive' => $isActive,
    ], $actor);

    app_json([
        'success' => true,
        'customer' => app_customer_from_row($customer),
    ]);
}

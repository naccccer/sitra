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

function app_customer_projects_parse_bool($value, bool $fallback = false): bool
{
    if (is_bool($value)) {
        return $value;
    }
    $raw = strtolower(trim((string)$value));
    if (in_array($raw, ['1', 'true', 'yes', 'on'], true)) {
        return true;
    }
    if (in_array($raw, ['0', 'false', 'no', 'off'], true)) {
        return false;
    }
    return $fallback;
}

function app_customer_projects_financial_summary(PDO $pdo, int $projectId): array
{
    $projectColumn = app_orders_project_id_column($pdo);
    if ($projectColumn === null) {
        return ['ordersCount' => 0, 'totalAmount' => 0, 'paidAmount' => 0, 'dueAmount' => 0];
    }

    $stmt = $pdo->prepare('SELECT ' . app_orders_select_fields($pdo) . " FROM orders WHERE {$projectColumn} = :project_id");
    $stmt->execute(['project_id' => $projectId]);
    $rows = $stmt->fetchAll();

    $ordersCount = 0;
    $totalAmount = 0;
    $paidAmount = 0;
    $dueAmount = 0;
    foreach ($rows as $row) {
        $order = app_order_from_row($row);
        $ordersCount += 1;
        $totalAmount += (int)($order['financials']['grandTotal'] ?? $order['total'] ?? 0);
        $paidAmount += (int)($order['financials']['paidTotal'] ?? 0);
        $dueAmount += (int)($order['financials']['dueAmount'] ?? 0);
    }

    return [
        'ordersCount' => $ordersCount,
        'totalAmount' => $totalAmount,
        'paidAmount' => $paidAmount,
        'dueAmount' => $dueAmount,
    ];
}

if ($method === 'GET') {
    $customerId = app_customers_parse_id($_GET['customerId'] ?? null);
    $params = [];
    $where = '';
    if ($customerId !== null) {
        $where = ' WHERE customer_id = :customer_id';
        $params['customer_id'] = $customerId;
    }

    $stmt = $pdo->prepare('SELECT * FROM customer_projects' . $where . ' ORDER BY customer_id ASC, is_default DESC, id DESC');
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $projects = [];
    foreach ($rows as $row) {
        $projectId = (int)($row['id'] ?? 0);
        $contactsStmt = $pdo->prepare(
            'SELECT * FROM customer_project_contacts WHERE project_id = :project_id ORDER BY is_primary DESC, sort_order ASC, id ASC'
        );
        $contactsStmt->execute(['project_id' => $projectId]);
        $contacts = array_map('app_customer_project_contact_from_row', $contactsStmt->fetchAll());

        $project = app_customer_project_from_row($row);
        $project['contacts'] = $contacts;
        $project['financialSummary'] = app_customer_projects_financial_summary($pdo, $projectId);
        $projects[] = $project;
    }

    app_json([
        'success' => true,
        'projects' => $projects,
    ]);
}

$payload = app_read_json_body();

if ($method === 'POST') {
    $customerId = app_customers_parse_id($payload['customerId'] ?? null);
    $name = app_customers_normalize_text($payload['name'] ?? '');
    $notes = app_customers_normalize_text($payload['notes'] ?? '');
    $isDefault = app_customer_projects_parse_bool($payload['isDefault'] ?? false, false);

    if ($customerId === null || app_customer_find($pdo, $customerId) === null) {
        app_json(['success' => false, 'error' => 'Valid customerId is required.'], 400);
    }
    if ($name === '') {
        app_json(['success' => false, 'error' => 'name is required.'], 400);
    }

    $project = app_customer_project_create($pdo, $customerId, $name, $isDefault);
    if ($notes !== '') {
        $pdo->prepare('UPDATE customer_projects SET notes = :notes WHERE id = :id')
            ->execute(['id' => (int)$project['id'], 'notes' => $notes]);
        $project = app_customer_project_find($pdo, (int)$project['id']) ?: $project;
    }

    app_audit_log($pdo, 'customers.project.created', 'customer_projects', (string)($project['id'] ?? ''), [
        'customerId' => $customerId,
        'isDefault' => $isDefault,
    ], $actor);

    app_json([
        'success' => true,
        'project' => app_customer_project_from_row($project),
    ], 201);
}

if ($method === 'PUT') {
    $id = app_customers_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid project id is required.'], 400);
    }
    $current = app_customer_project_find($pdo, $id);
    if (!$current) {
        app_json(['success' => false, 'error' => 'Project not found.'], 404);
    }

    $targetCustomerId = app_customers_parse_id($payload['targetCustomerId'] ?? $payload['customerId'] ?? $current['customer_id']);
    if ($targetCustomerId === null || app_customer_find($pdo, $targetCustomerId) === null) {
        app_json(['success' => false, 'error' => 'Valid targetCustomerId is required.'], 400);
    }

    $name = app_customers_normalize_text($payload['name'] ?? $current['name']);
    $notes = app_customers_normalize_text($payload['notes'] ?? $current['notes']);
    $isDefault = app_customer_projects_parse_bool($payload['isDefault'] ?? $current['is_default'], ((int)$current['is_default']) === 1);
    if ($name === '') {
        app_json(['success' => false, 'error' => 'name is required.'], 400);
    }

    $update = $pdo->prepare(
        'UPDATE customer_projects
         SET customer_id = :customer_id,
             name = :name,
             notes = :notes,
             is_default = :is_default,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $update->execute([
        'id' => $id,
        'customer_id' => $targetCustomerId,
        'name' => $name,
        'notes' => $notes !== '' ? $notes : null,
        'is_default' => $isDefault ? 1 : 0,
    ]);

    if ($isDefault) {
        app_customer_project_set_default($pdo, $targetCustomerId, $id);
    } else {
        $checkDefaultStmt = $pdo->prepare(
            'SELECT id FROM customer_projects WHERE customer_id = :customer_id AND is_default = 1 LIMIT 1'
        );
        $checkDefaultStmt->execute(['customer_id' => $targetCustomerId]);
        if (!$checkDefaultStmt->fetch()) {
            app_customer_project_set_default($pdo, $targetCustomerId, $id);
        }
    }

    $project = app_customer_project_find($pdo, $id) ?: $current;
    app_audit_log($pdo, 'customers.project.updated', 'customer_projects', (string)$id, [
        'targetCustomerId' => $targetCustomerId,
        'historyPolicy' => 'orders_history_unchanged',
    ], $actor);

    app_json([
        'success' => true,
        'project' => app_customer_project_from_row($project),
    ]);
}

if ($method === 'PATCH') {
    $id = app_customers_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid project id is required.'], 400);
    }
    $isActive = app_customer_projects_parse_bool($payload['isActive'] ?? true, true);

    $stmt = $pdo->prepare(
        'UPDATE customer_projects
         SET is_active = :is_active,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $stmt->execute([
        'id' => $id,
        'is_active' => $isActive ? 1 : 0,
    ]);
    $project = app_customer_project_find($pdo, $id);
    if (!$project) {
        app_json(['success' => false, 'error' => 'Project not found.'], 404);
    }

    app_audit_log($pdo, 'customers.project.active.changed', 'customer_projects', (string)$id, [
        'isActive' => $isActive,
    ], $actor);

    app_json([
        'success' => true,
        'project' => app_customer_project_from_row($project),
    ]);
}

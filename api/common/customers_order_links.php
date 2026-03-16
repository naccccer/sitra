<?php
declare(strict_types=1);

function app_customers_resolve_order_context(PDO $pdo, array $payload, bool $allowCreate = true): array
{
    app_ensure_customers_domain_schema($pdo);

    $customerName = app_customers_normalize_text($payload['customerName'] ?? '');
    $phone = app_customers_normalize_text($payload['phone'] ?? '');
    $projectName = app_customers_normalize_text($payload['projectName'] ?? '');

    $customerId = app_customers_parse_id($payload['customerId'] ?? null);
    $projectId = app_customers_parse_id($payload['projectId'] ?? null);
    $projectContactId = app_customers_parse_id($payload['projectContactId'] ?? null);

    $customer = $customerId !== null ? app_customer_find($pdo, $customerId) : null;
    if ($customerId !== null && !$customer) {
        app_json(['success' => false, 'error' => 'Customer not found.'], 404);
    }
    if (!$customer && $allowCreate && $customerName !== '' && $phone !== '') {
        $customer = app_customer_find_by_name_and_phone($pdo, $customerName, $phone);
        if (!$customer) {
            $customer = app_customer_create($pdo, $customerName, $phone);
        }
        $customerId = app_customers_parse_id($customer['id'] ?? null);
    }

    if ($customer && $customerName === '') {
        $customerName = (string)($customer['full_name'] ?? '');
    }
    if ($customer && $phone === '') {
        $phone = (string)($customer['default_phone'] ?? '');
    }

    $project = $projectId !== null ? app_customer_project_find($pdo, $projectId) : null;
    if ($projectId !== null && !$project) {
        app_json(['success' => false, 'error' => 'Project not found.'], 404);
    }
    if ($project) {
        $projectCustomerId = (int)($project['customer_id'] ?? 0);
        if ($customerId !== null && $projectCustomerId !== $customerId) {
            app_json(['success' => false, 'error' => 'Project/customer mismatch.'], 409);
        }
        if ($customerId === null) {
            $customerId = $projectCustomerId > 0 ? $projectCustomerId : null;
        }
    }
    if (!$project && $customerId !== null) {
        if ($projectName !== '') {
            $stmt = $pdo->prepare(
                'SELECT * FROM customer_projects
                 WHERE customer_id = :customer_id AND name = :name
                 ORDER BY id DESC
                 LIMIT 1'
            );
            $stmt->execute(['customer_id' => $customerId, 'name' => $projectName]);
            $project = $stmt->fetch() ?: null;
        }
        if (!$project) {
            $project = app_customer_project_ensure_default($pdo, $customerId);
        }
        $projectId = app_customers_parse_id($project['id'] ?? null);
    }

    $contact = $projectContactId !== null ? app_customer_project_contact_find($pdo, $projectContactId) : null;
    if ($projectContactId !== null && !$contact) {
        app_json(['success' => false, 'error' => 'Project contact not found.'], 404);
    }
    if ($contact && $projectId !== null && (int)($contact['project_id'] ?? 0) !== $projectId) {
        app_json(['success' => false, 'error' => 'Contact/project mismatch.'], 409);
    }
    if (!$contact && $projectId !== null) {
        if ($phone !== '') {
            $stmt = $pdo->prepare(
                'SELECT * FROM customer_project_contacts
                 WHERE project_id = :project_id AND phone = :phone
                 ORDER BY is_primary DESC, id ASC
                 LIMIT 1'
            );
            $stmt->execute(['project_id' => $projectId, 'phone' => $phone]);
            $contact = $stmt->fetch() ?: null;
        }
        if (!$contact) {
            $contact = app_customer_project_primary_contact($pdo, $projectId);
        }
        if (!$contact && $allowCreate && $phone !== '') {
            $contact = app_customer_project_contact_create($pdo, $projectId, 'main', $phone, true);
        }
        $projectContactId = app_customers_parse_id($contact['id'] ?? null);
    }

    if ($contact) {
        $phone = (string)($contact['phone'] ?? $phone);
    }
    if ($project && $projectName === '') {
        $projectName = (string)($project['name'] ?? '');
    }

    return [
        'customerId' => $customerId,
        'projectId' => $projectId,
        'projectContactId' => $projectContactId,
        'customerName' => $customerName,
        'phone' => $phone,
        'projectName' => $projectName,
    ];
}

function app_customer_apply_snapshot_to_orders(PDO $pdo, int $customerId, string $customerName, string $phone): int
{
    $customerColumn = app_orders_customer_id_column($pdo);
    if ($customerColumn === null) {
        return 0;
    }

    $stmt = $pdo->prepare(
        "UPDATE orders
         SET customer_name = :customer_name, phone = :phone
         WHERE {$customerColumn} = :customer_id"
    );
    $stmt->execute([
        'customer_name' => $customerName,
        'phone' => $phone,
        'customer_id' => $customerId,
    ]);
    return $stmt->rowCount();
}

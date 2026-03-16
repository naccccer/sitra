<?php
declare(strict_types=1);

function app_customers_parse_id($value): ?int
{
    $raw = trim((string)$value);
    if ($raw === '' || !ctype_digit($raw)) {
        return null;
    }
    $id = (int)$raw;
    return $id > 0 ? $id : null;
}

function app_customers_normalize_text($value): string
{
    return trim((string)$value);
}

function app_customer_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'fullName' => (string)($row['full_name'] ?? ''),
        'defaultPhone' => (string)($row['default_phone'] ?? ''),
        'address' => (string)($row['address'] ?? ''),
        'notes' => (string)($row['notes'] ?? ''),
        'isActive' => ((int)($row['is_active'] ?? 0)) === 1,
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

function app_customer_project_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'customerId' => (string)($row['customer_id'] ?? ''),
        'name' => (string)($row['name'] ?? ''),
        'notes' => (string)($row['notes'] ?? ''),
        'isDefault' => ((int)($row['is_default'] ?? 0)) === 1,
        'isActive' => ((int)($row['is_active'] ?? 0)) === 1,
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

function app_customer_project_contact_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'projectId' => (string)($row['project_id'] ?? ''),
        'label' => (string)($row['label'] ?? ''),
        'phone' => (string)($row['phone'] ?? ''),
        'isPrimary' => ((int)($row['is_primary'] ?? 0)) === 1,
        'isActive' => ((int)($row['is_active'] ?? 0)) === 1,
        'sortOrder' => (int)($row['sort_order'] ?? 100),
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

function app_customer_find(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM customers WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function app_customer_project_find(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM customer_projects WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function app_customer_project_contact_find(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM customer_project_contacts WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function app_customer_create(PDO $pdo, string $fullName, string $defaultPhone = ''): array
{
    $stmt = $pdo->prepare(
        'INSERT INTO customers (full_name, default_phone, is_active)
         VALUES (:full_name, :default_phone, 1)'
    );
    $stmt->execute([
        'full_name' => $fullName,
        'default_phone' => $defaultPhone !== '' ? $defaultPhone : null,
    ]);
    $created = app_customer_find($pdo, (int)$pdo->lastInsertId());
    return $created ?: [];
}

function app_customer_project_set_default(PDO $pdo, int $customerId, int $projectId): void
{
    $pdo->prepare('UPDATE customer_projects SET is_default = 0 WHERE customer_id = :customer_id')
        ->execute(['customer_id' => $customerId]);
    $pdo->prepare('UPDATE customer_projects SET is_default = 1 WHERE id = :id')
        ->execute(['id' => $projectId]);
}

function app_customer_project_create(PDO $pdo, int $customerId, string $name, bool $isDefault = false): array
{
    $stmt = $pdo->prepare(
        'INSERT INTO customer_projects (customer_id, name, is_default, is_active)
         VALUES (:customer_id, :name, :is_default, 1)'
    );
    $stmt->execute([
        'customer_id' => $customerId,
        'name' => $name,
        'is_default' => $isDefault ? 1 : 0,
    ]);
    $projectId = (int)$pdo->lastInsertId();
    if ($isDefault) {
        app_customer_project_set_default($pdo, $customerId, $projectId);
    }
    $created = app_customer_project_find($pdo, $projectId);
    return $created ?: [];
}

function app_customer_project_contact_create(PDO $pdo, int $projectId, string $label, string $phone, bool $isPrimary = false): array
{
    if ($isPrimary) {
        $pdo->prepare('UPDATE customer_project_contacts SET is_primary = 0 WHERE project_id = :project_id')
            ->execute(['project_id' => $projectId]);
    }
    $stmt = $pdo->prepare(
        'INSERT INTO customer_project_contacts (project_id, label, phone, is_primary, is_active, sort_order)
         VALUES (:project_id, :label, :phone, :is_primary, 1, 100)'
    );
    $stmt->execute([
        'project_id' => $projectId,
        'label' => $label !== '' ? $label : 'main',
        'phone' => $phone,
        'is_primary' => $isPrimary ? 1 : 0,
    ]);
    $created = app_customer_project_contact_find($pdo, (int)$pdo->lastInsertId());
    return $created ?: [];
}

function app_customer_project_primary_contact(PDO $pdo, int $projectId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM customer_project_contacts
         WHERE project_id = :project_id AND is_active = 1
         ORDER BY is_primary DESC, sort_order ASC, id ASC
         LIMIT 1'
    );
    $stmt->execute(['project_id' => $projectId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function app_customer_project_ensure_default(PDO $pdo, int $customerId): array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM customer_projects
         WHERE customer_id = :customer_id AND is_active = 1
         ORDER BY is_default DESC, id ASC
         LIMIT 1'
    );
    $stmt->execute(['customer_id' => $customerId]);
    $existing = $stmt->fetch();
    if ($existing) {
        if (((int)$existing['is_default']) !== 1) {
            app_customer_project_set_default($pdo, $customerId, (int)$existing['id']);
            return app_customer_project_find($pdo, (int)$existing['id']) ?: $existing;
        }
        return $existing;
    }
    return app_customer_project_create($pdo, $customerId, 'عمومی', true);
}

function app_customer_find_by_name_and_phone(PDO $pdo, string $fullName, string $phone): ?array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM customers
         WHERE full_name = :full_name
           AND COALESCE(default_phone, "") = :default_phone
         ORDER BY id DESC
         LIMIT 1'
    );
    $stmt->execute([
        'full_name' => $fullName,
        'default_phone' => $phone,
    ]);
    $row = $stmt->fetch();
    return $row ?: null;
}

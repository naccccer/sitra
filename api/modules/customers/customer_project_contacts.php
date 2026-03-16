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

function app_customer_contacts_parse_bool($value, bool $fallback = false): bool
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

if ($method === 'GET') {
    $projectId = app_customers_parse_id($_GET['projectId'] ?? null);
    if ($projectId === null) {
        app_json(['success' => false, 'error' => 'projectId is required.'], 400);
    }

    $stmt = $pdo->prepare(
        'SELECT * FROM customer_project_contacts
         WHERE project_id = :project_id
         ORDER BY is_primary DESC, sort_order ASC, id ASC'
    );
    $stmt->execute(['project_id' => $projectId]);
    $rows = $stmt->fetchAll();

    app_json([
        'success' => true,
        'contacts' => array_map('app_customer_project_contact_from_row', $rows),
    ]);
}

$payload = app_read_json_body();

if ($method === 'POST') {
    $projectId = app_customers_parse_id($payload['projectId'] ?? null);
    $label = app_customers_normalize_text($payload['label'] ?? 'main');
    $phone = app_customers_normalize_text($payload['phone'] ?? '');
    $isPrimary = app_customer_contacts_parse_bool($payload['isPrimary'] ?? false, false);

    if ($projectId === null || app_customer_project_find($pdo, $projectId) === null) {
        app_json(['success' => false, 'error' => 'Valid projectId is required.'], 400);
    }
    if ($phone === '') {
        app_json(['success' => false, 'error' => 'phone is required.'], 400);
    }

    $contact = app_customer_project_contact_create($pdo, $projectId, $label, $phone, $isPrimary);
    app_audit_log($pdo, 'customers.project_contact.created', 'customer_project_contacts', (string)($contact['id'] ?? ''), [
        'projectId' => $projectId,
        'isPrimary' => $isPrimary,
    ], $actor);

    app_json([
        'success' => true,
        'contact' => app_customer_project_contact_from_row($contact),
    ], 201);
}

if ($method === 'PUT') {
    $id = app_customers_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid contact id is required.'], 400);
    }
    $current = app_customer_project_contact_find($pdo, $id);
    if (!$current) {
        app_json(['success' => false, 'error' => 'Contact not found.'], 404);
    }

    $projectId = app_customers_parse_id($payload['projectId'] ?? $current['project_id']);
    if ($projectId === null || app_customer_project_find($pdo, $projectId) === null) {
        app_json(['success' => false, 'error' => 'Valid projectId is required.'], 400);
    }
    $label = app_customers_normalize_text($payload['label'] ?? $current['label']);
    $phone = app_customers_normalize_text($payload['phone'] ?? $current['phone']);
    $isPrimary = app_customer_contacts_parse_bool($payload['isPrimary'] ?? $current['is_primary'], ((int)$current['is_primary']) === 1);
    $sortOrder = (int)($payload['sortOrder'] ?? $current['sort_order'] ?? 100);
    if ($phone === '') {
        app_json(['success' => false, 'error' => 'phone is required.'], 400);
    }

    if ($isPrimary) {
        $pdo->prepare('UPDATE customer_project_contacts SET is_primary = 0 WHERE project_id = :project_id')
            ->execute(['project_id' => $projectId]);
    }

    $stmt = $pdo->prepare(
        'UPDATE customer_project_contacts
         SET project_id = :project_id,
             label = :label,
             phone = :phone,
             is_primary = :is_primary,
             sort_order = :sort_order,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $stmt->execute([
        'id' => $id,
        'project_id' => $projectId,
        'label' => $label !== '' ? $label : 'main',
        'phone' => $phone,
        'is_primary' => $isPrimary ? 1 : 0,
        'sort_order' => $sortOrder,
    ]);

    $contact = app_customer_project_contact_find($pdo, $id) ?: $current;
    app_audit_log($pdo, 'customers.project_contact.updated', 'customer_project_contacts', (string)$id, [
        'projectId' => $projectId,
        'isPrimary' => $isPrimary,
    ], $actor);

    app_json([
        'success' => true,
        'contact' => app_customer_project_contact_from_row($contact),
    ]);
}

if ($method === 'PATCH') {
    $id = app_customers_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid contact id is required.'], 400);
    }
    $isActive = app_customer_contacts_parse_bool($payload['isActive'] ?? true, true);

    $stmt = $pdo->prepare(
        'UPDATE customer_project_contacts
         SET is_active = :is_active,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $stmt->execute([
        'id' => $id,
        'is_active' => $isActive ? 1 : 0,
    ]);
    $contact = app_customer_project_contact_find($pdo, $id);
    if (!$contact) {
        app_json(['success' => false, 'error' => 'Contact not found.'], 404);
    }

    app_audit_log($pdo, 'customers.project_contact.active.changed', 'customer_project_contacts', (string)$id, [
        'isActive' => $isActive,
    ], $actor);

    app_json([
        'success' => true,
        'contact' => app_customer_project_contact_from_row($contact),
    ]);
}

<?php
declare(strict_types=1);

function app_users_active_sql(bool $hasIsActive): string
{
    return $hasIsActive ? 'is_active' : '1';
}

function app_users_to_response(array $row): array
{
    $role = (string)($row['role'] ?? '');
    $username = (string)($row['username'] ?? '');
    $fullName = trim((string)($row['full_name'] ?? ''));
    $jobTitle = trim((string)($row['job_title'] ?? ''));

    return [
        'id' => (string)$row['id'],
        'username' => $username,
        'fullName' => $fullName !== '' ? $fullName : $username,
        'role' => $role,
        'jobTitle' => $jobTitle !== '' ? $jobTitle : null,
        'isActive' => ((int)($row['is_active'] ?? 1)) === 1,
        'isArchived' => ((int)($row['is_active'] ?? 1)) !== 1 && empty($row['deleted_at']),
        'deletedAt' => isset($row['deleted_at']) && $row['deleted_at'] !== '' ? (string)$row['deleted_at'] : null,
        'createdAt' => (string)($row['created_at'] ?? ''),
        'updatedAt' => (string)($row['updated_at'] ?? ''),
    ];
}

function app_users_fetch_one(PDO $pdo, int $id, bool $hasIsActive, bool $includeDeleted = false): ?array
{
    $identitySql = app_users_has_identity_columns($pdo)
        ? 'full_name, job_title, '
        : 'username AS full_name, NULL AS job_title, ';
    $activeSql = app_users_active_sql($hasIsActive) . ' AS is_active';
    $deletedSelect = app_users_has_deleted_at_column($pdo) ? 'deleted_at, ' : 'NULL AS deleted_at, ';
    $where = 'WHERE id = :id';
    if (!$includeDeleted && app_users_has_deleted_at_column($pdo)) {
        $where .= ' AND deleted_at IS NULL';
    }
    $stmt = $pdo->prepare('SELECT id, username, ' . $identitySql . 'role, ' . $activeSql . ', ' . $deletedSelect . 'created_at, updated_at FROM users ' . $where . ' LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }

    return $row;
}

function app_users_count_active_admins(PDO $pdo, bool $hasIsActive): int
{
    $whereActive = $hasIsActive ? ' AND is_active = 1' : '';
    $whereDeleted = app_users_has_deleted_at_column($pdo) ? ' AND deleted_at IS NULL' : '';
    $stmt = $pdo->query("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'" . $whereActive . $whereDeleted);
    $row = $stmt->fetch();
    return max(0, (int)($row['c'] ?? 0));
}

function app_users_parse_bool($value): ?bool
{
    if (is_bool($value)) {
        return $value;
    }
    if (is_int($value)) {
        if ($value === 1) {
            return true;
        }
        if ($value === 0) {
            return false;
        }
        return null;
    }
    if (is_string($value)) {
        $normalized = strtolower(trim($value));
        if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
            return true;
        }
        if (in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
            return false;
        }
    }

    return null;
}


function app_users_parse_view(array $query): string
{
    $view = strtolower(trim((string)($query['view'] ?? '')));
    if (in_array($view, ['active', 'archived', 'all'], true)) {
        return $view;
    }

    $isActive = array_key_exists('isActive', $query) ? app_users_parse_bool($query['isActive']) : null;
    if ($isActive !== null) {
        return $isActive ? 'active' : 'archived';
    }

    $includeArchived = app_users_parse_bool($query['includeArchived'] ?? null) === true;
    $includeInactive = app_users_parse_bool($query['includeInactive'] ?? null) === true;
    if ($includeArchived || $includeInactive) {
        return 'all';
    }

    return 'active';
}

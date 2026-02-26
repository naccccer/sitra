<?php
declare(strict_types=1);

function app_users_active_sql(bool $hasIsActive): string
{
    return $hasIsActive ? 'is_active' : '1';
}

function app_users_to_response(array $row): array
{
    return [
        'id' => (string)$row['id'],
        'username' => (string)$row['username'],
        'role' => (string)$row['role'],
        'isActive' => ((int)($row['is_active'] ?? 1)) === 1,
        'createdAt' => (string)($row['created_at'] ?? ''),
        'updatedAt' => (string)($row['updated_at'] ?? ''),
    ];
}

function app_users_fetch_one(PDO $pdo, int $id, bool $hasIsActive): ?array
{
    $activeSql = app_users_active_sql($hasIsActive) . ' AS is_active';
    $stmt = $pdo->prepare('SELECT id, username, role, ' . $activeSql . ', created_at, updated_at FROM users WHERE id = :id LIMIT 1');
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
    $stmt = $pdo->query("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'" . $whereActive);
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

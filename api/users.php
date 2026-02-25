<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../config/db.php';

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
        if ($value === 1) return true;
        if ($value === 0) return false;
        return null;
    }
    if (is_string($value)) {
        $normalized = strtolower(trim($value));
        if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) return true;
        if (in_array($normalized, ['0', 'false', 'no', 'off'], true)) return false;
    }

    return null;
}

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
$currentUser = app_require_auth(['admin', 'manager']);
app_ensure_users_table($pdo);
$hasIsActive = app_users_is_active_column($pdo);

if ($method === 'GET') {
    $activeSql = app_users_active_sql($hasIsActive) . ' AS is_active';
    $stmt = $pdo->query('SELECT id, username, role, ' . $activeSql . ', created_at, updated_at FROM users ORDER BY id DESC');
    $rows = $stmt->fetchAll();
    $users = array_map('app_users_to_response', $rows);

    app_json([
        'success' => true,
        'users' => $users,
    ]);
}

if ($method === 'POST') {
    $payload = app_read_json_body();
    $username = trim((string)($payload['username'] ?? ''));
    $password = (string)($payload['password'] ?? '');
    $role = trim((string)($payload['role'] ?? 'manager'));

    if ($username === '') {
        app_json([
            'success' => false,
            'error' => 'Username is required.',
        ], 400);
    }

    if (strlen($password) < 6) {
        app_json([
            'success' => false,
            'error' => 'Password must be at least 6 characters.',
        ], 400);
    }

    if (!app_is_valid_user_role($role)) {
        app_json([
            'success' => false,
            'error' => 'Invalid role.',
        ], 400);
    }

    $existsStmt = $pdo->prepare('SELECT id FROM users WHERE username = :username LIMIT 1');
    $existsStmt->execute(['username' => $username]);
    if ($existsStmt->fetch()) {
        app_json([
            'success' => false,
            'error' => 'Username already exists.',
        ], 409);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    try {
        if ($hasIsActive) {
            $insert = $pdo->prepare('INSERT INTO users (username, password, role, is_active) VALUES (:username, :password, :role, 1)');
        } else {
            $insert = $pdo->prepare('INSERT INTO users (username, password, role) VALUES (:username, :password, :role)');
        }
        $insert->execute([
            'username' => $username,
            'password' => $passwordHash,
            'role' => $role,
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            app_json([
                'success' => false,
                'error' => 'Username already exists.',
            ], 409);
        }
        throw $e;
    }

    $created = app_users_fetch_one($pdo, (int)$pdo->lastInsertId(), $hasIsActive);
    app_json([
        'success' => true,
        'user' => $created ? app_users_to_response($created) : null,
    ], 201);
}

if ($method === 'PUT') {
    $payload = app_read_json_body();
    $id = (int)($payload['id'] ?? 0);
    if ($id <= 0) {
        app_json([
            'success' => false,
            'error' => 'Valid user id is required.',
        ], 400);
    }

    $existing = app_users_fetch_one($pdo, $id, $hasIsActive);
    if ($existing === null) {
        app_json([
            'success' => false,
            'error' => 'User not found.',
        ], 404);
    }

    $fields = [];
    $params = ['id' => $id];

    if (array_key_exists('username', $payload)) {
        $username = trim((string)$payload['username']);
        if ($username === '') {
            app_json([
                'success' => false,
                'error' => 'Username cannot be empty.',
            ], 400);
        }

        $duplicateStmt = $pdo->prepare('SELECT id FROM users WHERE username = :username AND id <> :id LIMIT 1');
        $duplicateStmt->execute([
            'username' => $username,
            'id' => $id,
        ]);
        if ($duplicateStmt->fetch()) {
            app_json([
                'success' => false,
                'error' => 'Username already exists.',
            ], 409);
        }

        $fields[] = 'username = :username';
        $params['username'] = $username;
    }

    if (array_key_exists('role', $payload)) {
        $role = trim((string)$payload['role']);
        if (!app_is_valid_user_role($role)) {
            app_json([
                'success' => false,
                'error' => 'Invalid role.',
            ], 400);
        }

        $isActiveNow = ((int)($existing['is_active'] ?? 1)) === 1;
        $isAdminNow = (string)$existing['role'] === 'admin';
        $isDemotingAdmin = $isAdminNow && $role !== 'admin';
        if ($isDemotingAdmin && $isActiveNow && app_users_count_active_admins($pdo, $hasIsActive) <= 1) {
            app_json([
                'success' => false,
                'error' => 'The last active admin cannot be demoted.',
            ], 400);
        }

        $fields[] = 'role = :role';
        $params['role'] = $role;
    }

    if (array_key_exists('password', $payload)) {
        $password = (string)$payload['password'];
        if (trim($password) === '' || strlen($password) < 6) {
            app_json([
                'success' => false,
                'error' => 'Password must be at least 6 characters.',
            ], 400);
        }

        $fields[] = 'password = :password';
        $params['password'] = password_hash($password, PASSWORD_DEFAULT);
    }

    if ($fields === []) {
        app_json([
            'success' => false,
            'error' => 'No changes were provided.',
        ], 400);
    }

    $stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id');
    $stmt->execute($params);

    $updated = app_users_fetch_one($pdo, $id, $hasIsActive);
    app_json([
        'success' => true,
        'user' => $updated ? app_users_to_response($updated) : null,
    ]);
}

$payload = app_read_json_body();
$id = (int)($payload['id'] ?? 0);
$isActiveRaw = $payload['isActive'] ?? null;

if ($id <= 0) {
    app_json([
        'success' => false,
        'error' => 'Valid user id is required.',
    ], 400);
}

if (!array_key_exists('isActive', $payload)) {
    app_json([
        'success' => false,
        'error' => 'isActive is required.',
    ], 400);
}

$nextActive = app_users_parse_bool($isActiveRaw);
if ($nextActive === null) {
    app_json([
        'success' => false,
        'error' => 'isActive must be a boolean.',
    ], 400);
}

if (!$hasIsActive) {
    app_json([
        'success' => false,
        'error' => 'users.is_active column is unavailable.',
    ], 500);
}

$target = app_users_fetch_one($pdo, $id, $hasIsActive);
if ($target === null) {
    app_json([
        'success' => false,
        'error' => 'User not found.',
    ], 404);
}

$targetIsActive = ((int)($target['is_active'] ?? 1)) === 1;
if (!$nextActive) {
    if ((string)$currentUser['id'] === (string)$id) {
        app_json([
            'success' => false,
            'error' => 'You cannot deactivate your own account.',
        ], 400);
    }

    if ($targetIsActive && (string)$target['role'] === 'admin' && app_users_count_active_admins($pdo, $hasIsActive) <= 1) {
        app_json([
            'success' => false,
            'error' => 'The last active admin cannot be deactivated.',
        ], 400);
    }
}

$stmt = $pdo->prepare('UPDATE users SET is_active = :is_active WHERE id = :id');
$stmt->execute([
    'id' => $id,
    'is_active' => $nextActive ? 1 : 0,
]);

$updated = app_users_fetch_one($pdo, $id, $hasIsActive);
app_json([
    'success' => true,
    'user' => $updated ? app_users_to_response($updated) : null,
]);

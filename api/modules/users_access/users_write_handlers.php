<?php
declare(strict_types=1);

require_once __DIR__ . '/users_write_helpers.php';

function app_users_reject_admin_role_mutation_for_non_owner(?array $actor, string $code): void
{
    $actorIsAdmin = ((string)($actor['role'] ?? '')) === 'admin';
    if (app_kernel_is_owner($actor) || $actorIsAdmin) {
        return;
    }

    app_json([
        'success' => false,
        'error' => 'Access denied.',
        'code' => $code,
    ], 403);
}

function app_users_handle_post(PDO $pdo, bool $hasIsActive, ?array $currentUser): void
{
    $hasIdentityColumns = app_users_has_identity_columns($pdo);
    $payload = app_read_json_body();
    $username = trim((string)($payload['username'] ?? ''));
    $fullName = trim((string)($payload['fullName'] ?? ''));
    $password = (string)($payload['password'] ?? '');
    $role = trim((string)($payload['role'] ?? 'manager'));
    $jobTitle = trim((string)($payload['jobTitle'] ?? ''));

    if ($username === '') {
        app_json([
            'success' => false,
            'error' => 'Username is required.',
        ], 400);
    }

    if ($fullName === '') {
        app_json([
            'success' => false,
            'error' => 'Full name is required.',
        ], 400);
    }
    if (!$hasIdentityColumns) {
        app_json([
            'success' => false,
            'error' => 'users full_name/job_title columns are unavailable.',
        ], 500);
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

    if ($role === 'admin') {
        app_users_reject_admin_role_mutation_for_non_owner($currentUser, 'owner_required_to_assign_admin_role');
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
        $jobTitleValue = $jobTitle !== '' ? $jobTitle : null;
        if ($hasIsActive) {
            $insert = $pdo->prepare('INSERT INTO users (username, full_name, password, role, job_title, is_active) VALUES (:username, :full_name, :password, :role, :job_title, 1)');
        } else {
            $insert = $pdo->prepare('INSERT INTO users (username, full_name, password, role, job_title) VALUES (:username, :full_name, :password, :role, :job_title)');
        }
        $insert->execute([
            'username' => $username,
            'full_name' => $fullName,
            'password' => $passwordHash,
            'role' => $role,
            'job_title' => $jobTitleValue,
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
    $createdResponse = $created ? app_users_to_response($created) : null;

    app_audit_log(
        $pdo,
        'users_access.user.created',
        'users',
        $createdResponse !== null ? (string)$createdResponse['id'] : null,
        [
            'user' => $createdResponse,
        ],
        $currentUser
    );

    app_json([
        'success' => true,
        'user' => $createdResponse,
    ], 201);
}

function app_users_handle_put(PDO $pdo, bool $hasIsActive, ?array $currentUser): void
{
    $hasIdentityColumns = app_users_has_identity_columns($pdo);
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
    $before = app_users_to_response($existing);

    $isOwner = app_kernel_is_owner($currentUser) || ((string)($currentUser['role'] ?? '')) === 'admin';
    $existingRole = (string)($existing['role'] ?? '');
    if ($existingRole === 'admin' && !$isOwner) {
        app_json([
            'success' => false,
            'error' => 'Access denied.',
            'code' => 'owner_required_to_modify_admin_user',
        ], 403);
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

    if (array_key_exists('fullName', $payload)) {
        if (!$hasIdentityColumns) {
            app_json([
                'success' => false,
                'error' => 'users full_name column is unavailable.',
            ], 500);
        }
        $fullName = trim((string)$payload['fullName']);
        if ($fullName === '') {
            app_json([
                'success' => false,
                'error' => 'Full name cannot be empty.',
            ], 400);
        }

        $fields[] = 'full_name = :full_name';
        $params['full_name'] = $fullName;
    }

    if (array_key_exists('role', $payload)) {
        $role = trim((string)$payload['role']);
        if (!app_is_valid_user_role($role)) {
            app_json([
                'success' => false,
                'error' => 'Invalid role.',
            ], 400);
        }

        if (($existingRole === 'admin' || $role === 'admin') && !$isOwner) {
            app_json([
                'success' => false,
                'error' => 'Access denied.',
                'code' => 'owner_required_to_change_admin_role',
            ], 403);
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

    if (array_key_exists('jobTitle', $payload)) {
        if (!$hasIdentityColumns) {
            app_json([
                'success' => false,
                'error' => 'users job_title column is unavailable.',
            ], 500);
        }
        $jobTitle = trim((string)$payload['jobTitle']);
        $fields[] = 'job_title = :job_title';
        $params['job_title'] = $jobTitle !== '' ? $jobTitle : null;
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
    $updatedResponse = $updated ? app_users_to_response($updated) : null;
    app_users_sync_session_after_self_update($id, $currentUser, $updatedResponse);
    $changes = app_users_build_changes_payload($before, $updatedResponse, $payload);

    app_audit_log(
        $pdo,
        'users_access.user.updated',
        'users',
        (string)$id,
        [
            'changes' => $changes,
        ],
        $currentUser
    );

    app_json([
        'success' => true,
        'user' => $updatedResponse,
    ]);
}

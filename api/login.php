<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/../config/db.php';

app_handle_preflight(['POST']);
app_require_method(['POST']);
app_ensure_users_table($pdo);
$hasIsActive = app_users_is_active_column($pdo);

$data = app_read_json_body();
$username = trim((string)($data['username'] ?? ''));
$password = (string)($data['password'] ?? '');

if ($username === '' || $password === '') {
    app_json([
        'success' => false,
        'error' => 'Username and password are required.',
    ], 400);
}

$activeSelect = $hasIsActive ? ', is_active' : ', 1 AS is_active';
$stmt = $pdo->prepare('SELECT id, username, password, role' . $activeSelect . ' FROM users WHERE username = :username LIMIT 1');
$stmt->execute(['username' => $username]);
$user = $stmt->fetch();

$validCredentials = false;
if ($user) {
    $storedPassword = (string)$user['password'];
    $passwordInfo = password_get_info($storedPassword);

    if (($passwordInfo['algo'] ?? null) !== null && ($passwordInfo['algo'] ?? 0) !== 0) {
        $validCredentials = password_verify($password, $storedPassword);
    } else {
        // Backward compatibility for legacy plain text passwords.
        $validCredentials = hash_equals($storedPassword, $password);
        if ($validCredentials) {
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $upgrade = $pdo->prepare('UPDATE users SET password = :password WHERE id = :id');
            $upgrade->execute([
                'password' => $newHash,
                'id' => $user['id'],
            ]);
        }
    }
}

if (!$user || !$validCredentials) {
    app_json([
        'success' => false,
        'error' => 'Invalid username or password.',
    ], 401);
}

if (((int)($user['is_active'] ?? 1)) !== 1) {
    app_json([
        'success' => false,
        'error' => 'Invalid username or password.',
    ], 401);
}

app_start_session();
session_regenerate_id(true);
$_SESSION['user_id'] = (string)$user['id'];
$_SESSION['username'] = (string)$user['username'];
$_SESSION['role'] = (string)$user['role'];

app_json([
    'success' => true,
    'role' => (string)$user['role'],
    'username' => (string)$user['username'],
]);

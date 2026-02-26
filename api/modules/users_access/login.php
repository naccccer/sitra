<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['POST']);
app_require_method(['POST']);
app_ensure_users_table($pdo);
$hasIsActive = app_users_is_active_column($pdo);

// Rate limiting: max 5 failed attempts per IP in a 15-minute window
$clientIp = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
$rateLimitMax = 5;
$rateLimitWindowSec = 900;
$rateLimitCutoff = date('Y-m-d H:i:s', time() - $rateLimitWindowSec);
try {
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS login_attempts (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            ip VARCHAR(45) NOT NULL,
            attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_ip_time (ip, attempted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->prepare('DELETE FROM login_attempts WHERE attempted_at < :cutoff')
        ->execute(['cutoff' => $rateLimitCutoff]);
    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = :ip AND attempted_at > :cutoff');
    $countStmt->execute(['ip' => $clientIp, 'cutoff' => $rateLimitCutoff]);
    if ((int)$countStmt->fetchColumn() >= $rateLimitMax) {
        app_audit_log($pdo, 'auth.login.rate_limited', 'session', null, [
            'ip' => $clientIp,
            'windowSeconds' => $rateLimitWindowSec,
            'maxAttempts' => $rateLimitMax,
        ]);
        app_json([
            'success' => false,
            'error' => 'Too many failed login attempts. Please try again in 15 minutes.',
        ], 429);
    }
} catch (Throwable $e) {
    // If rate-limit table is unavailable, proceed without blocking
}

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
    try {
        $pdo->prepare('INSERT INTO login_attempts (ip) VALUES (:ip)')
            ->execute(['ip' => $clientIp]);
    } catch (Throwable $e) {
        // Ignore if table unavailable
    }
    app_audit_log($pdo, 'auth.login.failed', 'session', null, [
        'ip' => $clientIp,
        'username' => $username,
    ]);
    app_json([
        'success' => false,
        'error' => 'Invalid username or password.',
    ], 401);
}

if (((int)($user['is_active'] ?? 1)) !== 1) {
    app_audit_log($pdo, 'auth.login.failed', 'session', null, [
        'ip' => $clientIp,
        'username' => $username,
        'reason' => 'inactive_user',
        'userId' => (string)$user['id'],
    ]);
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

app_audit_log(
    $pdo,
    'auth.login.success',
    'session',
    (string)$user['id'],
    ['ip' => $clientIp],
    [
        'id' => (string)$user['id'],
        'username' => (string)$user['username'],
        'role' => (string)$user['role'],
    ]
);

app_json([
    'success' => true,
    'role' => (string)$user['role'],
    'username' => (string)$user['username'],
]);

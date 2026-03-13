<?php
declare(strict_types=1);

function app_start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (int)($_SERVER['SERVER_PORT'] ?? 80) === 443;
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function app_csrf_token(): string
{
    app_start_session();
    if (empty($_SESSION['csrf_token'])) {
        try {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        } catch (Throwable $e) {
            $_SESSION['csrf_token'] = bin2hex(md5(uniqid('', true)));
        }
    }
    return (string)$_SESSION['csrf_token'];
}

function app_require_csrf(): void
{
    app_start_session();
    $token = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $expected = (string)($_SESSION['csrf_token'] ?? '');
    if ($expected === '' || $token === '' || !hash_equals($expected, $token)) {
        app_json([
            'success' => false,
            'error' => 'Invalid or missing CSRF token.',
        ], 403);
    }
}

function app_current_user(): ?array
{
    app_start_session();

    if (empty($_SESSION['user_id'])) {
        return null;
    }

    return [
        'id' => (string)$_SESSION['user_id'],
        'role' => (string)($_SESSION['role'] ?? ''),
        'username' => (string)($_SESSION['username'] ?? ''),
        'fullName' => (string)($_SESSION['full_name'] ?? ''),
        'jobTitle' => (string)($_SESSION['job_title'] ?? ''),
    ];
}

function app_require_auth(?array $roles = null): array
{
    $user = app_current_user();
    if ($user === null) {
        app_json([
            'success' => false,
            'error' => 'Authentication required.',
        ], 401);
    }

    if ($roles !== null && !in_array($user['role'], $roles, true)) {
        app_json([
            'success' => false,
            'error' => 'Access denied.',
        ], 403);
    }

    return $user;
}

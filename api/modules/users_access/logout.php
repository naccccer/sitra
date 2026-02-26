<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['POST']);
app_require_method(['POST']);
app_require_csrf();

$clientIp = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
$currentUser = app_current_user();
app_audit_log($pdo, 'auth.logout.success', 'session', $currentUser['id'] ?? null, [
    'ip' => $clientIp,
], $currentUser);

app_start_session();
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool)$params['secure'], (bool)$params['httponly']);
}
session_destroy();

app_json([
    'success' => true,
    'message' => 'Logged out successfully.',
]);

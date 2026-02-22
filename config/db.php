<?php
declare(strict_types=1);

require_once __DIR__ . '/env.php';
app_load_env_local();

$host = app_env_get('DB_HOST', '127.0.0.1');
$port = (int)app_env_get('DB_PORT', '3306');
$db   = app_env_get('DB_NAME', 'sitra');
$user = app_env_get('DB_USER', 'root');
$pass = app_env_get('DB_PASS', '');
$charset = app_env_get('DB_CHARSET', 'utf8mb4');

$dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    $isDebug = app_env_get('APP_DEBUG', '0') === '1';
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=UTF-8');
    }

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed.',
        'details' => $isDebug ? $e->getMessage() : null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

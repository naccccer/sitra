<?php
declare(strict_types=1);

require_once __DIR__ . '/env.php';
app_load_env_local();

function app_env_first(array $names, ?string $default = null): ?string
{
    foreach ($names as $name) {
        $value = app_env_get($name);
        if ($value !== null && $value !== '') {
            return $value;
        }
    }

    return $default;
}

function app_parse_database_url(?string $url): array
{
    if ($url === null || trim($url) === '') {
        return [];
    }

    $parts = parse_url($url);
    if (!is_array($parts)) {
        return [];
    }

    $scheme = strtolower((string)($parts['scheme'] ?? ''));
    if ($scheme !== '' && $scheme !== 'mysql' && $scheme !== 'mariadb') {
        return [];
    }

    $query = [];
    parse_str((string)($parts['query'] ?? ''), $query);

    $path = trim((string)($parts['path'] ?? ''), '/');

    return [
        'host' => (string)($parts['host'] ?? ''),
        'port' => isset($parts['port']) ? (string)$parts['port'] : '',
        'name' => $path,
        'user' => isset($parts['user']) ? rawurldecode((string)$parts['user']) : '',
        'pass' => isset($parts['pass']) ? rawurldecode((string)$parts['pass']) : '',
        'charset' => is_string($query['charset'] ?? null) ? (string)$query['charset'] : '',
    ];
}

function app_build_mysql_dsn(string $host, int $port, string $db, string $charset, ?string $socket = null): string
{
    if ($socket !== null && $socket !== '') {
        return "mysql:unix_socket={$socket};dbname={$db};charset={$charset}";
    }

    return "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";
}

$parsedUrl = app_parse_database_url(app_env_first(['DB_DSN', 'DATABASE_URL']));

$host = app_env_first(['DB_HOST', 'MYSQL_HOST', 'MYSQLHOST', 'DATABASE_HOST'], null);
$portRaw = app_env_first(['DB_PORT', 'MYSQL_PORT', 'MYSQLPORT', 'DATABASE_PORT'], null);
$db = app_env_first(['DB_NAME', 'MYSQL_DATABASE', 'MYSQLDATABASE', 'DATABASE_NAME'], null);
$user = app_env_first(['DB_USER', 'MYSQL_USER', 'MYSQLUSERNAME', 'DATABASE_USER'], null);
$pass = app_env_first(['DB_PASS', 'DB_PASSWORD', 'MYSQL_PASSWORD', 'MYSQLPASS', 'DATABASE_PASSWORD'], null);
$charset = app_env_first(['DB_CHARSET', 'MYSQL_CHARSET'], null);
$socket = app_env_first(['DB_SOCKET', 'MYSQL_SOCKET', 'MYSQL_UNIX_PORT'], null);

$host = $host ?? (($parsedUrl['host'] ?? '') !== '' ? (string)$parsedUrl['host'] : '127.0.0.1');
$portRaw = $portRaw ?? (($parsedUrl['port'] ?? '') !== '' ? (string)$parsedUrl['port'] : '3306');
$db = $db ?? (($parsedUrl['name'] ?? '') !== '' ? (string)$parsedUrl['name'] : 'sitra');
$user = $user ?? (($parsedUrl['user'] ?? '') !== '' ? (string)$parsedUrl['user'] : 'root');
$pass = $pass ?? (($parsedUrl['pass'] ?? '') !== '' ? (string)$parsedUrl['pass'] : '');
$charset = $charset ?? (($parsedUrl['charset'] ?? '') !== '' ? (string)$parsedUrl['charset'] : 'utf8mb4');

$port = (int)$portRaw;
if ($port <= 0) {
    $port = 3306;
}

$dsnCandidates = [
    app_build_mysql_dsn($host, $port, $db, $charset, $socket),
];

if (($socket === null || $socket === '') && $host === '127.0.0.1') {
    $dsnCandidates[] = app_build_mysql_dsn('localhost', $port, $db, $charset);
    $dsnCandidates[] = "mysql:host=localhost;dbname={$db};charset={$charset}";
}

if (($socket === null || $socket === '') && $host === 'localhost') {
    $dsnCandidates[] = app_build_mysql_dsn('127.0.0.1', $port, $db, $charset);
}

$dsnCandidates = array_values(array_unique($dsnCandidates));
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

/** @var PDO|null $pdo */
$pdo = null;
$connectionErrors = [];

try {
    foreach ($dsnCandidates as $dsn) {
        try {
            $pdo = new PDO($dsn, $user, $pass, $options);
            break;
        } catch (PDOException $e) {
            $connectionErrors[] = $dsn . ' -> ' . $e->getMessage();
        }
    }
} catch (PDOException $e) {
    $connectionErrors[] = $e->getMessage();
}

if ($pdo === null) {
    $isDebug = app_env_get('APP_DEBUG', '0') === '1';
    $details = implode(' | ', $connectionErrors);
    error_log('[sitra] Database connection failed. ' . $details);

    if (!headers_sent()) {
        header('Content-Type: application/json; charset=UTF-8');
    }

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed.',
        'details' => $isDebug ? $details : null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

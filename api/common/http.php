<?php
declare(strict_types=1);

function app_install_exception_handler(): void
{
    static $installed = false;
    if ($installed) {
        return;
    }
    $installed = true;

    set_exception_handler(static function (Throwable $e): void {
        $isDebug = app_env_get('APP_DEBUG', '0') === '1';
        error_log(sprintf(
            '[sitra] Uncaught exception: %s: %s in %s:%d',
            get_class($e),
            $e->getMessage(),
            $e->getFile(),
            $e->getLine()
        ));
        app_json([
            'success' => false,
            'error' => 'Internal server error.',
            'details' => $isDebug ? $e->getMessage() : null,
        ], 500);
    });
}

function app_allowed_origins(): array
{
    $fromEnv = app_env_get('CORS_ALLOWED_ORIGINS');
    if ($fromEnv !== null) {
        $origins = array_values(array_filter(array_map('trim', explode(',', $fromEnv))));
        if ($origins !== []) {
            return $origins;
        }
    }

    // Dev-only fallbacks — override in production via CORS_ALLOWED_ORIGINS env var.
    return [
        'http://127.0.0.1:5173',
        'http://localhost:5173',
        'http://127.0.0.1',
        'http://localhost',
    ];
}

function app_send_cors_headers(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, app_allowed_origins(), true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
        return;
    }

    if ($origin === '' && isset($_SERVER['HTTP_HOST'])) {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        header('Access-Control-Allow-Origin: ' . $scheme . '://' . $_SERVER['HTTP_HOST']);
        header('Access-Control-Allow-Credentials: true');
    }
}

function app_json($payload, int $statusCode = 200): void
{
    app_send_cors_headers();
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function app_handle_preflight(array $allowedMethods): void
{
    $methods = array_values(array_unique(array_merge($allowedMethods, ['OPTIONS'])));

    app_send_cors_headers();
    header('Access-Control-Allow-Methods: ' . implode(', ', $methods));
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-CSRF-Token');

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function app_require_method(array $allowedMethods): string
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $normalized = array_map('strtoupper', $allowedMethods);
    if (!in_array($method, $normalized, true)) {
        app_json([
            'success' => false,
            'error' => 'Method not allowed.',
        ], 405);
    }

    return $method;
}

function app_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        app_json([
            'success' => false,
            'error' => 'Invalid JSON payload.',
        ], 400);
    }

    return $decoded;
}

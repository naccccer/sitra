<?php
declare(strict_types=1);

/**
 * Production/label smoke flow:
 * 1) login
 * 2) bootstrap (csrf)
 * 3) production list
 * 4) label preview GET
 * 5) label preview POST (csrf)
 *
 * Usage:
 * php scripts/smoke-production-flow.php --base=http://localhost/sitra --user=admin --pass=admin123
 */

function cli_arg(string $name, string $default): string
{
    global $argv;
    foreach ($argv as $arg) {
        if (str_starts_with($arg, $name . '=')) {
            return (string)substr($arg, strlen($name) + 1);
        }
    }
    return $default;
}

function fail(string $message, int $exitCode = 1): void
{
    fwrite(STDERR, $message . PHP_EOL);
    exit($exitCode);
}

function cookie_header(array $cookies): string
{
    if ($cookies === []) {
        return '';
    }

    $parts = [];
    foreach ($cookies as $key => $value) {
        $parts[] = $key . '=' . $value;
    }
    return implode('; ', $parts);
}

/**
 * @param array<string,string> $cookies
 * @param array<string,string> $extraHeaders
 * @param array<string,mixed>|null $jsonBody
 * @return array{status:int,headers:string,body:mixed,rawBody:string}
 */
function http_json_request(string $method, string $url, array &$cookies, array $extraHeaders = [], ?array $jsonBody = null): array
{
    $headers = ['Accept: application/json'];
    foreach ($extraHeaders as $name => $value) {
        $headers[] = $name . ': ' . $value;
    }

    $payload = null;
    if ($jsonBody !== null) {
        $payload = json_encode($jsonBody, JSON_UNESCAPED_UNICODE);
        if (!is_string($payload)) {
            fail('Failed to encode JSON request body.');
        }
        $headers[] = 'Content-Type: application/json';
    }

    $cookieLine = cookie_header($cookies);
    if ($cookieLine !== '') {
        $headers[] = 'Cookie: ' . $cookieLine;
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch === false) {
            fail('Unable to initialize cURL for ' . $url);
        }

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_HTTPHEADER => $headers,
        ]);

        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }

        $rawResponse = curl_exec($ch);
        if (!is_string($rawResponse)) {
            $error = curl_error($ch);
            curl_close($ch);
            fail('HTTP request failed: ' . $error);
        }

        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $headerSize = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        curl_close($ch);

        $headerText = substr($rawResponse, 0, $headerSize);
        $bodyText = substr($rawResponse, $headerSize);
        if ($bodyText === false) {
            $bodyText = '';
        }

        if (preg_match_all('/^Set-Cookie:\s*([^=;\r\n]+)=([^;\r\n]*)/mi', $headerText, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $cookies[$match[1]] = $match[2];
            }
        }
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => strtoupper($method),
                'header' => implode("\r\n", $headers),
                'ignore_errors' => true,
                'timeout' => 25,
                'content' => $payload ?? '',
            ],
        ]);
        $bodyText = @file_get_contents($url, false, $context);
        $responseHeaders = isset($http_response_header) && is_array($http_response_header)
            ? $http_response_header
            : [];
        if ($bodyText === false && $responseHeaders === []) {
            fail('HTTP request failed for ' . $url);
        }
        if ($bodyText === false) {
            $bodyText = '';
        }

        $headerText = implode("\r\n", $responseHeaders);
        $status = 0;
        if (isset($responseHeaders[0]) && preg_match('/\s(\d{3})\s/', $responseHeaders[0], $m)) {
            $status = (int)$m[1];
        }

        foreach ($responseHeaders as $headerLine) {
            if (stripos($headerLine, 'Set-Cookie:') !== 0) {
                continue;
            }
            if (preg_match('/^Set-Cookie:\s*([^=;\r\n]+)=([^;\r\n]*)/i', $headerLine, $match)) {
                $cookies[$match[1]] = $match[2];
            }
        }
    }

    $decoded = null;
    if (trim($bodyText) !== '') {
        $decoded = json_decode($bodyText, true);
    }

    return [
        'status' => $status,
        'headers' => $headerText,
        'body' => $decoded,
        'rawBody' => $bodyText,
    ];
}

$baseUrl = rtrim(cli_arg('--base', 'http://localhost/sitra'), '/');
$username = cli_arg('--user', 'admin');
$password = cli_arg('--pass', 'admin123');
$cookies = [];

$login = http_json_request('POST', $baseUrl . '/api/login.php', $cookies, [], [
    'username' => $username,
    'password' => $password,
]);
if ($login['status'] !== 200 || !is_array($login['body']) || !($login['body']['success'] ?? false)) {
    fail('Login step failed. HTTP ' . $login['status']);
}

$bootstrap = http_json_request('GET', $baseUrl . '/api/bootstrap.php', $cookies);
if ($bootstrap['status'] !== 200 || !is_array($bootstrap['body'])) {
    fail('Bootstrap step failed. HTTP ' . $bootstrap['status']);
}
$csrfToken = (string)($bootstrap['body']['csrfToken'] ?? '');
if ($csrfToken === '') {
    fail('Bootstrap returned no csrfToken.');
}

$production = http_json_request('GET', $baseUrl . '/api/production.php', $cookies);
if ($production['status'] !== 200 || !is_array($production['body'])) {
    fail('Production list step failed. HTTP ' . $production['status']);
}

$workOrders = $production['body']['workOrders'] ?? [];
if (!is_array($workOrders) || count($workOrders) === 0) {
    echo json_encode([
        'success' => true,
        'warning' => 'No work orders found; label checks skipped.',
        'steps' => [
            'login' => 'ok',
            'bootstrap' => 'ok',
            'production_list' => 'ok',
            'label_get_preview' => 'skipped',
            'label_post_preview' => 'skipped',
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
    exit(0);
}

$firstWorkOrder = $workOrders[0];
$orderRowKey = trim((string)($firstWorkOrder['orderRowKey'] ?? ''));
if ($orderRowKey === '') {
    fail('First work order does not include orderRowKey.');
}

$labelGet = http_json_request('GET', $baseUrl . '/api/production_labels.php?orderRowKey=' . urlencode($orderRowKey), $cookies);
if ($labelGet['status'] !== 200 || !is_array($labelGet['body']) || !($labelGet['body']['success'] ?? false)) {
    fail('Label GET preview failed. HTTP ' . $labelGet['status']);
}

$labelPost = http_json_request('POST', $baseUrl . '/api/production_labels.php', $cookies, [
    'X-CSRF-Token' => $csrfToken,
], [
    'orderRowKey' => $orderRowKey,
    'action' => 'preview',
    'copies' => 1,
]);
if ($labelPost['status'] !== 200 || !is_array($labelPost['body']) || !($labelPost['body']['success'] ?? false)) {
    fail('Label POST preview failed. HTTP ' . $labelPost['status']);
}

echo json_encode([
    'success' => true,
    'steps' => [
        'login' => 'ok',
        'bootstrap' => 'ok',
        'production_list' => 'ok',
        'label_get_preview' => 'ok',
        'label_post_preview' => 'ok',
    ],
    'testedOrderRowKey' => $orderRowKey,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;

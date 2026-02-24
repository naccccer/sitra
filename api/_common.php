<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
app_load_env_local();

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

app_install_exception_handler();

function app_env(string $name, ?string $default = null): ?string
{
    return app_env_get($name, $default);
}

function app_allowed_origins(): array
{
    $fromEnv = app_env('CORS_ALLOWED_ORIGINS');
    if ($fromEnv !== null) {
        $origins = array_values(array_filter(array_map('trim', explode(',', $fromEnv))));
        if ($origins !== []) {
            return $origins;
        }
    }

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
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

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

function app_start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
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

function app_valid_order_status(string $status): bool
{
    return in_array($status, ['pending', 'processing', 'delivered', 'archived'], true);
}

function app_payment_method_defaults(): array
{
    return ['card', 'check', 'cash', 'other'];
}

function app_normalize_payment_method($method): string
{
    $raw = trim((string)$method);
    if ($raw === '') {
        return 'cash';
    }

    $lower = strtolower($raw);
    $aliases = [
        'card' => 'card',
        'transfer' => 'card',
        'کارت به کارت' => 'card',
        'check' => 'check',
        'cheque' => 'check',
        'چک' => 'check',
        'cash' => 'cash',
        'نقد' => 'cash',
        'other' => 'other',
        'سایر' => 'other',
    ];

    if (isset($aliases[$raw])) {
        return $aliases[$raw];
    }
    if (isset($aliases[$lower])) {
        return $aliases[$lower];
    }

    return 'other';
}

function app_normalize_payment_receipt($receipt): ?array
{
    if (!is_array($receipt)) {
        return null;
    }

    $filePath = trim((string)($receipt['filePath'] ?? ''));
    if ($filePath === '') {
        return null;
    }

    return [
        'filePath' => $filePath,
        'originalName' => trim((string)($receipt['originalName'] ?? '')),
        'mimeType' => trim((string)($receipt['mimeType'] ?? '')),
        'size' => max(0, (int)($receipt['size'] ?? 0)),
    ];
}

function app_generate_order_code(int $sequence = 1): string
{
    $date = date('ymd');
    $sequence = max(1, $sequence);
    $seq = str_pad((string)$sequence, 3, '0', STR_PAD_LEFT);
    $base = $date . '00' . $seq;
    $sum = 0;
    $chars = str_split($base);
    foreach ($chars as $char) {
        $sum += (int)$char;
    }

    $checksum = $sum % 10;
    return $date . '-00-' . $seq . '-' . $checksum;
}

function app_order_meta_defaults(int $grandTotal = 0): array
{
    $safeGrandTotal = max(0, $grandTotal);

    return [
        'financials' => [
            'subTotal' => $safeGrandTotal,
            'itemDiscountTotal' => 0,
            'invoiceDiscountType' => 'none',
            'invoiceDiscountValue' => 0,
            'invoiceDiscountAmount' => 0,
            'taxEnabled' => false,
            'taxRate' => 10,
            'taxAmount' => 0,
            'grandTotal' => $safeGrandTotal,
            'paidTotal' => 0,
            'dueAmount' => $safeGrandTotal,
            'paymentStatus' => $safeGrandTotal > 0 ? 'unpaid' : 'paid',
        ],
        'payments' => [],
        'invoiceNotes' => '',
    ];
}

function app_normalize_item_for_response($item): array
{
    if (!is_array($item)) {
        return [];
    }

    $itemType = (string)($item['itemType'] ?? 'catalog');
    if ($itemType !== 'manual') {
        $itemType = 'catalog';
    }

    $count = (int)($item['dimensions']['count'] ?? 1);
    if ($count <= 0) {
        $count = 1;
    }

    $unitPrice = (int)($item['unitPrice'] ?? 0);
    $totalPrice = (int)($item['totalPrice'] ?? 0);
    if ($totalPrice <= 0 && $unitPrice > 0) {
        $totalPrice = $unitPrice * $count;
    }

    $pricingMeta = is_array($item['pricingMeta'] ?? null) ? $item['pricingMeta'] : [];
    $pricingMeta = array_merge([
        'catalogUnitPrice' => $unitPrice,
        'catalogLineTotal' => max(0, $totalPrice),
        'overrideUnitPrice' => null,
        'overrideReason' => '',
        'floorUnitPrice' => max(0, $unitPrice),
        'isBelowFloor' => false,
        'itemDiscountType' => 'none',
        'itemDiscountValue' => 0,
        'itemDiscountAmount' => 0,
        'finalUnitPrice' => max(0, $unitPrice),
        'finalLineTotal' => max(0, $totalPrice),
    ], $pricingMeta);

    $item['itemType'] = $itemType;
    $item['pricingMeta'] = $pricingMeta;
    $item['unitPrice'] = max(0, (int)($pricingMeta['finalUnitPrice'] ?? $unitPrice));
    $item['totalPrice'] = max(0, (int)($pricingMeta['finalLineTotal'] ?? $totalPrice));

    if ($itemType === 'manual') {
        $manual = is_array($item['manual'] ?? null) ? $item['manual'] : [];
        $item['manual'] = array_merge([
            'qty' => $count,
            'unitLabel' => 'عدد',
            'description' => '',
            'taxable' => true,
            'productionImpact' => false,
        ], $manual);
    }

    return $item;
}

function app_order_from_row(array $row): array
{
    $itemsPayload = (string)($row['items_json'] ?? $row['items'] ?? '[]');
    $items = json_decode($itemsPayload, true);
    if (!is_array($items)) {
        $items = [];
    }
    $items = array_values(array_map('app_normalize_item_for_response', $items));

    $metaPayload = (string)($row['order_meta_json'] ?? '');
    $metaDecoded = $metaPayload !== '' ? json_decode($metaPayload, true) : null;
    if (!is_array($metaDecoded)) {
        $metaDecoded = [];
    }

    $baseTotal = max(0, (int)$row['total']);
    $metaDefaults = app_order_meta_defaults($baseTotal);
    $financials = is_array($metaDecoded['financials'] ?? null) ? $metaDecoded['financials'] : [];
    $financials = array_merge($metaDefaults['financials'], $financials);

    $payments = is_array($metaDecoded['payments'] ?? null) ? $metaDecoded['payments'] : [];
    $payments = array_values(array_filter(array_map(static function ($payment) {
        if (!is_array($payment)) {
            return null;
        }

        $receipt = app_normalize_payment_receipt($payment['receipt'] ?? null);
        return [
            'id' => (string)($payment['id'] ?? uniqid('pay_', true)),
            'date' => (string)($payment['date'] ?? date('Y/m/d')),
            'amount' => max(0, (int)($payment['amount'] ?? 0)),
            'method' => app_normalize_payment_method($payment['method'] ?? 'cash'),
            'reference' => (string)($payment['reference'] ?? ''),
            'note' => (string)($payment['note'] ?? ''),
            'receipt' => $receipt,
        ];
    }, $payments)));

    $paidTotalFromPayments = 0;
    foreach ($payments as $payment) {
        $paidTotalFromPayments += (int)($payment['amount'] ?? 0);
    }

    $grandTotal = max(0, (int)($financials['grandTotal'] ?? $baseTotal));
    if ($grandTotal === 0 && $baseTotal > 0) {
        $grandTotal = $baseTotal;
    }

    $paidTotal = max((int)($financials['paidTotal'] ?? 0), $paidTotalFromPayments);
    $dueAmount = max(0, $grandTotal - $paidTotal);
    $paymentStatus = (string)($financials['paymentStatus'] ?? '');
    if ($paymentStatus === '') {
        if ($dueAmount <= 0) {
            $paymentStatus = 'paid';
        } elseif ($paidTotal > 0) {
            $paymentStatus = 'partial';
        } else {
            $paymentStatus = 'unpaid';
        }
    }

    $financials['grandTotal'] = $grandTotal;
    $financials['paidTotal'] = $paidTotal;
    $financials['dueAmount'] = $dueAmount;
    $financials['paymentStatus'] = $paymentStatus;
    $financials['subTotal'] = max(0, (int)($financials['subTotal'] ?? $grandTotal));
    $financials['itemDiscountTotal'] = max(0, (int)($financials['itemDiscountTotal'] ?? 0));
    $financials['invoiceDiscountValue'] = max(0, (int)($financials['invoiceDiscountValue'] ?? 0));
    $financials['invoiceDiscountAmount'] = max(0, (int)($financials['invoiceDiscountAmount'] ?? 0));
    $financials['taxRate'] = max(0, (int)($financials['taxRate'] ?? 10));
    $financials['taxAmount'] = max(0, (int)($financials['taxAmount'] ?? 0));
    $financials['taxEnabled'] = (bool)($financials['taxEnabled'] ?? false);
    $financials['invoiceDiscountType'] = (string)($financials['invoiceDiscountType'] ?? 'none');

    $invoiceNotes = (string)($metaDecoded['invoiceNotes'] ?? '');

    return [
        'id' => (string)$row['id'],
        'orderCode' => (string)$row['order_code'],
        'customerName' => (string)$row['customer_name'],
        'phone' => (string)$row['phone'],
        'date' => (string)$row['order_date'],
        'total' => $grandTotal,
        'status' => (string)$row['status'],
        'items' => $items,
        'financials' => $financials,
        'payments' => $payments,
        'invoiceNotes' => $invoiceNotes,
    ];
}

function app_ensure_system_settings_table(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS system_settings (
            setting_key VARCHAR(100) NOT NULL,
            setting_value LONGTEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (setting_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function app_table_is_queryable(PDO $pdo, string $table): bool
{
    try {
        $pdo->query('SELECT 1 FROM `' . $table . '` LIMIT 1');
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

function app_column_is_queryable(PDO $pdo, string $table, string $column): bool
{
    try {
        $pdo->query('SELECT `' . $column . '` FROM `' . $table . '` LIMIT 1');
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

function app_ensure_orders_table(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    $ordersTableExists = app_table_is_queryable($pdo, 'orders');
    if (!$ordersTableExists) {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS orders (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                order_code VARCHAR(64) NOT NULL,
                customer_name VARCHAR(200) NOT NULL,
                phone VARCHAR(40) NOT NULL,
                order_date VARCHAR(40) NOT NULL,
                total BIGINT NOT NULL DEFAULT 0,
                status ENUM('pending','processing','delivered','archived') NOT NULL DEFAULT 'pending',
                items_json LONGTEXT NOT NULL,
                order_meta_json LONGTEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_orders_status (status),
                KEY idx_orders_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    }

    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM orders LIKE 'order_meta_json'");
        if (!$stmt || !$stmt->fetch()) {
            $pdo->exec("ALTER TABLE orders ADD COLUMN order_meta_json LONGTEXT NULL AFTER items_json");
        }
    } catch (Throwable $e) {
        // Keep runtime compatibility if alter is not possible.
    }
}

function app_detect_orders_items_column(PDO $pdo): string
{
    static $detected = null;
    if ($detected !== null) {
        return $detected;
    }

    try {
        app_ensure_orders_table($pdo);
        $stmt = $pdo->query("SHOW COLUMNS FROM orders LIKE 'items_json'");
        if ($stmt && $stmt->fetch()) {
            $detected = 'items_json';
            return $detected;
        }

        $stmt = $pdo->query("SHOW COLUMNS FROM orders LIKE 'items'");
        if ($stmt && $stmt->fetch()) {
            $detected = 'items';
            return $detected;
        }
    } catch (Throwable $e) {
        // Fall through to default to preserve behavior when metadata lookup fails.
    }

    if (app_column_is_queryable($pdo, 'orders', 'items_json')) {
        $detected = 'items_json';
        return $detected;
    }

    if (app_column_is_queryable($pdo, 'orders', 'items')) {
        $detected = 'items';
        return $detected;
    }

    $detected = 'items_json';
    return $detected;
}

function app_orders_items_column(PDO $pdo): string
{
    return app_detect_orders_items_column($pdo);
}

function app_detect_orders_meta_column(PDO $pdo): ?string
{
    static $detected = false;
    if ($detected !== false) {
        return $detected === '' ? null : $detected;
    }

    try {
        app_ensure_orders_table($pdo);
        $stmt = $pdo->query("SHOW COLUMNS FROM orders LIKE 'order_meta_json'");
        if ($stmt && $stmt->fetch()) {
            $detected = 'order_meta_json';
            return $detected;
        }
    } catch (Throwable $e) {
        // Fall through to no-meta fallback.
    }

    if (app_column_is_queryable($pdo, 'orders', 'order_meta_json')) {
        $detected = 'order_meta_json';
        return $detected;
    }

    $detected = '';
    return null;
}

function app_orders_meta_column(PDO $pdo): ?string
{
    return app_detect_orders_meta_column($pdo);
}

function app_detect_orders_date_column(PDO $pdo): string
{
    static $detected = null;
    if ($detected !== null) {
        return $detected;
    }

    try {
        app_ensure_orders_table($pdo);

        $stmt = $pdo->query("SHOW COLUMNS FROM orders LIKE 'order_date'");
        if ($stmt && $stmt->fetch()) {
            $detected = 'order_date';
            return $detected;
        }

        $stmt = $pdo->query("SHOW COLUMNS FROM orders LIKE 'date'");
        if ($stmt && $stmt->fetch()) {
            $detected = 'date';
            return $detected;
        }
    } catch (Throwable $e) {
        // Fall through to default for compatibility.
    }

    if (app_column_is_queryable($pdo, 'orders', 'order_date')) {
        $detected = 'order_date';
        return $detected;
    }

    if (app_column_is_queryable($pdo, 'orders', 'date')) {
        $detected = 'date';
        return $detected;
    }

    $detected = 'order_date';
    return $detected;
}

function app_orders_date_column(PDO $pdo): string
{
    return app_detect_orders_date_column($pdo);
}

function app_orders_select_fields(PDO $pdo): string
{
    $itemsColumn = app_detect_orders_items_column($pdo);
    $metaColumn = app_detect_orders_meta_column($pdo);
    $dateColumn = app_detect_orders_date_column($pdo);
    $metaSelect = $metaColumn !== null ? $metaColumn : 'NULL AS order_meta_json';

    if ($itemsColumn === 'items') {
        return 'id, order_code, customer_name, phone, ' . $dateColumn . ' AS order_date, total, status, items AS items_json, ' . $metaSelect;
    }

    return 'id, order_code, customer_name, phone, ' . $dateColumn . ' AS order_date, total, status, items_json, ' . $metaSelect;
}

function app_orders_sort_clause(PDO $pdo): string
{
    static $clause = null;
    if ($clause !== null) {
        return $clause;
    }

    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM orders LIKE 'created_at'");
        if ($stmt && $stmt->fetch()) {
            $clause = 'created_at DESC, id DESC';
            return $clause;
        }
    } catch (Throwable $e) {
        // Fall through to id-based sorting.
    }

    $clause = 'id DESC';
    return $clause;
}

function app_read_catalog(PDO $pdo)
{
    try {
        app_ensure_system_settings_table($pdo);
        $stmt = $pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key = :k LIMIT 1');
        $stmt->execute(['k' => 'catalog']);
        $row = $stmt->fetch();
    } catch (Throwable $e) {
        return null;
    }

    if (!$row || !isset($row['setting_value'])) {
        return null;
    }

    $decoded = json_decode((string)$row['setting_value'], true);
    if (!is_array($decoded)) {
        return null;
    }

    $billing = is_array($decoded['billing'] ?? null) ? $decoded['billing'] : [];
    $rawPaymentMethods = is_array($billing['paymentMethods'] ?? null) ? $billing['paymentMethods'] : app_payment_method_defaults();
    $paymentMethods = array_values(array_unique(array_map('app_normalize_payment_method', $rawPaymentMethods)));
    if ($paymentMethods === []) {
        $paymentMethods = app_payment_method_defaults();
    }

    $decoded['billing'] = [
        'priceFloorPercent' => max(1, min(100, (int)($billing['priceFloorPercent'] ?? 90))),
        'taxDefaultEnabled' => (bool)($billing['taxDefaultEnabled'] ?? false),
        'taxRate' => max(0, min(100, (int)($billing['taxRate'] ?? 10))),
        'paymentMethods' => $paymentMethods,
    ];

    return $decoded;
}


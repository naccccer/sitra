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

function app_allowed_origins(): array
{
    $fromEnv = app_env_get('CORS_ALLOWED_ORIGINS');
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

function app_ensure_audit_logs_table(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS audit_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            event_type VARCHAR(120) NOT NULL,
            entity_type VARCHAR(80) NOT NULL,
            entity_id VARCHAR(80) NULL,
            actor_user_id VARCHAR(64) NULL,
            actor_username VARCHAR(64) NULL,
            actor_role VARCHAR(32) NULL,
            payload_json LONGTEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_audit_event_created (event_type, created_at),
            KEY idx_audit_entity (entity_type, entity_id),
            KEY idx_audit_actor_created (actor_user_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function app_audit_log(PDO $pdo, string $eventType, string $entityType, ?string $entityId = null, array $payload = [], ?array $actor = null): void
{
    try {
        app_ensure_audit_logs_table($pdo);

        $effectiveActor = $actor;
        if ($effectiveActor === null) {
            $effectiveActor = app_current_user();
        }

        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($payloadJson === false) {
            $payloadJson = json_encode(['encoding_error' => true], JSON_UNESCAPED_UNICODE);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO audit_logs (
                event_type, entity_type, entity_id,
                actor_user_id, actor_username, actor_role, payload_json
             ) VALUES (
                :event_type, :entity_type, :entity_id,
                :actor_user_id, :actor_username, :actor_role, :payload_json
             )'
        );

        $stmt->execute([
            'event_type' => $eventType,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'actor_user_id' => $effectiveActor['id'] ?? null,
            'actor_username' => $effectiveActor['username'] ?? null,
            'actor_role' => $effectiveActor['role'] ?? null,
            'payload_json' => $payloadJson,
        ]);
    } catch (Throwable $e) {
        // Audit logging must never block primary business flow.
    }
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

function app_generate_order_code(string|int $datePrefix = '', string $flags = '00', int $sequence = 1, int $seqPad = 5): string
{
    $date = date('ymd');
    if (is_int($datePrefix)) {
        // Backward compatibility for old signature: app_generate_order_code($sequence)
        $sequence = $datePrefix;
    } else {
        $candidateDate = preg_replace('/\D+/', '', trim($datePrefix));
        if (is_string($candidateDate) && strlen($candidateDate) === 6) {
            $date = $candidateDate;
        }
    }

    $flagsDigits = preg_replace('/\D+/', '', $flags);
    if (!is_string($flagsDigits)) {
        $flagsDigits = '00';
    }
    $flagsNormalized = substr(str_pad($flagsDigits, 2, '0', STR_PAD_LEFT), -2);

    $sequence = max(1, $sequence);
    $seqPad = max(3, min(12, $seqPad));
    $seq = str_pad((string)$sequence, $seqPad, '0', STR_PAD_LEFT);

    $base = $date . $flagsNormalized . $seq;
    $sum = 0;
    foreach (str_split($base) as $char) {
        $sum += (int)$char;
    }

    $checksum = $sum % 10;
    return $date . '-' . $flagsNormalized . '-' . $seq . '-' . $checksum;
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

function app_orders_unique_code_index_exists(PDO $pdo): bool
{
    try {
        $stmt = $pdo->query("SHOW INDEX FROM orders WHERE Key_name = 'uq_orders_order_code'");
        return (bool)($stmt && $stmt->fetch());
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
                UNIQUE KEY uq_orders_order_code (order_code),
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

    try {
        if (!app_orders_unique_code_index_exists($pdo)) {
            $pdo->exec("ALTER TABLE orders ADD UNIQUE KEY uq_orders_order_code (order_code)");
        }
    } catch (Throwable $e) {
        // Keep runtime compatibility if alter is not possible.
    }
}

/**
 * Returns the first candidate column that exists in the orders table, or null if none found.
 * Tries SHOW COLUMNS first, then falls back to a live query probe.
 */
function app_find_orders_column(PDO $pdo, array $candidates): ?string
{
    try {
        app_ensure_orders_table($pdo);
        foreach ($candidates as $col) {
            $stmt = $pdo->query("SHOW COLUMNS FROM orders LIKE '{$col}'");
            if ($stmt && $stmt->fetch()) {
                return $col;
            }
        }
    } catch (Throwable $e) {
        // Fall through to queryable probe.
    }

    foreach ($candidates as $col) {
        if (app_column_is_queryable($pdo, 'orders', $col)) {
            return $col;
        }
    }

    return null;
}

function app_detect_orders_items_column(PDO $pdo): string
{
    static $detected = null;
    if ($detected !== null) {
        return $detected;
    }
    $detected = app_find_orders_column($pdo, ['items_json', 'items']) ?? 'items_json';
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
    $found = app_find_orders_column($pdo, ['order_meta_json']);
    $detected = $found ?? '';
    return $found;
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
    $detected = app_find_orders_column($pdo, ['order_date', 'date']) ?? 'order_date';
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

function app_user_roles(): array
{
    return ['admin', 'manager', 'sales', 'production', 'inventory'];
}

function app_module_registry_seed_rows(): array
{
    return [
        [
            'module_key' => 'auth',
            'label' => 'Auth',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 1,
            'sort_order' => 10,
        ],
        [
            'module_key' => 'users-access',
            'label' => 'Users Access',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 1,
            'sort_order' => 20,
        ],
        [
            'module_key' => 'sales',
            'label' => 'Sales',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 0,
            'sort_order' => 30,
        ],
        [
            'module_key' => 'master-data',
            'label' => 'Master Data',
            'phase' => 'active',
            'is_enabled' => 1,
            'is_protected' => 0,
            'sort_order' => 40,
        ],
        [
            'module_key' => 'production',
            'label' => 'Production',
            'phase' => 'mvp',
            'is_enabled' => 1,
            'is_protected' => 0,
            'sort_order' => 50,
        ],
        [
            'module_key' => 'inventory',
            'label' => 'Inventory',
            'phase' => 'mvp',
            'is_enabled' => 1,
            'is_protected' => 0,
            'sort_order' => 60,
        ],
    ];
}

function app_module_dependency_map(): array
{
    return [
        'production' => ['inventory'],
    ];
}

function app_module_registry_row_to_response(array $row): array
{
    $moduleId = (string)($row['module_key'] ?? '');
    $dependencyMap = app_module_dependency_map();

    return [
        'id' => $moduleId,
        'label' => (string)($row['label'] ?? ''),
        'enabled' => ((int)($row['is_enabled'] ?? 0)) === 1,
        'phase' => (string)($row['phase'] ?? 'active'),
        'isProtected' => ((int)($row['is_protected'] ?? 0)) === 1,
        'dependsOn' => array_values($dependencyMap[$moduleId] ?? []),
        'sortOrder' => (int)($row['sort_order'] ?? 100),
        'updatedAt' => (string)($row['updated_at'] ?? ''),
        'updatedByUserId' => $row['updated_by_user_id'] !== null ? (string)$row['updated_by_user_id'] : null,
    ];
}

function app_module_registry_seed_fallback(): array
{
    return array_map('app_module_registry_row_to_response', app_module_registry_seed_rows());
}

function app_ensure_module_registry_table(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    app_ensure_users_table($pdo);

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS module_registry (
            module_key VARCHAR(64) NOT NULL,
            label VARCHAR(120) NOT NULL,
            phase VARCHAR(40) NOT NULL DEFAULT 'active',
            is_enabled TINYINT(1) NOT NULL DEFAULT 1,
            is_protected TINYINT(1) NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 100,
            updated_by_user_id INT UNSIGNED NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (module_key),
            KEY idx_module_registry_enabled (is_enabled),
            KEY idx_module_registry_sort (sort_order),
            CONSTRAINT fk_module_registry_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $seedStmt = $pdo->prepare(
        'INSERT INTO module_registry (module_key, label, phase, is_enabled, is_protected, sort_order)
         VALUES (:module_key, :label, :phase, :is_enabled, :is_protected, :sort_order)
         ON DUPLICATE KEY UPDATE
            label = VALUES(label),
            phase = VALUES(phase),
            is_protected = VALUES(is_protected),
            sort_order = VALUES(sort_order)'
    );

    foreach (app_module_registry_seed_rows() as $seed) {
        $seedStmt->execute($seed);
    }
}

function app_module_registry(?PDO $pdo = null): array
{
    if ($pdo === null) {
        return app_module_registry_seed_fallback();
    }

    try {
        app_ensure_module_registry_table($pdo);
        $stmt = $pdo->query(
            'SELECT module_key, label, phase, is_enabled, is_protected, sort_order, updated_at, updated_by_user_id
             FROM module_registry
             ORDER BY sort_order ASC, module_key ASC'
        );
        $rows = $stmt ? $stmt->fetchAll() : [];
        if (!is_array($rows) || $rows === []) {
            return app_module_registry_seed_fallback();
        }

        return array_map('app_module_registry_row_to_response', $rows);
    } catch (Throwable $e) {
        return app_module_registry_seed_fallback();
    }
}

function app_module_registry_enabled_map(array $modules): array
{
    $map = [];
    foreach ($modules as $module) {
        if (!is_array($module)) {
            continue;
        }
        $id = trim((string)($module['id'] ?? ''));
        if ($id === '') {
            continue;
        }
        $map[$id] = (bool)($module['enabled'] ?? false);
    }
    return $map;
}

function app_module_registry_find(PDO $pdo, string $moduleKey): ?array
{
    $moduleId = trim($moduleKey);
    if ($moduleId === '') {
        return null;
    }

    $modules = app_module_registry($pdo);
    foreach ($modules as $module) {
        if (!is_array($module)) {
            continue;
        }
        if ((string)($module['id'] ?? '') === $moduleId) {
            return $module;
        }
    }

    return null;
}

function app_is_module_enabled(PDO $pdo, string $moduleKey): bool
{
    $module = app_module_registry_find($pdo, $moduleKey);
    if ($module === null) {
        return true;
    }

    return (bool)($module['enabled'] ?? false);
}

function app_require_module_enabled(PDO $pdo, string $moduleKey): void
{
    if (app_is_module_enabled($pdo, $moduleKey)) {
        return;
    }

    app_json([
        'success' => false,
        'error' => 'Module is disabled.',
        'code' => 'module_disabled',
        'module' => $moduleKey,
    ], 403);
}

function app_module_registry_update_enabled(PDO $pdo, string $moduleKey, bool $enabled, ?array $actor = null): array
{
    app_ensure_module_registry_table($pdo);
    $moduleId = trim($moduleKey);
    if ($moduleId === '') {
        return [
            'success' => false,
            'status' => 400,
            'error' => 'moduleId is required.',
            'code' => 'module_id_required',
        ];
    }

    $modules = app_module_registry($pdo);
    $moduleById = [];
    foreach ($modules as $module) {
        if (!is_array($module)) {
            continue;
        }
        $id = (string)($module['id'] ?? '');
        if ($id === '') {
            continue;
        }
        $moduleById[$id] = $module;
    }

    $current = $moduleById[$moduleId] ?? null;
    if ($current === null) {
        return [
            'success' => false,
            'status' => 404,
            'error' => 'Module not found.',
            'code' => 'module_not_found',
        ];
    }

    if (!$enabled && (bool)($current['isProtected'] ?? false)) {
        return [
            'success' => false,
            'status' => 409,
            'error' => 'Protected modules cannot be disabled.',
            'code' => 'module_protected',
            'module' => $moduleId,
        ];
    }

    if (!$enabled) {
        foreach (app_module_dependency_map() as $dependentModule => $dependencies) {
            if (!in_array($moduleId, $dependencies, true)) {
                continue;
            }

            $dependentEnabled = (bool)($moduleById[$dependentModule]['enabled'] ?? false);
            if ($dependentEnabled) {
                return [
                    'success' => false,
                    'status' => 409,
                    'error' => 'Cannot disable module because an active dependent module requires it.',
                    'code' => 'module_dependency_blocked',
                    'module' => $moduleId,
                    'dependentModule' => $dependentModule,
                ];
            }
        }
    }

    $currentEnabled = (bool)($current['enabled'] ?? false);
    if ($currentEnabled !== $enabled) {
        $stmt = $pdo->prepare(
            'UPDATE module_registry
             SET is_enabled = :is_enabled,
                 updated_by_user_id = :updated_by_user_id,
                 updated_at = CURRENT_TIMESTAMP
             WHERE module_key = :module_key'
        );
        $stmt->execute([
            'is_enabled' => $enabled ? 1 : 0,
            'updated_by_user_id' => isset($actor['id']) && (string)$actor['id'] !== '' ? (int)$actor['id'] : null,
            'module_key' => $moduleId,
        ]);

        app_audit_log(
            $pdo,
            'kernel.module_registry.updated',
            'module_registry',
            $moduleId,
            [
                'moduleId' => $moduleId,
                'enabled' => $enabled,
            ],
            $actor
        );
    }

    $updated = app_module_registry_find($pdo, $moduleId);
    if ($updated === null) {
        $updated = array_merge($current, ['enabled' => $enabled]);
    }

    return [
        'success' => true,
        'module' => $updated,
    ];
}

function app_permission_definitions(): array
{
    return [
        ['key' => 'sales.orders.read', 'module' => 'sales', 'label' => 'مشاهده سفارش‌ها'],
        ['key' => 'sales.orders.create', 'module' => 'sales', 'label' => 'ایجاد سفارش'],
        ['key' => 'sales.orders.update', 'module' => 'sales', 'label' => 'ویرایش سفارش'],
        ['key' => 'sales.orders.status', 'module' => 'sales', 'label' => 'تغییر وضعیت سفارش'],
        ['key' => 'sales.orders.delete', 'module' => 'sales', 'label' => 'حذف سفارش بایگانی‌شده'],
        ['key' => 'sales.orders.release', 'module' => 'sales', 'label' => 'ارسال سطرها به تولید'],
        ['key' => 'master_data.catalog.read', 'module' => 'master-data', 'label' => 'مشاهده لیست قیمت'],
        ['key' => 'master_data.catalog.write', 'module' => 'master-data', 'label' => 'ویرایش لیست قیمت'],
        ['key' => 'production.work_orders.read', 'module' => 'production', 'label' => 'مشاهده برگه کار تولید'],
        ['key' => 'production.work_orders.write', 'module' => 'production', 'label' => 'به‌روزرسانی برگه کار تولید و لیبل'],
        ['key' => 'inventory.stock.read', 'module' => 'inventory', 'label' => 'مشاهده موجودی'],
        ['key' => 'inventory.stock.write', 'module' => 'inventory', 'label' => 'ثبت ویرایش موجودی'],
        ['key' => 'users_access.users.read', 'module' => 'users-access', 'label' => 'مشاهده کاربران'],
        ['key' => 'users_access.users.write', 'module' => 'users-access', 'label' => 'مدیریت کاربران و جدول دسترسی'],
        ['key' => 'kernel.audit.read', 'module' => 'kernel', 'label' => 'مشاهده لاگ ممیزی'],
        ['key' => 'profile.read', 'module' => 'master-data', 'label' => 'مشاهده پروفایل کسب‌وکار'],
        ['key' => 'profile.write', 'module' => 'master-data', 'label' => 'ویرایش پروفایل کسب‌وکار'],
    ];
}

function app_kernel_control_permissions(): array
{
    return ['kernel.module_registry.write'];
}

function app_permissions_without_kernel_control(array $permissions): array
{
    $reserved = array_fill_keys(app_kernel_control_permissions(), true);
    $normalized = [];

    foreach ($permissions as $permission) {
        $key = trim((string)$permission);
        if ($key === '' || isset($reserved[$key])) {
            continue;
        }
        $normalized[$key] = true;
    }

    return array_values(array_keys($normalized));
}

function app_permission_catalog(): array
{
    $keys = [];
    foreach (app_permission_definitions() as $definition) {
        $key = trim((string)($definition['key'] ?? ''));
        if ($key === '') {
            continue;
        }
        $keys[$key] = true;
    }

    return array_values(array_keys($keys));
}

function app_default_role_permissions_matrix(): array
{
    $all = app_permission_catalog();

    return [
        'admin' => $all,
        'manager' => [
            'sales.orders.read',
            'sales.orders.create',
            'sales.orders.update',
            'sales.orders.status',
            'sales.orders.delete',
            'sales.orders.release',
            'master_data.catalog.read',
            'master_data.catalog.write',
            'production.work_orders.read',
            'production.work_orders.write',
            'inventory.stock.read',
            'inventory.stock.write',
            'users_access.users.read',
            'users_access.users.write',
            'kernel.audit.read',
            'profile.read',
            'profile.write',
        ],
        'sales' => [
            'sales.orders.read',
            'sales.orders.create',
            'sales.orders.update',
            'sales.orders.status',
            'sales.orders.release',
            'master_data.catalog.read',
            'profile.read',
        ],
        'production' => [
            'sales.orders.read',
            'production.work_orders.read',
            'production.work_orders.write',
            'master_data.catalog.read',
            'profile.read',
        ],
        'inventory' => [
            'sales.orders.read',
            'inventory.stock.read',
            'inventory.stock.write',
            'master_data.catalog.read',
            'profile.read',
        ],
    ];
}

function app_normalize_role_permissions_matrix($input): array
{
    $defaults = app_default_role_permissions_matrix();
    if (!is_array($input)) {
        return $defaults;
    }

    $knownPermissions = array_fill_keys(app_permission_catalog(), true);
    $normalized = [];
    foreach (app_user_roles() as $role) {
        $candidate = $input[$role] ?? $defaults[$role] ?? [];
        if (!is_array($candidate)) {
            $candidate = $defaults[$role] ?? [];
        }

        $rolePermissions = [];
        foreach ($candidate as $permission) {
            $key = trim((string)$permission);
            if ($key === '' || !isset($knownPermissions[$key])) {
                continue;
            }
            $rolePermissions[$key] = true;
        }

        $normalized[$role] = array_values(array_keys($rolePermissions));
    }

    return $normalized;
}

function app_read_role_permissions_matrix(PDO $pdo): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $defaults = app_default_role_permissions_matrix();
    try {
        app_ensure_system_settings_table($pdo);
        $stmt = $pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key = :k LIMIT 1');
        $stmt->execute(['k' => 'role_permissions']);
        $row = $stmt->fetch();
        if (!$row || !isset($row['setting_value'])) {
            $cache = $defaults;
            return $cache;
        }

        $decoded = json_decode((string)$row['setting_value'], true);
        $cache = app_normalize_role_permissions_matrix($decoded);
        return $cache;
    } catch (Throwable $e) {
        $cache = $defaults;
        return $cache;
    }
}

function app_save_role_permissions_matrix(PDO $pdo, $input): array
{
    $normalized = app_normalize_role_permissions_matrix($input);
    $encoded = json_encode($normalized, JSON_UNESCAPED_UNICODE);
    if ($encoded === false) {
        throw new RuntimeException('Unable to serialize role permissions matrix.');
    }

    app_ensure_system_settings_table($pdo);
    $stmt = $pdo->prepare(
        'INSERT INTO system_settings (setting_key, setting_value)
         VALUES (:key, :value)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP'
    );
    $stmt->execute([
        'key' => 'role_permissions',
        'value' => $encoded,
    ]);

    return $normalized;
}

function app_role_permissions(string $role, ?PDO $pdo = null): array
{
    $normalizedRole = trim($role);
    if (!app_is_valid_user_role($normalizedRole)) {
        return [];
    }

    $matrix = $pdo !== null ? app_read_role_permissions_matrix($pdo) : app_default_role_permissions_matrix();
    $permissions = $matrix[$normalizedRole] ?? [];
    if (!is_array($permissions)) {
        return [];
    }

    return array_values($permissions);
}

function app_user_permissions(?array $user, ?PDO $pdo = null): array
{
    if ($user === null) {
        return [];
    }

    return app_role_permissions((string)($user['role'] ?? ''), $pdo);
}

function app_user_has_permission(?array $user, string $permission, ?PDO $pdo = null): bool
{
    $permissionKey = trim($permission);
    if ($permissionKey === '') {
        return false;
    }

    return in_array($permissionKey, app_user_permissions($user, $pdo), true);
}

function app_require_permission(string $permission, ?PDO $pdo = null): array
{
    $user = app_require_auth();
    if (!app_user_has_permission($user, $permission, $pdo)) {
        app_json([
            'success' => false,
            'error' => 'Access denied.',
        ], 403);
    }

    return $user;
}

function app_require_any_permission(array $permissions, ?PDO $pdo = null): array
{
    $user = app_require_auth();
    foreach ($permissions as $permission) {
        if (!is_string($permission)) {
            continue;
        }
        if (app_user_has_permission($user, $permission, $pdo)) {
            return $user;
        }
    }

    app_json([
        'success' => false,
        'error' => 'Access denied.',
    ], 403);
}

function app_module_capabilities(?string $role, ?array $modules = null, ?PDO $pdo = null): array
{
    $permissions = app_permissions_without_kernel_control(app_role_permissions((string)$role, $pdo));
    $capabilities = [
        'canAccessDashboard' => in_array('sales.orders.read', $permissions, true),
        'canManageOrders' => in_array('sales.orders.read', $permissions, true),
        'canManageCatalog' => in_array('master_data.catalog.write', $permissions, true),
        'canManageUsers' => in_array('users_access.users.write', $permissions, true),
        'canUseProduction' => in_array('production.work_orders.read', $permissions, true),
        'canUseInventory' => in_array('inventory.stock.read', $permissions, true),
        'canViewAuditLogs' => in_array('kernel.audit.read', $permissions, true),
        'canManageProfile' => in_array('profile.write', $permissions, true),
        'canManageSystemSettings' => false,
    ];

    if (!is_array($modules)) {
        return $capabilities;
    }

    $enabledMap = app_module_registry_enabled_map($modules);
    $salesEnabled = $enabledMap['sales'] ?? true;
    $masterDataEnabled = $enabledMap['master-data'] ?? true;
    $productionEnabled = $enabledMap['production'] ?? true;
    $inventoryEnabled = $enabledMap['inventory'] ?? true;
    $usersAccessEnabled = $enabledMap['users-access'] ?? true;

    $capabilities['canAccessDashboard'] = $capabilities['canAccessDashboard'] && $salesEnabled;
    $capabilities['canManageOrders'] = $capabilities['canManageOrders'] && $salesEnabled;
    $capabilities['canManageCatalog'] = $capabilities['canManageCatalog'] && $masterDataEnabled;
    $capabilities['canManageProfile'] = $capabilities['canManageProfile'] && $masterDataEnabled;
    $capabilities['canUseProduction'] = $capabilities['canUseProduction'] && $productionEnabled;
    $capabilities['canUseInventory'] = $capabilities['canUseInventory'] && $inventoryEnabled;
    $capabilities['canManageUsers'] = $capabilities['canManageUsers'] && $usersAccessEnabled;

    return $capabilities;
}

function app_is_valid_user_role(string $role): bool
{
    return in_array($role, app_user_roles(), true);
}

function app_ensure_users_table(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS users (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            username VARCHAR(64) NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin','manager','sales','production','inventory') NOT NULL DEFAULT 'manager',
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_users_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'is_active'");
        if (!$stmt || !$stmt->fetch()) {
            $pdo->exec("ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role");
        }
    } catch (Throwable $e) {
        // Preserve runtime compatibility even if alter is not permitted.
    }

    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'");
        $row = $stmt ? $stmt->fetch() : null;
        $type = strtolower((string)($row['Type'] ?? ''));
        if ($type !== '' && !str_contains($type, "'sales'")) {
            $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('admin','manager','sales','production','inventory') NOT NULL DEFAULT 'manager'");
        }
    } catch (Throwable $e) {
        // Preserve runtime compatibility even if alter is not permitted.
    }
}

function app_users_is_active_column(PDO $pdo): bool
{
    static $detected = null;
    if ($detected !== null) {
        return $detected;
    }

    try {
        app_ensure_users_table($pdo);
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'is_active'");
        if ($stmt && $stmt->fetch()) {
            $detected = true;
            return $detected;
        }
    } catch (Throwable $e) {
        // Fall through to queryable check.
    }

    $detected = app_column_is_queryable($pdo, 'users', 'is_active');
    return $detected;
}

function app_profile_defaults(): array
{
    return [
        'brandName' => 'Sitra',
        'panelSubtitle' => 'پنل مدیریت سفارش',
        'invoiceTitleCustomer' => 'پیش‌فاکتور رسمی سفارش',
        'invoiceTitleFactory' => 'برگه سفارش تولید (نسخه کارخانه)',
        'logoPath' => '',
        'logoOriginalName' => '',
        'address' => 'مشهد، خین‌عرب، بین طرح چی 11 و 13، پرهام',
        'phones' => '۰۹۰۴۷۰۷۹۸۶۹ - ۰۹۱۵۸۷۸۸۸۴۶',
    ];
}

function app_normalize_profile($profile): array
{
    $defaults = app_profile_defaults();
    $source = is_array($profile) ? $profile : [];

    $brandName = trim((string)($source['brandName'] ?? $defaults['brandName']));
    $panelSubtitle = trim((string)($source['panelSubtitle'] ?? $defaults['panelSubtitle']));
    $invoiceTitleCustomer = trim((string)($source['invoiceTitleCustomer'] ?? $defaults['invoiceTitleCustomer']));
    $invoiceTitleFactory = trim((string)($source['invoiceTitleFactory'] ?? $defaults['invoiceTitleFactory']));
    $logoPath = trim((string)($source['logoPath'] ?? ''));
    $logoOriginalName = trim((string)($source['logoOriginalName'] ?? ''));
    $address = trim((string)($source['address'] ?? $defaults['address']));
    $phones = trim((string)($source['phones'] ?? $defaults['phones']));

    return [
        'brandName' => $brandName !== '' ? $brandName : $defaults['brandName'],
        'panelSubtitle' => $panelSubtitle !== '' ? $panelSubtitle : $defaults['panelSubtitle'],
        'invoiceTitleCustomer' => $invoiceTitleCustomer !== '' ? $invoiceTitleCustomer : $defaults['invoiceTitleCustomer'],
        'invoiceTitleFactory' => $invoiceTitleFactory !== '' ? $invoiceTitleFactory : $defaults['invoiceTitleFactory'],
        'logoPath' => $logoPath,
        'logoOriginalName' => $logoOriginalName,
        'address' => $address !== '' ? $address : $defaults['address'],
        'phones' => $phones !== '' ? $phones : $defaults['phones'],
    ];
}

function app_read_profile(PDO $pdo): array
{
    try {
        app_ensure_system_settings_table($pdo);
        $stmt = $pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key = :k LIMIT 1');
        $stmt->execute(['k' => 'profile']);
        $row = $stmt->fetch();
    } catch (Throwable $e) {
        return app_profile_defaults();
    }

    if (!$row || !isset($row['setting_value'])) {
        return app_profile_defaults();
    }

    $decoded = json_decode((string)$row['setting_value'], true);
    return app_normalize_profile($decoded);
}

function app_save_profile(PDO $pdo, array $profile): array
{
    $normalized = app_normalize_profile($profile);
    $profileJson = json_encode($normalized, JSON_UNESCAPED_UNICODE);
    if ($profileJson === false) {
        throw new RuntimeException('Profile serialization failed.');
    }

    app_ensure_system_settings_table($pdo);
    $stmt = $pdo->prepare('INSERT INTO system_settings (setting_key, setting_value) VALUES (:key, :value) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP');
    $stmt->execute([
        'key' => 'profile',
        'value' => $profileJson,
    ]);

    return $normalized;
}


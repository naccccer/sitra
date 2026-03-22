<?php
declare(strict_types=1);

/**
 * Migration: drop the order_meta_json column from the orders table.
 *
 * Prerequisites (all must be true before running):
 *   1. All orders have been backfilled:
 *        php scripts/backfill-order-financials.php
 *   2. JSON fallback is disabled in .env:
 *        APP_ORDER_JSON_FALLBACK=0
 *   3. API has been redeployed with the write-removal commits so that
 *      no new order_meta_json values are being written.
 *
 * This script is safe to run multiple times (column-existence guard).
 * It does NOT modify code — remove the deprecated PHP functions manually
 * after the column has been dropped in all environments:
 *   - app_detect_orders_meta_column()  schema.php
 *   - app_orders_meta_column()         schema.php
 *   - $metaSelect logic                schema.php → app_orders_select_fields()
 *   - JSON fallback branch             orders_domain.php → app_order_from_row()
 *   - app_backfill_order_financials_from_json()  order_financials_repository.php
 *   - scripts/backfill-order-financials.php
 *
 * Usage: php scripts/drop-order-meta-json-column.php [--dry-run]
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from CLI.\n");
    exit(1);
}

$dryRun = in_array('--dry-run', $argv, true);

require_once __DIR__ . '/../config/db.php';

/** @var PDO $pdo */
if ($pdo === null) {
    fwrite(STDERR, "Database connection failed.\n");
    exit(1);
}

fwrite(STDOUT, "=== drop-order-meta-json-column.php ===\n");
fwrite(STDOUT, sprintf("Dry run: %s\n\n", $dryRun ? 'YES' : 'no'));

// ── Pre-flight checks ─────────────────────────────────────────────────────────

// 1. Column must exist
$columnExists = false;
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM orders LIKE 'order_meta_json'");
    $columnExists = $stmt && $stmt->fetch() !== false;
} catch (Throwable $e) {
    fwrite(STDERR, "Failed to inspect orders table: " . $e->getMessage() . "\n");
    exit(1);
}

if (!$columnExists) {
    fwrite(STDOUT, "Column order_meta_json does not exist — nothing to do.\n");
    exit(0);
}

fwrite(STDOUT, "Column order_meta_json exists.\n");

// 2. Verify order_financials and order_payments tables exist
$financialsExists = false;
$paymentsExists = false;
try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'order_financials'");
    $financialsExists = $stmt && $stmt->fetch() !== false;
    $stmt = $pdo->query("SHOW TABLES LIKE 'order_payments'");
    $paymentsExists = $stmt && $stmt->fetch() !== false;
} catch (Throwable $e) {
    fwrite(STDERR, "Failed to check structured tables: " . $e->getMessage() . "\n");
    exit(1);
}

if (!$financialsExists || !$paymentsExists) {
    fwrite(STDERR, "ABORT: structured tables not found (order_financials=%s, order_payments=%s).\n",
        $financialsExists ? 'yes' : 'NO',
        $paymentsExists ? 'yes' : 'NO'
    );
    fwrite(STDERR, "Run php scripts/backfill-order-financials.php first.\n");
    exit(1);
}

// 3. Count orders that have JSON but no structured row
$orphanCount = (int)$pdo->query(
    "SELECT COUNT(*) FROM orders o
     WHERE o.order_meta_json IS NOT NULL
       AND o.order_meta_json != ''
       AND o.order_meta_json != 'null'
       AND NOT EXISTS (SELECT 1 FROM order_financials ofi WHERE ofi.order_id = o.id)"
)->fetchColumn();

if ($orphanCount > 0) {
    fwrite(STDERR, sprintf(
        "ABORT: %d order(s) have order_meta_json data but no row in order_financials.\n",
        $orphanCount
    ));
    fwrite(STDERR, "Run php scripts/backfill-order-financials.php first.\n");
    exit(1);
}

// 4. Verify APP_ORDER_JSON_FALLBACK is disabled
$fallbackEnv = getenv('APP_ORDER_JSON_FALLBACK');
if ($fallbackEnv === false || ($fallbackEnv !== '0' && strtolower($fallbackEnv) !== 'false')) {
    fwrite(STDERR, "ABORT: APP_ORDER_JSON_FALLBACK is not set to 0.\n");
    fwrite(STDERR, "Set APP_ORDER_JSON_FALLBACK=0 in .env before dropping the column.\n");
    exit(1);
}

// 5. Summary
$totalOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn();
$totalFinancials = (int)$pdo->query("SELECT COUNT(*) FROM order_financials")->fetchColumn();
$nonNullJson = (int)$pdo->query(
    "SELECT COUNT(*) FROM orders WHERE order_meta_json IS NOT NULL AND order_meta_json != '' AND order_meta_json != 'null'"
)->fetchColumn();

fwrite(STDOUT, sprintf("Total orders:             %d\n", $totalOrders));
fwrite(STDOUT, sprintf("order_financials rows:    %d\n", $totalFinancials));
fwrite(STDOUT, sprintf("Orders with non-null JSON:%d (will be silently discarded)\n", $nonNullJson));
fwrite(STDOUT, sprintf("Orphan orders (no table): %d\n", $orphanCount));
fwrite(STDOUT, "APP_ORDER_JSON_FALLBACK:  0 (confirmed)\n\n");

fwrite(STDOUT, "All pre-flight checks passed.\n\n");

// ── Execute ───────────────────────────────────────────────────────────────────

if ($dryRun) {
    fwrite(STDOUT, "DRY RUN — would execute:\n");
    fwrite(STDOUT, "  ALTER TABLE orders DROP COLUMN order_meta_json;\n");
    fwrite(STDOUT, "\nRe-run without --dry-run to apply.\n");
    exit(0);
}

fwrite(STDOUT, "Dropping column order_meta_json from orders table...\n");

try {
    $pdo->exec("ALTER TABLE orders DROP COLUMN order_meta_json");
} catch (Throwable $e) {
    fwrite(STDERR, "FAILED: " . $e->getMessage() . "\n");
    exit(1);
}

// Verify
$stillExists = false;
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM orders LIKE 'order_meta_json'");
    $stillExists = $stmt && $stmt->fetch() !== false;
} catch (Throwable $e) {
    // ignore
}

if ($stillExists) {
    fwrite(STDERR, "ERROR: Column still present after ALTER TABLE.\n");
    exit(1);
}

fwrite(STDOUT, "Column dropped successfully.\n\n");
fwrite(STDOUT, "=== Next steps (code cleanup) ===\n");
fwrite(STDOUT, "The following dead code can now be removed:\n");
fwrite(STDOUT, "  - app_detect_orders_meta_column()         api/common/schema.php\n");
fwrite(STDOUT, "  - app_orders_meta_column()                api/common/schema.php\n");
fwrite(STDOUT, "  - \$metaSelect logic                      api/common/schema.php → app_orders_select_fields()\n");
fwrite(STDOUT, "  - JSON fallback branch (lines ~203-256)   api/common/orders_domain.php → app_order_from_row()\n");
fwrite(STDOUT, "  - app_order_json_fallback_enabled()       api/common/orders_domain.php\n");
fwrite(STDOUT, "  - app_backfill_order_financials_from_json() api/modules/sales/order_financials_repository.php\n");
fwrite(STDOUT, "  - scripts/backfill-order-financials.php\n");
fwrite(STDOUT, "  - scripts/drop-order-meta-json-column.php (this file)\n");
fwrite(STDOUT, "  - DEPRECATED comment in database/schema.sql\n");

exit(0);

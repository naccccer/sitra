<?php
declare(strict_types=1);

/**
 * Backfill order_financials and order_payments from order_meta_json.
 *
 * Safe to run multiple times (upsert semantics).
 * After successful backfill, APP_ORDER_JSON_FALLBACK should be set to 0 in .env.
 *
 * Usage: php scripts/backfill-order-financials.php [--dry-run] [--batch=500] [--sample=10]
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from CLI.\n");
    exit(1);
}

$dryRun = in_array('--dry-run', $argv, true);
$batchSize = 500;
$sampleSize = 10;

foreach ($argv as $arg) {
    if (str_starts_with($arg, '--batch=')) {
        $batchSize = max(1, (int)substr($arg, 8));
    }
    if (str_starts_with($arg, '--sample=')) {
        $sampleSize = max(0, (int)substr($arg, 9));
    }
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../api/modules/sales/order_financials_repository.php';

/** @var PDO $pdo */
if ($pdo === null) {
    fwrite(STDERR, "Database connection failed.\n");
    exit(1);
}

// ── Pre-flight: ensure tables exist ──────────────────────────────────────────

app_ensure_order_financials_tables($pdo);

// ── Count scope ───────────────────────────────────────────────────────────────

$totalWithJson = (int)$pdo->query(
    "SELECT COUNT(*) FROM orders
     WHERE order_meta_json IS NOT NULL AND order_meta_json != 'null' AND order_meta_json != ''"
)->fetchColumn();

$alreadyBackfilled = (int)$pdo->query(
    "SELECT COUNT(*) FROM order_financials"
)->fetchColumn();

$pendingCount = (int)$pdo->query(
    "SELECT COUNT(*) FROM orders o
     WHERE o.order_meta_json IS NOT NULL AND o.order_meta_json != 'null' AND o.order_meta_json != ''
       AND NOT EXISTS (SELECT 1 FROM order_financials ofi WHERE ofi.order_id = o.id)"
)->fetchColumn();

fwrite(STDOUT, "=== Order Financials Backfill ===\n");
fwrite(STDOUT, sprintf("Orders with JSON:       %d\n", $totalWithJson));
fwrite(STDOUT, sprintf("Already in tables:      %d\n", $alreadyBackfilled));
fwrite(STDOUT, sprintf("Pending backfill:       %d\n", $pendingCount));
fwrite(STDOUT, sprintf("Batch size:             %d\n", $batchSize));
fwrite(STDOUT, sprintf("Dry run:                %s\n", $dryRun ? 'YES' : 'no'));
fwrite(STDOUT, "\n");

if ($dryRun) {
    fwrite(STDOUT, "DRY RUN — no writes performed.\n");
    fwrite(STDOUT, sprintf("Would process up to %d orders.\n", $totalWithJson));
    exit(0);
}

// ── Run backfill ──────────────────────────────────────────────────────────────

$processed = 0;
$skipped = 0;
$errors = 0;
$offset = 0;

while (true) {
    $stmt = $pdo->prepare(
        "SELECT id, total, order_meta_json FROM orders
         WHERE order_meta_json IS NOT NULL AND order_meta_json != 'null' AND order_meta_json != ''
         ORDER BY id ASC
         LIMIT :limit OFFSET :offset"
    );
    $stmt->bindValue(':limit', $batchSize, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    if (!is_array($rows) || count($rows) === 0) {
        break;
    }

    foreach ($rows as $row) {
        $orderId = (int)$row['id'];
        $metaRaw = (string)$row['order_meta_json'];
        $meta = json_decode($metaRaw, true);

        if (!is_array($meta)) {
            $skipped++;
            continue;
        }

        $financials = is_array($meta['financials'] ?? null) ? $meta['financials'] : [];
        $payments = is_array($meta['payments'] ?? null) ? $meta['payments'] : [];
        $invoiceNotes = (string)($meta['invoiceNotes'] ?? '');

        $baseTotal = max(0, (int)$row['total']);
        $financials = array_merge([
            'subTotal' => $baseTotal,
            'itemDiscountTotal' => 0,
            'invoiceDiscountType' => 'none',
            'invoiceDiscountValue' => 0,
            'invoiceDiscountAmount' => 0,
            'taxEnabled' => false,
            'taxRate' => 10,
            'taxAmount' => 0,
            'grandTotal' => $baseTotal,
        ], $financials);

        try {
            app_upsert_order_financials($pdo, $orderId, $financials, $invoiceNotes);
            app_sync_order_payments($pdo, $orderId, $payments);
            $processed++;
        } catch (Throwable $e) {
            $errors++;
            fwrite(STDERR, sprintf("  ERROR order #%d: %s\n", $orderId, $e->getMessage()));
        }
    }

    $offset += $batchSize;
}

fwrite(STDOUT, sprintf("Backfill complete: %d processed, %d skipped (bad JSON), %d errors\n",
    $processed, $skipped, $errors));

// ── Coverage check ────────────────────────────────────────────────────────────

$afterBackfilled = (int)$pdo->query("SELECT COUNT(*) FROM order_financials")->fetchColumn();
$totalOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn();
$stillMissing = (int)$pdo->query(
    "SELECT COUNT(*) FROM orders o
     WHERE NOT EXISTS (SELECT 1 FROM order_financials ofi WHERE ofi.order_id = o.id)"
)->fetchColumn();

fwrite(STDOUT, "\n=== Coverage ===\n");
fwrite(STDOUT, sprintf("Total orders:           %d\n", $totalOrders));
fwrite(STDOUT, sprintf("order_financials rows:  %d\n", $afterBackfilled));
fwrite(STDOUT, sprintf("Missing (no table row): %d\n", $stillMissing));

if ($stillMissing > 0) {
    fwrite(STDOUT, "  NOTE: orders with no order_meta_json will use default financials.\n");
}

// ── Verification: spot-check a sample ────────────────────────────────────────

if ($sampleSize <= 0) {
    fwrite(STDOUT, "\nSample verification skipped (--sample=0).\n");
} else {
    fwrite(STDOUT, sprintf("\n=== Verification (sample of %d orders) ===\n", $sampleSize));

    $sampleStmt = $pdo->prepare(
        "SELECT o.id, o.total, ofi.grand_total, ofi.sub_total
         FROM orders o
         INNER JOIN order_financials ofi ON ofi.order_id = o.id
         ORDER BY o.id DESC
         LIMIT :limit"
    );
    $sampleStmt->bindValue(':limit', $sampleSize, PDO::PARAM_INT);
    $sampleStmt->execute();
    $sampleRows = $sampleStmt->fetchAll();

    $verifyPass = 0;
    $verifyFail = 0;

    foreach ($sampleRows as $sr) {
        $orderId = (int)$sr['id'];
        $grandTotal = (int)$sr['grand_total'];

        // Sum payments directly from table
        $sumStmt = $pdo->prepare(
            'SELECT COALESCE(SUM(amount), 0) AS paid FROM order_payments WHERE order_id = :order_id'
        );
        $sumStmt->execute(['order_id' => $orderId]);
        $paidTotal = (int)$sumStmt->fetchColumn();

        $expectedDue = max(0, $grandTotal - $paidTotal);

        // Re-derive using canonical function to confirm logic
        $payments = app_read_order_payments($pdo, $orderId);
        $derived = app_compute_payment_derived_fields($grandTotal, $payments);

        $sumMatches = ($derived['paidTotal'] === $paidTotal);
        $dueMatches = ($derived['dueAmount'] === $expectedDue);
        $pass = $sumMatches && $dueMatches;

        if ($pass) {
            $verifyPass++;
            fwrite(STDOUT, sprintf(
                "  order #%-6d  grandTotal=%7d  paidTotal=%7d  dueAmount=%7d  status=%-8s  [PASS]\n",
                $orderId, $grandTotal, $paidTotal, $expectedDue, $derived['paymentStatus']
            ));
        } else {
            $verifyFail++;
            fwrite(STDERR, sprintf(
                "  order #%-6d  FAIL — sumMatches=%s dueMatches=%s  derived=%s/%s  expected=%d/%d\n",
                $orderId,
                $sumMatches ? 'yes' : 'NO',
                $dueMatches ? 'yes' : 'NO',
                $derived['paidTotal'], $derived['dueAmount'],
                $paidTotal, $expectedDue
            ));
        }
    }

    fwrite(STDOUT, sprintf("\nVerification: %d PASS, %d FAIL\n", $verifyPass, $verifyFail));

    if ($verifyFail > 0) {
        fwrite(STDERR, "\nVerification failures detected. Review errors above before disabling JSON fallback.\n");
        exit(2);
    }
}

fwrite(STDOUT, "\n=== Done ===\n");
if ($errors > 0) {
    fwrite(STDOUT, sprintf("WARNING: %d orders failed to backfill. See STDERR for details.\n", $errors));
    exit(1);
}

exit(0);

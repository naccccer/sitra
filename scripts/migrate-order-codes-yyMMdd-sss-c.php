<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from CLI.\n");
    exit(1);
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../api/_common.php';

$checkStmt = $pdo->query("SHOW TABLES LIKE 'orders'");
if (!$checkStmt || !$checkStmt->fetch()) {
    fwrite(STDERR, "Orders table not found.\n");
    exit(1);
}

$outputDir = __DIR__ . '/../storage/migrations';
if (!is_dir($outputDir) && !mkdir($outputDir, 0755, true) && !is_dir($outputDir)) {
    fwrite(STDERR, "Unable to create output directory: {$outputDir}\n");
    exit(1);
}

$stamp = date('Ymd_His');
$finalPath = $outputDir . "/order_code_map_{$stamp}.csv";
$tmpPath = $finalPath . '.tmp';

$csv = fopen($tmpPath, 'wb');
if ($csv === false) {
    fwrite(STDERR, "Unable to open mapping output file: {$tmpPath}\n");
    exit(1);
}

if (fputcsv($csv, ['order_id', 'old_order_code', 'new_order_code', 'migrated_at']) === false) {
    fclose($csv);
    @unlink($tmpPath);
    fwrite(STDERR, "Unable to write CSV header.\n");
    exit(1);
}

$select = $pdo->prepare('SELECT id, order_code, created_at FROM orders ORDER BY created_at ASC, id ASC');
$update = $pdo->prepare('UPDATE orders SET order_code = :order_code WHERE id = :id LIMIT 1');

$sequenceByDay = [];
$migratedCount = 0;
$migratedAt = date('c');

try {
    $pdo->beginTransaction();
    $select->execute();

    while (($row = $select->fetch()) !== false) {
        $orderId = (int)($row['id'] ?? 0);
        if ($orderId <= 0) {
            throw new RuntimeException('Invalid order id encountered during migration.');
        }

        $createdAtRaw = (string)($row['created_at'] ?? '');
        $createdAtTs = strtotime($createdAtRaw);
        if ($createdAtTs === false) {
            throw new RuntimeException("Invalid created_at for order #{$orderId}: {$createdAtRaw}");
        }

        $datePrefix = app_order_code_date_prefix_jalali($createdAtTs);
        $nextSequence = (int)($sequenceByDay[$datePrefix] ?? 0) + 1;
        if ($nextSequence > 999) {
            throw new RuntimeException("Daily capacity exceeded on {$datePrefix}: more than 999 orders.");
        }
        $sequenceByDay[$datePrefix] = $nextSequence;

        $newCode = app_generate_order_code($datePrefix, '', $nextSequence, 3);
        $oldCode = (string)($row['order_code'] ?? '');

        $update->execute([
            'order_code' => $newCode,
            'id' => $orderId,
        ]);

        if (fputcsv($csv, [$orderId, $oldCode, $newCode, $migratedAt]) === false) {
            throw new RuntimeException('Unable to write CSV row.');
        }

        $migratedCount++;
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fclose($csv);
    @unlink($tmpPath);
    fwrite(STDERR, "Migration failed: {$e->getMessage()}\n");
    exit(1);
}

fclose($csv);
if (!rename($tmpPath, $finalPath)) {
    @unlink($tmpPath);
    fwrite(STDERR, "Migration committed but unable to finalize CSV output file.\n");
    exit(1);
}

fwrite(STDOUT, "Order code migration completed.\n");
fwrite(STDOUT, "Rows migrated: {$migratedCount}\n");
fwrite(STDOUT, "Mapping CSV: {$finalPath}\n");

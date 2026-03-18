<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

if (!isset($pdo) || !$pdo instanceof PDO) {
    fwrite(STDERR, "Database connection unavailable.\n");
    exit(1);
}

$fixturePath = __DIR__ . '/../database/fixtures/minimal_fixture.sql';
if (!is_file($fixturePath)) {
    fwrite(STDERR, "Fixture file not found: {$fixturePath}\n");
    exit(1);
}

$sql = file_get_contents($fixturePath);
if ($sql === false) {
    fwrite(STDERR, "Failed to read fixture file.\n");
    exit(1);
}

// Strip BOM if present
$sql = ltrim($sql, "\xEF\xBB\xBF");

// Split on ; and strip -- comment lines from each chunk before executing
$statements = [];
foreach (explode(';', $sql) as $chunk) {
    $lines = array_filter(
        explode("\n", $chunk),
        static fn(string $l) => !str_starts_with(trim($l), '--')
    );
    $statement = trim(implode("\n", $lines));
    if ($statement !== '') {
        $statements[] = $statement;
    }
}

try {
    $pdo->beginTransaction();
    foreach ($statements as $statement) {
        $pdo->exec($statement);
    }
    $pdo->commit();
    fwrite(STDOUT, "Minimal fixture applied successfully.\n");
    exit(0);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "Failed to apply fixture: {$e->getMessage()}\n");
    exit(1);
}

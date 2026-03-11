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

$statements = array_filter(array_map('trim', explode(';', $sql)), static function (string $statement): bool {
    return $statement !== '' && !str_starts_with($statement, '--');
});

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

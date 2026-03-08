<?php
declare(strict_types=1);

/**
 * PHP test runner for Sitra.
 *
 * A lightweight, dependency-free test runner that executes each test file
 * in isolation by spawning a child PHP process. This prevents functions
 * declared in one test file from conflicting with functions in another.
 *
 * Usage:
 *   php tests/php/run.php
 *
 * Exit code:
 *   0 — all tests passed
 *   1 — one or more tests failed or errors occurred
 */

$testFiles = [
    __DIR__ . '/test_permissions.php',
    __DIR__ . '/test_orders_domain.php',
    __DIR__ . '/test_module_registry.php',
];

$totalPassed = 0;
$totalFailed = 0;
$suiteErrors = [];
$startTime = microtime(true);

echo "\n\033[1mSitra PHP Tests\033[0m\n";
echo str_repeat('─', 50) . "\n";

foreach ($testFiles as $file) {
    if (!is_file($file)) {
        echo "\033[33m  SKIP\033[0m {$file} (not found)\n";
        continue;
    }

    $label = basename($file);

    // Run each test file in a child process to avoid function-redeclaration collisions.
    $escapedFile = escapeshellarg($file);
    $output = [];
    $exitCode = 0;
    exec("php {$escapedFile} 2>&1", $output, $exitCode);

    // Parse passed/failed counts from the child's output.
    // The last line of each file is: RESULTS:passed=N,failed=M
    $passed = 0;
    $failed = 0;
    $lines = [];

    foreach ($output as $line) {
        if (str_starts_with($line, 'RESULTS:')) {
            parse_str(substr($line, 8), $parsed);
            $passed = (int)($parsed['passed'] ?? 0);
            $failed = (int)($parsed['failed'] ?? 0);
        } else {
            $lines[] = $line;
        }
    }

    $totalPassed += $passed;
    $totalFailed += $failed;

    // Print the captured output (test names, ✓/✗)
    echo implode("\n", $lines) . "\n";

    if ($exitCode !== 0 && $failed === 0) {
        // Child process crashed
        $totalFailed++;
        $suiteErrors[] = "PHP error in {$label} (exit code {$exitCode})";
        echo "  \033[31m[PHP error — see output above]\033[0m\n";
    }
}

$elapsed = round(microtime(true) - $startTime, 2);

echo "\n" . str_repeat('─', 50) . "\n";

if ($totalFailed === 0 && empty($suiteErrors)) {
    echo "\033[32m✓ All {$totalPassed} tests passed\033[0m  [{$elapsed}s]\n\n";
    exit(0);
} else {
    echo "\033[31m✗ {$totalFailed} failed\033[0m, {$totalPassed} passed  [{$elapsed}s]\n";
    foreach ($suiteErrors as $err) {
        echo "  \033[31m→ {$err}\033[0m\n";
    }
    echo "\n";
    exit(1);
}

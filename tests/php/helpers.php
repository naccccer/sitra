<?php
declare(strict_types=1);

/**
 * Lightweight PHP test helpers — no PHPUnit dependency.
 *
 * Usage:
 *   test_assert(condition, 'description');
 *   test_assert_equals(expected, actual, 'description');
 *   test_assert_true(value, 'description');
 *   test_assert_false(value, 'description');
 *
 * At the end of each test file, call test_summary() to print results.
 * The run.php runner calls test_summary_global() at the very end.
 */

$GLOBALS['_test_results'] = [
    'passed' => 0,
    'failed' => 0,
    'errors' => [],
    'current_suite' => '',
];

function test_suite(string $name): void
{
    $GLOBALS['_test_results']['current_suite'] = $name;
    echo "\n  {$name}\n";
}

function test_assert(bool $condition, string $description): void
{
    $suite = $GLOBALS['_test_results']['current_suite'];
    if ($condition) {
        $GLOBALS['_test_results']['passed']++;
        echo "    \033[32m✓\033[0m {$description}\n";
    } else {
        $GLOBALS['_test_results']['failed']++;
        $msg = "[{$suite}] FAILED: {$description}";
        $GLOBALS['_test_results']['errors'][] = $msg;
        echo "    \033[31m✗\033[0m {$description}\n";
    }
}

function test_assert_equals(mixed $expected, mixed $actual, string $description): void
{
    $condition = $expected === $actual;
    if (!$condition) {
        $exp = json_encode($expected, JSON_UNESCAPED_UNICODE);
        $act = json_encode($actual, JSON_UNESCAPED_UNICODE);
        test_assert(false, "{$description} (expected {$exp}, got {$act})");
        return;
    }
    test_assert(true, $description);
}

function test_assert_true(mixed $value, string $description): void
{
    test_assert($value === true, $description);
}

function test_assert_false(mixed $value, string $description): void
{
    test_assert($value === false, $description);
}

function test_assert_contains(mixed $needle, array $haystack, string $description): void
{
    test_assert(in_array($needle, $haystack, true), $description);
}

function test_assert_not_empty(mixed $value, string $description): void
{
    test_assert(!empty($value), $description);
}

function test_assert_count(int $expected, array $array, string $description): void
{
    test_assert_equals($expected, count($array), $description);
}

function test_summary(): array
{
    return $GLOBALS['_test_results'];
}

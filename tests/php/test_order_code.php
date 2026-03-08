<?php
declare(strict_types=1);

/**
 * Unit tests for order-code generation logic in orders_domain.php.
 *
 * Tests pure functions only — no database required.
 * Covers: Jalali conversion, date prefix, code format, checksum, sequence overflow.
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../../api/common/orders_domain.php';

// ------------------------------------------------------------------
// app_gregorian_to_jalali — known reference dates
// ------------------------------------------------------------------

test_suite('app_gregorian_to_jalali');

// 2024-03-20 → 1403/01/01 (Nowruz)
[$jy, $jm, $jd] = app_gregorian_to_jalali(2024, 3, 20);
test_assert_equals(1403, $jy, '2024-03-20 year → 1403');
test_assert_equals(1,    $jm, '2024-03-20 month → 1');
test_assert_equals(1,    $jd, '2024-03-20 day → 1');

// 2025-01-01 → 1403/10/12
[$jy, $jm, $jd] = app_gregorian_to_jalali(2025, 1, 1);
test_assert_equals(1403, $jy, '2025-01-01 year → 1403');
test_assert_equals(10,   $jm, '2025-01-01 month → 10');
test_assert_equals(12,   $jd, '2025-01-01 day → 12');

// 1990-03-21 → 1369/01/01
[$jy, $jm, $jd] = app_gregorian_to_jalali(1990, 3, 21);
test_assert_equals(1369, $jy, '1990-03-21 year → 1369');
test_assert_equals(1,    $jm, '1990-03-21 month → 1');
test_assert_equals(1,    $jd, '1990-03-21 day → 1');

// ------------------------------------------------------------------
// app_order_code_date_prefix_jalali — format is YYMMDD
// ------------------------------------------------------------------

test_suite('app_order_code_date_prefix_jalali');

// 2024-03-20 = 1403/01/01 → prefix "030101"
// Use mktime to build a stable UTC timestamp regardless of server TZ.
$ts_nowruz = gmmktime(12, 0, 0, 3, 20, 2024);
$prefix = app_order_code_date_prefix_jalali($ts_nowruz);
test_assert(strlen($prefix) === 6, 'prefix is 6 chars');
test_assert(preg_match('/^\d{6}$/', $prefix) === 1, 'prefix is all digits');
// YY=03, MM=01, DD=01
test_assert_equals('030101', $prefix, 'prefix for 2024-03-20 (Nowruz) is 030101');

// ------------------------------------------------------------------
// app_generate_order_code — format YYMMDD-SSS-C
// ------------------------------------------------------------------

test_suite('app_generate_order_code — format');

$ts_nowruz = gmmktime(12, 0, 0, 3, 20, 2024);
$prefix_nowruz = app_order_code_date_prefix_jalali($ts_nowruz);

$code = app_generate_order_code($prefix_nowruz, '00', 1);
test_assert(preg_match('/^\d{6}-\d{3}-\d$/', $code) === 1, 'code matches YYMMDD-SSS-C');

// First segment equals the date prefix
$parts = explode('-', $code);
test_assert_equals(3, count($parts), 'code has 3 dash-separated segments');
test_assert_equals($prefix_nowruz, $parts[0], 'first segment is the date prefix');
test_assert_equals('001', $parts[1], 'sequence 1 pads to 001');

// ------------------------------------------------------------------
// app_generate_order_code — checksum correctness
// ------------------------------------------------------------------

test_suite('app_generate_order_code — checksum');

// Verify checksum for a known fixed prefix to avoid TZ dependency.
// Manually compute: core = "030101001", weights 1..9
// 0*1 + 3*2 + 0*3 + 1*4 + 0*5 + 1*6 + 0*7 + 0*8 + 1*9 = 0+6+0+4+0+6+0+0+9 = 25 → 25%10 = 5
$code_nowruz_1 = app_generate_order_code('030101', '00', 1);
$parts = explode('-', $code_nowruz_1);
test_assert_equals('5', $parts[2], 'checksum for 030101-001 is 5');

// Sequence 2 → core "030101002", sum = 0+6+0+4+0+6+0+0+18 = 34 → 4
$code_nowruz_2 = app_generate_order_code('030101', '00', 2);
$p2 = explode('-', $code_nowruz_2);
test_assert_equals('4', $p2[2], 'checksum for 030101-002 is 4');

// ------------------------------------------------------------------
// app_generate_order_code — sequence bounds
// ------------------------------------------------------------------

test_suite('app_generate_order_code — sequence bounds');

$code_999 = app_generate_order_code('030101', '00', 999);
$p999 = explode('-', $code_999);
test_assert_equals('999', $p999[1], 'sequence 999 is the max allowed');

$threw = false;
try {
    app_generate_order_code('030101', '00', 1000);
} catch (InvalidArgumentException $e) {
    $threw = true;
}
test_assert_true($threw, 'sequence 1000 throws InvalidArgumentException');

$threwNeg = false;
try {
    // sequence ≤ 0 is clamped to 1, not thrown — verify it doesn't crash
    $codeNeg = app_generate_order_code('030101', '00', 0);
    $pNeg = explode('-', $codeNeg);
    test_assert_equals('001', $pNeg[1], 'sequence 0 is clamped to 001');
} catch (Throwable) {
    $threwNeg = true;
}
test_assert_false($threwNeg, 'sequence 0 does not throw (clamped to 1)');

// ------------------------------------------------------------------
// app_generate_order_code — backward-compat int signature
// ------------------------------------------------------------------

test_suite('app_generate_order_code — legacy int signature');

$codeInt = app_generate_order_code(42);
$pInt = explode('-', $codeInt);
test_assert(preg_match('/^\d{6}$/', $pInt[0]) === 1, 'legacy int: date segment is 6 digits');
test_assert_equals('042', $pInt[1], 'legacy int 42 → sequence 042');

// ------------------------------------------------------------------
// Summary (runner reads RESULTS: line)
// ------------------------------------------------------------------

$r = test_summary();
echo "\nRESULTS:passed={$r['passed']},failed={$r['failed']}\n";

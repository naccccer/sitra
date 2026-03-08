<?php
declare(strict_types=1);

/**
 * Unit tests for api/common/orders_domain.php
 *
 * Tests pure functions only — no database required.
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../../api/common/orders_domain.php';

// ------------------------------------------------------------------
// app_valid_order_status
// ------------------------------------------------------------------

test_suite('app_valid_order_status');

test_assert_true(app_valid_order_status('pending'), 'pending is valid');
test_assert_true(app_valid_order_status('processing'), 'processing is valid');
test_assert_true(app_valid_order_status('delivered'), 'delivered is valid');
test_assert_true(app_valid_order_status('archived'), 'archived is valid');
test_assert_false(app_valid_order_status('draft'), 'draft is not valid');
test_assert_false(app_valid_order_status(''), 'empty string is not valid');
test_assert_false(app_valid_order_status('PENDING'), 'status check is case-sensitive');

// ------------------------------------------------------------------
// app_payment_method_defaults
// ------------------------------------------------------------------

test_suite('app_payment_method_defaults');

$methods = app_payment_method_defaults();
test_assert(is_array($methods), 'returns array');
test_assert_contains('card', $methods, 'includes card');
test_assert_contains('check', $methods, 'includes check');
test_assert_contains('cash', $methods, 'includes cash');
test_assert_contains('other', $methods, 'includes other');

// ------------------------------------------------------------------
// app_normalize_payment_method
// ------------------------------------------------------------------

test_suite('app_normalize_payment_method');

test_assert_equals('cash', app_normalize_payment_method(''), 'empty string → cash');
test_assert_equals('cash', app_normalize_payment_method('  '), 'whitespace → cash');
test_assert_equals('cash', app_normalize_payment_method('cash'), 'cash → cash');
test_assert_equals('card', app_normalize_payment_method('card'), 'card → card');
test_assert_equals('card', app_normalize_payment_method('transfer'), 'transfer → card');
test_assert_equals('check', app_normalize_payment_method('check'), 'check → check');
test_assert_equals('check', app_normalize_payment_method('cheque'), 'cheque → check');
test_assert_equals('other', app_normalize_payment_method('other'), 'other → other');
test_assert_equals('other', app_normalize_payment_method('unknown-method'), 'unknown → other');
// Persian aliases
test_assert_equals('card', app_normalize_payment_method('کارت به کارت'), 'کارت به کارت → card');
test_assert_equals('check', app_normalize_payment_method('چک'), 'چک → check');
test_assert_equals('cash', app_normalize_payment_method('نقد'), 'نقد → cash');
test_assert_equals('other', app_normalize_payment_method('سایر'), 'سایر → other');

// ------------------------------------------------------------------
// app_gregorian_to_jalali
// ------------------------------------------------------------------

test_suite('app_gregorian_to_jalali');

// Known conversions verified against established Jalali converters
// 2024-01-01 → 1402-10-11
[$jy, $jm, $jd] = app_gregorian_to_jalali(2024, 1, 1);
test_assert_equals(1402, $jy, '2024-01-01 → year 1402');
test_assert_equals(10, $jm, '2024-01-01 → month 10 (Dey)');
test_assert_equals(11, $jd, '2024-01-01 → day 11');

// 2024-03-20 → 1403-01-01 (Nowruz)
[$jy, $jm, $jd] = app_gregorian_to_jalali(2024, 3, 20);
test_assert_equals(1403, $jy, '2024-03-20 → year 1403');
test_assert_equals(1, $jm, '2024-03-20 → month 1 (Farvardin)');
test_assert_equals(1, $jd, '2024-03-20 → day 1 (Nowruz)');

// 2024-12-31 → 1403-10-11
[$jy, $jm, $jd] = app_gregorian_to_jalali(2024, 12, 31);
test_assert_equals(1403, $jy, '2024-12-31 → year 1403');
test_assert_equals(10, $jm, '2024-12-31 → month 10');
test_assert_equals(11, $jd, '2024-12-31 → day 11');

// ------------------------------------------------------------------
// app_generate_order_code
// ------------------------------------------------------------------

test_suite('app_generate_order_code');

// Known date prefix — use a fixed Jalali date string
$code = app_generate_order_code('030101', '00', 1);
// Format: YYMMDD-SSS-C
test_assert(
    preg_match('/^\d{6}-\d{3}-\d$/', $code) === 1,
    "order code matches pattern YYMMDD-SSS-C (got: {$code})"
);
test_assert(str_starts_with($code, '030101-'), "order code starts with date prefix (got: {$code})");
test_assert(str_ends_with($code, '-' . substr($code, -1)), 'order code ends with checksum digit');

// Sequence 1 gives 001 in the middle
$code1 = app_generate_order_code('030101', '00', 1);
test_assert(str_contains($code1, '-001-'), "sequence 1 produces -001- (got: {$code1})");

// Sequence 42 gives 042
$code42 = app_generate_order_code('030101', '00', 42);
test_assert(str_contains($code42, '-042-'), "sequence 42 produces -042- (got: {$code42})");

// Sequence > 999 throws
$threw = false;
try {
    app_generate_order_code('030101', '00', 1000);
} catch (InvalidArgumentException $e) {
    $threw = true;
}
test_assert_true($threw, 'sequence > 999 throws InvalidArgumentException');

// Backward-compat: first arg as int is treated as sequence
$legacyCode = app_generate_order_code(5);
test_assert(
    preg_match('/^\d{6}-005-\d$/', $legacyCode) === 1,
    "legacy integer first arg treated as sequence (got: {$legacyCode})"
);

// Checksum is deterministic
$code_a = app_generate_order_code('030101', '00', 7);
$code_b = app_generate_order_code('030101', '00', 7);
test_assert_equals($code_a, $code_b, 'same inputs produce same order code');

// ------------------------------------------------------------------
// app_normalize_payment_receipt
// ------------------------------------------------------------------

test_suite('app_normalize_payment_receipt');

// Valid receipt requires a non-empty filePath
$receipt = app_normalize_payment_receipt([
    'filePath' => '/uploads/receipt.jpg',
    'originalName' => 'receipt.jpg',
    'mimeType' => 'image/jpeg',
    'size' => 2048,
]);
test_assert(is_array($receipt), 'valid input with filePath returns array');
test_assert_equals('/uploads/receipt.jpg', $receipt['filePath'], 'filePath preserved');
test_assert_equals('receipt.jpg', $receipt['originalName'], 'originalName preserved');
test_assert_equals(2048, $receipt['size'], 'size preserved');

// Missing/empty filePath → null
test_assert(app_normalize_payment_receipt(['originalName' => 'f.jpg']) === null, 'missing filePath returns null');
test_assert(app_normalize_payment_receipt(['filePath' => '']) === null, 'empty filePath returns null');

// Non-array → null
test_assert(app_normalize_payment_receipt(null) === null, 'null returns null');
test_assert(app_normalize_payment_receipt('string') === null, 'string returns null');

// Negative size is clamped to 0
$receipt2 = app_normalize_payment_receipt(['filePath' => '/x.jpg', 'size' => -5]);
test_assert_equals(0, $receipt2['size'], 'negative size clamped to 0');

// Print machine-readable summary for the runner
$r = test_summary();
echo "RESULTS:passed={$r['passed']},failed={$r['failed']}\n";
exit($r['failed'] > 0 ? 1 : 0);

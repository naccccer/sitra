<?php
declare(strict_types=1);

/**
 * Contract-level checks for the accounting payroll feature.
 *
 * These assertions stay lightweight: they validate the static docs and
 * JSON Schemas without requiring a database fixture.
 */

require_once __DIR__ . '/helpers.php';

function read_text_file(string $path): string
{
    $contents = file_get_contents($path);
    test_assert($contents !== false, "can read {$path}");
    return $contents === false ? '' : $contents;
}

function read_schema(string $path): array
{
    $raw = read_text_file($path);
    $decoded = json_decode($raw, true);
    test_assert(is_array($decoded), "{$path} decodes as JSON");
    return is_array($decoded) ? $decoded : [];
}

function schema_enum_values(array $schema, string $property): array
{
    $value = $schema['properties'][$property]['enum'] ?? [];
    return is_array($value) ? array_values($value) : [];
}

// ------------------------------------------------------------------
// Docs
// ------------------------------------------------------------------

test_suite('payroll docs');

$moduleContracts = read_text_file(__DIR__ . '/../../MODULE_CONTRACTS.md');
test_assert(str_contains($moduleContracts, 'accounting.payroll.v1'), 'MODULE_CONTRACTS documents payroll contract');
test_assert(str_contains($moduleContracts, 'period`, `employee`, `payslip`'), 'MODULE_CONTRACTS documents payroll entities');
test_assert(str_contains($moduleContracts, 'record_payment'), 'MODULE_CONTRACTS mentions payment recording');
test_assert(str_contains($moduleContracts, 'accounting.payroll.payments'), 'MODULE_CONTRACTS mentions payment permission');
test_assert(str_contains($moduleContracts, 'accounting.payroll.settings'), 'MODULE_CONTRACTS mentions payroll settings');
test_assert(str_contains($moduleContracts, 'accounting.payroll.import.v1'), 'MODULE_CONTRACTS documents payroll import contract');
test_assert(str_contains($moduleContracts, 'workspace'), 'MODULE_CONTRACTS documents payroll workspace entity');
test_assert(str_contains($moduleContracts, 'ids?: array<string | number>'), 'MODULE_CONTRACTS documents bulk action ids');
test_assert(str_contains($moduleContracts, 'dryRun?: boolean'), 'MODULE_CONTRACTS documents payroll import dryRun');
test_assert(str_contains($moduleContracts, 'periodId'), 'MODULE_CONTRACTS documents periodId context');
test_assert(str_contains($moduleContracts, 'employeeCode'), 'MODULE_CONTRACTS documents employeeCode import lookup');
test_assert(str_contains($moduleContracts, 'created, updated, results, warnings, errors'), 'MODULE_CONTRACTS documents import response shape');

$apiIndex = read_text_file(__DIR__ . '/../../docs/api-contracts-index.md');
test_assert(str_contains($apiIndex, '/api/acc_payroll.php'), 'API index includes payroll endpoint');
test_assert(str_contains($apiIndex, 'accounting.payroll.payments'), 'API index includes payroll payments permission');
test_assert(str_contains($apiIndex, 'accounting.payroll.settings'), 'API index includes payroll settings permission');
test_assert(str_contains($apiIndex, '/api/acc_payroll_import.php'), 'API index includes payroll import endpoint');
test_assert(str_contains($apiIndex, 'accounting.payroll.write'), 'API index documents payroll import write permission');
test_assert(str_contains($apiIndex, 'accounting.payroll.import'), 'API index documents payroll import permission');
test_assert(str_contains($apiIndex, 'accounting.payroll.workspace.response.schema.json'), 'API index includes payroll workspace schema');
test_assert(str_contains($apiIndex, 'accounting.payroll.action.bulk.response.schema.json'), 'API index includes payroll bulk action schema');
test_assert(str_contains($apiIndex, 'accounting.payroll.import.preview.response.schema.json'), 'API index includes payroll import preview schema');

$codeMap = read_text_file(__DIR__ . '/../../docs/code-map.md');
test_assert(str_contains($codeMap, 'Accounting Payroll Management'), 'code map includes payroll ownership row');
test_assert(str_contains($codeMap, 'api/modules/accounting'), 'code map points at accounting backend module');
test_assert(str_contains($codeMap, 'acc_payroll_periods'), 'code map lists payroll period table');
test_assert(str_contains($codeMap, 'acc_payslip_payments'), 'code map lists payroll payment table');
test_assert(str_contains($codeMap, 'acc_accounts'), 'code map lists payroll account table');
test_assert(str_contains($codeMap, 'system_settings'), 'code map lists payroll settings table');

// ------------------------------------------------------------------
// Schemas
// ------------------------------------------------------------------

test_suite('payroll schemas');

$createSchema = read_schema(__DIR__ . '/../../contracts/schemas/accounting.payroll.create.request.schema.json');
test_assert_equals('AccountingPayrollCreateRequest', $createSchema['title'] ?? null, 'create schema title');
test_assert_contains('entity', array_keys($createSchema['properties'] ?? []), 'create schema exposes entity');
test_assert_contains('period', schema_enum_values($createSchema, 'entity'), 'create schema includes period entity');
test_assert_contains('employee', schema_enum_values($createSchema, 'entity'), 'create schema includes employee entity');
test_assert_contains('payslip', schema_enum_values($createSchema, 'entity'), 'create schema includes payslip entity');
test_assert_contains('employeeId', array_keys($createSchema['properties'] ?? []), 'create schema exposes employeeId');
test_assert_contains('inputs', array_keys($createSchema['properties'] ?? []), 'create schema exposes inputs');

$updateSchema = read_schema(__DIR__ . '/../../contracts/schemas/accounting.payroll.update.request.schema.json');
test_assert_equals('AccountingPayrollUpdateRequest', $updateSchema['title'] ?? null, 'update schema title');
test_assert_contains('id', $updateSchema['required'] ?? [], 'update schema requires id');
test_assert_contains('entity', array_keys($updateSchema['properties'] ?? []), 'update schema exposes entity');
test_assert_contains('employeeCode', array_keys($updateSchema['properties'] ?? []), 'update schema exposes employeeCode');
test_assert_contains('periodKey', array_keys($updateSchema['properties'] ?? []), 'update schema exposes periodKey');

$actionSchema = read_schema(__DIR__ . '/../../contracts/schemas/accounting.payroll.action.request.schema.json');
test_assert_equals('AccountingPayrollActionRequest', $actionSchema['title'] ?? null, 'action schema title');
test_assert_contains('approve', schema_enum_values($actionSchema, 'action'), 'action schema includes approve');
test_assert_contains('issue', schema_enum_values($actionSchema, 'action'), 'action schema includes issue');
test_assert_contains('record_payment', schema_enum_values($actionSchema, 'action'), 'action schema includes record_payment');
test_assert_contains('cancel', schema_enum_values($actionSchema, 'action'), 'action schema includes cancel');
test_assert_contains('ids', array_keys($actionSchema['properties'] ?? []), 'action schema exposes ids for bulk operations');
test_assert_contains('amount', array_keys($actionSchema['properties'] ?? []), 'action schema exposes amount');
$paymentMethods = $actionSchema['properties']['paymentMethod']['enum'] ?? [];
test_assert_contains('cash', is_array($paymentMethods) ? $paymentMethods : [], 'action schema includes cash payment method');
test_assert_contains('bank', is_array($paymentMethods) ? $paymentMethods : [], 'action schema includes bank payment method');

$importSchema = read_schema(__DIR__ . '/../../contracts/schemas/accounting.payroll.import.request.schema.json');
test_assert_equals('AccountingPayrollImportRequest', $importSchema['title'] ?? null, 'import schema title');
test_assert_contains('rows', $importSchema['required'] ?? [], 'import schema requires rows');
test_assert_contains('dryRun', array_keys($importSchema['properties'] ?? []), 'import schema exposes dryRun flag');
test_assert_contains('periodId', array_keys($importSchema['properties'] ?? []), 'import schema exposes periodId');
test_assert_contains('periodKey', array_keys($importSchema['properties'] ?? []), 'import schema exposes periodKey');
test_assert_contains('employeeId', array_keys($importSchema['properties']['rows']['items']['properties'] ?? []), 'import row exposes employeeId');
test_assert_contains('employeeCode', array_keys($importSchema['properties']['rows']['items']['properties'] ?? []), 'import row exposes employeeCode');
test_assert_contains('inputs', array_keys($importSchema['properties']['rows']['items']['properties'] ?? []), 'import row exposes inputs');

$workspaceSchema = read_schema(__DIR__ . '/../../contracts/schemas/accounting.payroll.workspace.response.schema.json');
test_assert_equals('AccountingPayrollWorkspaceResponse', $workspaceSchema['title'] ?? null, 'workspace schema title');
test_assert_contains('workspace', array_keys($workspaceSchema['properties'] ?? []), 'workspace schema exposes workspace');

$bulkSchema = read_schema(__DIR__ . '/../../contracts/schemas/accounting.payroll.action.bulk.response.schema.json');
test_assert_equals('AccountingPayrollActionBulkResponse', $bulkSchema['title'] ?? null, 'bulk response schema title');
test_assert_contains('results', array_keys($bulkSchema['properties'] ?? []), 'bulk response schema exposes results');

$previewSchema = read_schema(__DIR__ . '/../../contracts/schemas/accounting.payroll.import.preview.response.schema.json');
test_assert_equals('AccountingPayrollImportPreviewResponse', $previewSchema['title'] ?? null, 'import preview response schema title');
test_assert_contains('dryRun', array_keys($previewSchema['properties'] ?? []), 'import preview schema exposes dryRun');

// Print machine-readable summary for the runner
$r = test_summary();
echo "RESULTS:passed={$r['passed']},failed={$r['failed']}\n";
exit($r['failed'] > 0 ? 1 : 0);

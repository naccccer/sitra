<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/accounting_helpers.php';

app_handle_preflight(['GET']);
app_require_method(['GET']);
app_require_module_enabled($pdo, 'accounting');
app_ensure_accounting_schema($pdo);

$actor = app_require_auth(['admin', 'manager']);
acc_require_permission($actor, 'accounting.reports.read', $pdo);

$report       = acc_normalize_text($_GET['report'] ?? '');
$fiscalYearId = acc_parse_id($_GET['fiscalYearId'] ?? null);
$dateFrom     = acc_parse_date(acc_normalize_text($_GET['dateFrom'] ?? ''));
$dateTo       = acc_parse_date(acc_normalize_text($_GET['dateTo'] ?? ''));
$accountId    = acc_parse_id($_GET['accountId'] ?? null);

if ($fiscalYearId === null && !in_array($report, ['ar_summary'], true)) {
    app_json(['success' => false, 'error' => 'fiscalYearId is required.'], 400);
}

require_once __DIR__ . '/reports_queries.php';

acc_accounting_handle_reports_request($pdo, $report, $fiscalYearId, $dateFrom, $dateTo, $accountId);

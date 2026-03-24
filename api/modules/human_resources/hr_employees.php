<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
app_require_module_enabled($pdo, 'human-resources');
app_ensure_human_resources_schema($pdo);

$actor = app_require_auth(['admin', 'manager']);
if ($method === 'GET') {
    if (!app_user_has_permission($actor, 'human_resources.employees.read', $pdo)) {
        app_json(['success' => false, 'error' => 'Access denied.'], 403);
    }

    $employeeId = app_hr_parse_id($_GET['id'] ?? null);
    if ($employeeId !== null) {
        $employee = app_hr_fetch_employee($pdo, $employeeId);
        if (!$employee) {
            app_json(['success' => false, 'error' => 'Employee not found.'], 404);
        }
        app_json(['success' => true, 'employee' => app_hr_employee_from_row($employee)]);
    }

    $q = app_hr_normalize_text($_GET['q'] ?? '');
    $isActive = array_key_exists('isActive', $_GET) ? app_hr_parse_bool($_GET['isActive'], null) : null;
    $page = max(1, (int)($_GET['page'] ?? 1));
    $pageSize = max(1, min(100, (int)($_GET['pageSize'] ?? 25)));
    $result = app_hr_list_employees($pdo, $q, $isActive, $page, $pageSize);
    app_json(['success' => true, 'employees' => $result['employees'], 'pagination' => $result['pagination']]);
}

$payload = app_read_json_body();
app_require_csrf();
if (!app_user_has_permission($actor, 'human_resources.employees.write', $pdo)) {
    app_json(['success' => false, 'error' => 'Access denied.'], 403);
}

if ($method === 'POST') {
    app_json(['success' => true, 'employee' => app_hr_save_employee($pdo, $payload, $actor)], 201);
}

if ($method === 'PUT') {
    $employeeId = app_hr_parse_id($payload['id'] ?? ($payload['employeeId'] ?? ($payload['employee_id'] ?? null)));
    if ($employeeId === null) {
        app_json(['success' => false, 'error' => 'Valid employee id is required.'], 400);
    }
    app_json(['success' => true, 'employee' => app_hr_save_employee($pdo, $payload, $actor, $employeeId)]);
}

$employeeId = app_hr_parse_id($payload['id'] ?? ($payload['employeeId'] ?? ($payload['employee_id'] ?? ($_GET['id'] ?? null))));
if ($employeeId === null) {
    app_json(['success' => false, 'error' => 'Valid employee id is required.'], 400);
}

if ($method === 'DELETE') {
    app_json(['success' => true, 'deleted' => app_hr_delete_employee($pdo, $employeeId, $actor)]);
}

$isActive = null;
if (array_key_exists('isActive', $payload)) {
    $parsed = filter_var($payload['isActive'], FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
    $isActive = $parsed === null ? null : $parsed;
} elseif (array_key_exists('active', $payload)) {
    $parsed = filter_var($payload['active'], FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
    $isActive = $parsed === null ? null : $parsed;
}
app_json(['success' => true, 'employee' => app_hr_toggle_employee_active($pdo, $employeeId, $isActive, $actor)]);

<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/inventory_v2_helpers.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_inventory_v2_schema($pdo);

$actor = app_require_auth(['admin', 'manager']);
if ($method === 'GET') {
    app_inventory_v2_require_permission($actor, 'inventory.v2_operations.read', $pdo);
} else {
    app_inventory_v2_require_permission($actor, 'inventory.v2_operations.write', $pdo);
    app_require_csrf();
}

// ─── GET ──────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $opType   = app_inventory_v2_normalize_text($_GET['type'] ?? '');
    $status   = app_inventory_v2_normalize_text($_GET['status'] ?? '');
    $q        = app_inventory_v2_normalize_text($_GET['q'] ?? '');
    $page     = max(1, (int)($_GET['page'] ?? 1));
    $pageSize = min(100, max(10, (int)($_GET['pageSize'] ?? 20)));
    $sortBy   = in_array($_GET['sortBy'] ?? '', ['operation_no', 'created_at', 'status'], true) ? $_GET['sortBy'] : 'created_at';
    $sortDir  = strtoupper($_GET['sortDir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

    $result = inv_v2_op_list($pdo, $opType, $status, $q, $page, $pageSize, $sortBy, $sortDir);
    app_json(['success' => true] + $result);
}

$payload = app_read_json_body();

// ─── POST ─────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $opType = app_inventory_v2_normalize_text($payload['operationType'] ?? '');
    $srcWid = app_inventory_v2_parse_id($payload['sourceWarehouseId'] ?? null);
    $tgtWid = app_inventory_v2_parse_id($payload['targetWarehouseId'] ?? null);
    $lines  = array_values(array_filter((array)($payload['lines'] ?? []), 'is_array'));

    $err = inv_v2_op_validate_create_payload($opType, $srcWid, $tgtWid, $lines);
    if ($err !== null) {
        app_json(['success' => false, 'error' => $err], 400);
    }

    try {
        $created = inv_v2_op_create($pdo, $payload, $actor);
    } catch (RuntimeException $e) {
        app_json(['success' => false, 'error' => $e->getMessage()], 500);
    }
    $operationId  = $created['id'];
    $operationNo  = $created['operationNo'];
    app_audit_log($pdo, 'inventory.vtwo_operations.created', 'inventory_v2_operation', (string)$operationId, ['operationType' => $opType, 'operationNo' => $operationNo], $actor);
    app_json(['success' => true, 'operation' => inv_v2_op_fetch($pdo, $operationId)], 201);
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $id = app_inventory_v2_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
    }
    $op = inv_v2_op_load_raw($pdo, $id);
    if (!$op) {
        app_json(['success' => false, 'error' => 'Operation not found.'], 404);
    }
    if ($op['status'] !== 'draft') {
        app_json(['success' => false, 'error' => 'Only draft operations can be edited.'], 422);
    }

    try {
        inv_v2_op_update($pdo, $id, $op, $payload);
    } catch (RuntimeException $e) {
        app_json(['success' => false, 'error' => $e->getMessage()], 500);
    }
    app_audit_log($pdo, 'inventory.vtwo_operations.updated', 'inventory_v2_operation', (string)$id, [], $actor);
    app_json(['success' => true, 'operation' => inv_v2_op_fetch($pdo, $id)]);
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
$id     = app_inventory_v2_parse_id($payload['id'] ?? null);
$action = app_inventory_v2_normalize_text($payload['action'] ?? '');
if ($id === null || $action === '') {
    app_json(['success' => false, 'error' => 'id and action are required.'], 400);
}
$op = inv_v2_op_load_raw($pdo, $id);
if (!$op) {
    app_json(['success' => false, 'error' => 'Operation not found.'], 404);
}
if ($action === 'post') {
    $result = app_inventory_v2_post_operation($pdo, $id, $actor);
    if (!$result['success']) {
        app_json(['success' => false, 'error' => $result['error']], $result['code'] ?? 422);
    }
    app_audit_log($pdo, 'inventory.vtwo_operations.posted', 'inventory_v2_operation', (string)$id, [], $actor);
    app_json(['success' => true, 'operation' => inv_v2_op_fetch($pdo, $id)]);
}
$transitions = inv_v2_op_transitions();
if (!isset($transitions[$action])) {
    app_json(['success' => false, 'error' => 'Invalid action.'], 400);
}
$t = $transitions[$action];
if ($t['from'] !== null && $op['status'] !== $t['from']) {
    app_json(['success' => false, 'error' => "Action '{$action}' not allowed from status '{$op['status']}'."], 422);
}
if ($action === 'cancel' && in_array($op['status'], ['posted', 'cancelled'], true)) {
    app_json(['success' => false, 'error' => 'Posted or already cancelled operations cannot be cancelled.'], 422);
}
inv_v2_op_set_status($pdo, $id, $t['to']);
app_audit_log($pdo, "inventory.vtwo_operations.{$action}", 'inventory_v2_operation', (string)$id, ['newStatus' => $t['to']], $actor);
app_json(['success' => true, 'operation' => inv_v2_op_fetch($pdo, $id)]);

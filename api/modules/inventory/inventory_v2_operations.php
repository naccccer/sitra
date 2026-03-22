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
    $offset   = ($page - 1) * $pageSize;

    $where  = [];
    $params = [];
    if ($opType !== '' && in_array($opType, app_inventory_v2_valid_operation_types(), true)) {
        $where[]           = 'h.operation_type = :op_type';
        $params['op_type'] = $opType;
    }
    if ($status !== '' && in_array($status, inv_v2_op_valid_statuses(), true)) {
        $where[]          = 'h.status = :status';
        $params['status'] = $status;
    }
    if ($q !== '') {
        $where[]     = '(h.operation_no LIKE :q OR h.reference_code LIKE :q)';
        $params['q'] = '%' . $q . '%';
    }
    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM inventory_v2_operation_headers h {$whereSql}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $sql  = inv_v2_op_base_select_sql()
          . " {$whereSql} ORDER BY h.{$sortBy} {$sortDir} LIMIT {$pageSize} OFFSET {$offset}";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    app_json([
        'success'    => true,
        'operations' => array_map('app_inventory_v2_operation_header_from_row', $rows),
        'total'      => $total,
        'page'       => $page,
        'pageSize'   => $pageSize,
    ]);
}

$payload = app_read_json_body();

// ─── POST ─────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $opType  = app_inventory_v2_normalize_text($payload['operationType'] ?? '');
    $srcWid  = app_inventory_v2_parse_id($payload['sourceWarehouseId'] ?? null);
    $tgtWid  = app_inventory_v2_parse_id($payload['targetWarehouseId'] ?? null);
    $lines   = array_values(array_filter((array)($payload['lines'] ?? []), 'is_array'));

    $err = inv_v2_op_validate_create_payload($opType, $srcWid, $tgtWid, $lines);
    if ($err !== null) {
        app_json(['success' => false, 'error' => $err], 400);
    }

    $notes   = app_inventory_v2_normalize_text($payload['notes'] ?? '');
    $refType = app_inventory_v2_normalize_text($payload['referenceType'] ?? '');
    $refId   = app_inventory_v2_normalize_text($payload['referenceId'] ?? '');
    $refCode = app_inventory_v2_normalize_text($payload['referenceCode'] ?? '');

    $operationNo = app_inventory_v2_generate_operation_no($pdo, $opType);
    $pdo->beginTransaction();
    try {
        $ins = $pdo->prepare(
            'INSERT INTO inventory_v2_operation_headers
             (operation_no, operation_type, status, source_warehouse_id, target_warehouse_id,
              reference_type, reference_id, reference_code, notes, created_by_user_id)
             VALUES (:op_no,:op_type,:status,:src_wid,:tgt_wid,:ref_type,:ref_id,:ref_code,:notes,:created_by)'
        );
        $ins->execute([
            'op_no'      => $operationNo,
            'op_type'    => $opType,
            'status'     => 'draft',
            'src_wid'    => $srcWid,
            'tgt_wid'    => $tgtWid,
            'ref_type'   => $refType !== '' ? $refType : null,
            'ref_id'     => $refId !== '' ? $refId : null,
            'ref_code'   => $refCode !== '' ? $refCode : null,
            'notes'      => $notes !== '' ? $notes : null,
            'created_by' => (int)$actor['id'],
        ]);
        $operationId = (int)$pdo->lastInsertId();
        inv_v2_op_insert_lines($pdo, $operationId, $lines);
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        app_json(['success' => false, 'error' => 'Failed to create operation.'], 500);
    }
    app_audit_log($pdo, 'inventory.vtwo_operations.created', 'inventory_v2_operation', (string)$operationId, ['operationType' => $opType, 'operationNo' => $operationNo], $actor);
    app_json(['success' => true, 'operation' => inv_v2_op_fetch($pdo, $operationId)], 201);
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $id = app_inventory_v2_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
    }
    $current = $pdo->prepare('SELECT * FROM inventory_v2_operation_headers WHERE id = :id LIMIT 1');
    $current->execute(['id' => $id]);
    $op = $current->fetch();
    if (!$op) {
        app_json(['success' => false, 'error' => 'Operation not found.'], 404);
    }
    if ($op['status'] !== 'draft') {
        app_json(['success' => false, 'error' => 'Only draft operations can be edited.'], 422);
    }
    $notes   = app_inventory_v2_normalize_text($payload['notes'] ?? $op['notes'] ?? '');
    $refCode = app_inventory_v2_normalize_text($payload['referenceCode'] ?? $op['reference_code'] ?? '');
    $lines   = array_values(array_filter((array)($payload['lines'] ?? []), 'is_array'));
    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare(
            'UPDATE inventory_v2_operation_headers
             SET notes = :notes, reference_code = :ref_code, updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $upd->execute(['notes' => $notes ?: null, 'ref_code' => $refCode ?: null, 'id' => $id]);
        if (!empty($lines)) {
            $pdo->prepare('DELETE FROM inventory_v2_operation_lines WHERE operation_id = :id')->execute(['id' => $id]);
            inv_v2_op_insert_lines($pdo, $id, $lines);
        }
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        app_json(['success' => false, 'error' => 'Failed to update operation.'], 500);
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
$opStmt = $pdo->prepare('SELECT * FROM inventory_v2_operation_headers WHERE id = :id LIMIT 1');
$opStmt->execute(['id' => $id]);
$op = $opStmt->fetch();
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
$pdo->prepare('UPDATE inventory_v2_operation_headers SET status = :status WHERE id = :id')
    ->execute(['status' => $t['to'], 'id' => $id]);
app_audit_log($pdo, "inventory.vtwo_operations.{$action}", 'inventory_v2_operation', (string)$id, ['newStatus' => $t['to']], $actor);
app_json(['success' => true, 'operation' => inv_v2_op_fetch($pdo, $id)]);

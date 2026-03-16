<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET', 'POST', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PATCH']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_inventory_schema($pdo);

if ($method === 'GET') {
    $actor = app_require_permission('inventory.requests.read', $pdo);
} else {
    $actor = app_require_permission('inventory.requests.create', $pdo);
    app_require_csrf();
}

if ($method === 'GET') {
    $status = app_inventory_normalize_text($_GET['status'] ?? '');
    $mine = app_inventory_bool($_GET['mine'] ?? false, false);
    $actorId = app_inventory_user_id($actor);
    $canApprove = app_user_has_permission($actor, 'inventory.requests.approve', $pdo);

    $where = [];
    $params = [];
    if ($status !== '') {
        $where[] = 'r.status = :status';
        $params['status'] = $status;
    }

    if ($mine || !$canApprove) {
        $where[] = 'r.requested_by_user_id = :requested_by_user_id';
        $params['requested_by_user_id'] = $actorId;
    }

    $sql = 'SELECT r.*, i.title AS item_title, w.name AS warehouse_name
            FROM inventory_requests r
            LEFT JOIN inventory_items i ON i.id = r.item_id
            LEFT JOIN inventory_warehouses w ON w.id = r.warehouse_id';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY r.id DESC LIMIT 300';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    $requests = [];
    foreach ($rows as $row) {
        $item = app_inventory_request_from_row($row);
        $item['itemTitle'] = (string)($row['item_title'] ?? '');
        $item['warehouseName'] = (string)($row['warehouse_name'] ?? '');
        $requests[] = $item;
    }

    app_json([
        'success' => true,
        'requests' => $requests,
    ]);
}

$payload = app_read_json_body();

if ($method === 'POST') {
    $warehouseId = app_inventory_parse_id($payload['warehouseId'] ?? null);
    $itemId = app_inventory_parse_id($payload['itemId'] ?? null);
    if ($warehouseId === null || $itemId === null) {
        app_json(['success' => false, 'error' => 'warehouseId and itemId are required.'], 400);
    }

    $qtyBase = app_inventory_round_qty(app_inventory_parse_decimal($payload['quantityBase'] ?? 0));
    $qtySecondary = app_inventory_round_qty(app_inventory_parse_decimal($payload['quantitySecondary'] ?? 0));
    if ($qtyBase <= 0 && $qtySecondary <= 0) {
        app_json(['success' => false, 'error' => 'At least one quantity must be greater than zero.'], 400);
    }

    $insert = $pdo->prepare(
        'INSERT INTO inventory_requests
         (status, warehouse_id, item_id, quantity_base, quantity_secondary, request_notes, requested_by_user_id)
         VALUES (:status, :warehouse_id, :item_id, :quantity_base, :quantity_secondary, :request_notes, :requested_by_user_id)'
    );
    $insert->execute([
        'status' => 'pending',
        'warehouse_id' => $warehouseId,
        'item_id' => $itemId,
        'quantity_base' => $qtyBase,
        'quantity_secondary' => $qtySecondary,
        'request_notes' => app_inventory_normalize_text($payload['requestNotes'] ?? ''),
        'requested_by_user_id' => app_inventory_user_id($actor),
    ]);

    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM inventory_requests WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();

    app_audit_log($pdo, 'inventory.request.created', 'inventory_request', (string)$id, [], $actor);
    app_json(['success' => true, 'request' => $row ? app_inventory_request_from_row($row) : null], 201);
}

$action = app_inventory_normalize_text($payload['action'] ?? '');
$id = app_inventory_parse_id($payload['id'] ?? null);
if ($id === null) {
    app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
}
if (!in_array($action, ['approve', 'reject', 'cancel'], true)) {
    app_json(['success' => false, 'error' => 'Unsupported action.'], 400);
}

if ($action === 'approve') {
    app_require_permission('inventory.requests.approve', $pdo);

    try {
        $pdo->beginTransaction();

        $requestStmt = $pdo->prepare('SELECT * FROM inventory_requests WHERE id = :id LIMIT 1 FOR UPDATE');
        $requestStmt->execute(['id' => $id]);
        $requestRow = $requestStmt->fetch();
        if (!$requestRow) {
            throw new RuntimeException('Request not found.');
        }
        if ((string)($requestRow['status'] ?? '') !== 'pending') {
            throw new RuntimeException('Only pending requests can be approved.');
        }

        $document = app_inventory_insert_document_with_lines($pdo, [
            'docType' => 'issue',
            'sourceWarehouseId' => (int)$requestRow['warehouse_id'],
            'targetWarehouseId' => null,
            'referenceType' => 'request',
            'referenceId' => (string)$id,
            'referenceCode' => 'REQ-' . $id,
            'notes' => app_inventory_normalize_text($payload['resolutionNotes'] ?? ''),
            'lines' => [[
                'itemId' => (int)$requestRow['item_id'],
                'quantityBase' => (float)$requestRow['quantity_base'],
                'quantitySecondary' => (float)$requestRow['quantity_secondary'],
                'notes' => app_inventory_normalize_text($payload['resolutionNotes'] ?? ''),
            ]],
        ], $actor);

        $documentId = (int)($document['id'] ?? 0);
        $linesStmt = $pdo->prepare('SELECT * FROM inventory_document_lines WHERE document_id = :document_id ORDER BY id ASC');
        $linesStmt->execute(['document_id' => $documentId]);
        $docLines = $linesStmt->fetchAll() ?: [];

        $posted = app_inventory_apply_document_post_transaction($pdo, $document, $docLines, $actor);

        $update = $pdo->prepare(
            'UPDATE inventory_requests
             SET status = :status,
                 resolution_notes = :resolution_notes,
                 approved_by_user_id = :approved_by_user_id,
                 document_id = :document_id,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $update->execute([
            'status' => 'approved',
            'resolution_notes' => app_inventory_normalize_text($payload['resolutionNotes'] ?? ''),
            'approved_by_user_id' => app_inventory_user_id($actor),
            'document_id' => $documentId,
            'id' => $id,
        ]);

        app_audit_log($pdo, 'inventory.request.approved', 'inventory_request', (string)$id, ['documentId' => $documentId], $actor);

        $pdo->commit();

        $requestRefresh = $pdo->prepare('SELECT * FROM inventory_requests WHERE id = :id LIMIT 1');
        $requestRefresh->execute(['id' => $id]);
        $request = $requestRefresh->fetch();

        app_json([
            'success' => true,
            'request' => $request ? app_inventory_request_from_row($request) : null,
            'document' => app_inventory_document_from_row($posted),
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        app_json(['success' => false, 'error' => $e->getMessage()], 409);
    }
}

if ($action === 'reject') {
    app_require_permission('inventory.requests.approve', $pdo);

    $update = $pdo->prepare(
        'UPDATE inventory_requests
         SET status = :status,
             resolution_notes = :resolution_notes,
             approved_by_user_id = :approved_by_user_id,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id AND status = :pending_status'
    );
    $update->execute([
        'status' => 'rejected',
        'resolution_notes' => app_inventory_normalize_text($payload['resolutionNotes'] ?? ''),
        'approved_by_user_id' => app_inventory_user_id($actor),
        'id' => $id,
        'pending_status' => 'pending',
    ]);

    app_audit_log($pdo, 'inventory.request.rejected', 'inventory_request', (string)$id, [], $actor);
}

if ($action === 'cancel') {
    $select = $pdo->prepare('SELECT * FROM inventory_requests WHERE id = :id LIMIT 1');
    $select->execute(['id' => $id]);
    $row = $select->fetch();
    if (!$row) {
        app_json(['success' => false, 'error' => 'Request not found.'], 404);
    }
    $actorId = app_inventory_user_id($actor);
    $isOwner = ((int)($row['requested_by_user_id'] ?? 0) === (int)$actorId);
    $canApprove = app_user_has_permission($actor, 'inventory.requests.approve', $pdo);
    if (!$isOwner && !$canApprove) {
        app_json(['success' => false, 'error' => 'Access denied.'], 403);
    }

    $cancel = $pdo->prepare(
        'UPDATE inventory_requests SET status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id AND status = :pending_status'
    );
    $cancel->execute([
        'status' => 'cancelled',
        'id' => $id,
        'pending_status' => 'pending',
    ]);

    app_audit_log($pdo, 'inventory.request.cancelled', 'inventory_request', (string)$id, [], $actor);
}

$refresh = $pdo->prepare('SELECT * FROM inventory_requests WHERE id = :id LIMIT 1');
$refresh->execute(['id' => $id]);
$request = $refresh->fetch();
if (!$request) {
    app_json(['success' => false, 'error' => 'Request not found.'], 404);
}

app_json(['success' => true, 'request' => app_inventory_request_from_row($request)]);

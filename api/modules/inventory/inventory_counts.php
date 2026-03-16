<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET', 'POST', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PATCH']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_inventory_schema($pdo);

if ($method === 'GET') {
    app_require_permission('inventory.counts.read', $pdo);
} else {
    $actor = app_require_permission('inventory.counts.write', $pdo);
    app_require_csrf();
}

function app_inventory_counts_lines(PDO $pdo, int $sessionId): array
{
    $stmt = $pdo->prepare('SELECT * FROM inventory_count_lines WHERE session_id = :session_id ORDER BY id ASC');
    $stmt->execute(['session_id' => $sessionId]);
    $rows = $stmt->fetchAll() ?: [];
    return array_map('app_inventory_count_line_from_row', $rows);
}

if ($method === 'GET') {
    $sessionId = app_inventory_parse_id($_GET['sessionId'] ?? null);

    if ($sessionId !== null) {
        $stmt = $pdo->prepare('SELECT * FROM inventory_count_sessions WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $sessionId]);
        $row = $stmt->fetch();
        if (!$row) {
            app_json(['success' => false, 'error' => 'Session not found.'], 404);
        }

        app_json([
            'success' => true,
            'session' => app_inventory_count_session_from_row($row),
            'lines' => app_inventory_counts_lines($pdo, $sessionId),
        ]);
    }

    $status = app_inventory_normalize_text($_GET['status'] ?? '');
    $warehouseId = app_inventory_parse_id($_GET['warehouseId'] ?? null);

    $where = [];
    $params = [];
    if ($status !== '') {
        $where[] = 'status = :status';
        $params['status'] = $status;
    }
    if ($warehouseId !== null) {
        $where[] = 'warehouse_id = :warehouse_id';
        $params['warehouse_id'] = $warehouseId;
    }

    $sql = 'SELECT * FROM inventory_count_sessions';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY id DESC LIMIT 100';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    app_json([
        'success' => true,
        'sessions' => array_map('app_inventory_count_session_from_row', $rows),
    ]);
}

$payload = app_read_json_body();

if ($method === 'POST') {
    $action = app_inventory_normalize_text($payload['action'] ?? '');

    if ($action === 'start_session') {
        $warehouseId = app_inventory_parse_id($payload['warehouseId'] ?? null);
        $countType = app_inventory_normalize_text($payload['countType'] ?? 'cycle');
        if ($warehouseId === null) {
            app_json(['success' => false, 'error' => 'warehouseId is required.'], 400);
        }
        if (!app_inventory_has_choice($countType, app_inventory_count_types())) {
            app_json(['success' => false, 'error' => 'Invalid countType.'], 400);
        }

        $existing = app_inventory_open_count_session($pdo, $warehouseId);
        if ($existing) {
            app_json(['success' => false, 'error' => 'An open count session already exists for this warehouse.'], 409);
        }

        $insert = $pdo->prepare(
            'INSERT INTO inventory_count_sessions
             (warehouse_id, count_type, status, started_by_user_id, notes)
             VALUES (:warehouse_id, :count_type, :status, :started_by_user_id, :notes)'
        );
        $insert->execute([
            'warehouse_id' => $warehouseId,
            'count_type' => $countType,
            'status' => 'open',
            'started_by_user_id' => app_inventory_user_id($actor),
            'notes' => app_inventory_normalize_text($payload['notes'] ?? ''),
        ]);

        $id = (int)$pdo->lastInsertId();
        $stmt = $pdo->prepare('SELECT * FROM inventory_count_sessions WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        app_audit_log($pdo, 'inventory.count.started', 'inventory_count_session', (string)$id, ['countType' => $countType], $actor);
        app_json(['success' => true, 'session' => $row ? app_inventory_count_session_from_row($row) : null], 201);
    }

    if ($action === 'upsert_line') {
        $sessionId = app_inventory_parse_id($payload['sessionId'] ?? null);
        $itemId = app_inventory_parse_id($payload['itemId'] ?? null);
        if ($sessionId === null || $itemId === null) {
            app_json(['success' => false, 'error' => 'sessionId and itemId are required.'], 400);
        }

        $countedBase = app_inventory_round_qty(app_inventory_parse_decimal($payload['countedQuantityBase'] ?? 0));
        $countedSecondary = app_inventory_round_qty(app_inventory_parse_decimal($payload['countedQuantitySecondary'] ?? 0));

        try {
            $line = app_inventory_upsert_count_line(
                $pdo,
                $sessionId,
                $itemId,
                $countedBase,
                $countedSecondary,
                app_inventory_normalize_text($payload['notes'] ?? '')
            );
        } catch (Throwable $e) {
            app_json(['success' => false, 'error' => $e->getMessage()], 409);
        }

        app_audit_log($pdo, 'inventory.count.line.upserted', 'inventory_count_session', (string)$sessionId, ['itemId' => $itemId], $actor);
        app_json(['success' => true, 'line' => app_inventory_count_line_from_row($line)]);
    }

    app_json(['success' => false, 'error' => 'Unsupported action.'], 400);
}

$action = app_inventory_normalize_text($payload['action'] ?? '');
if ($action !== 'close_session') {
    app_json(['success' => false, 'error' => 'Unsupported action.'], 400);
}

$sessionId = app_inventory_parse_id($payload['id'] ?? ($payload['sessionId'] ?? null));
if ($sessionId === null) {
    app_json(['success' => false, 'error' => 'Valid session id is required.'], 400);
}

try {
    $result = app_inventory_close_count_session($pdo, $sessionId, $actor, app_inventory_normalize_text($payload['notes'] ?? ''));
} catch (Throwable $e) {
    app_json(['success' => false, 'error' => $e->getMessage()], 409);
}

$session = app_inventory_count_session_from_row($result['session'] ?? []);
app_json([
    'success' => true,
    'session' => $session,
    'adjustmentDocumentId' => isset($result['adjustmentDocumentId']) ? (string)$result['adjustmentDocumentId'] : null,
]);

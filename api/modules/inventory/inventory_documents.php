<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';

app_handle_preflight(['GET', 'POST', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PATCH']);
app_require_module_enabled($pdo, 'inventory');
app_ensure_inventory_schema($pdo);

if ($method === 'GET') {
    app_require_permission('inventory.documents.read', $pdo);
} else {
    $actor = app_require_permission('inventory.documents.write', $pdo);
    app_require_csrf();
}

function app_inventory_documents_attach_lines(PDO $pdo, array $documents): array
{
    if ($documents === []) {
        return [];
    }

    $ids = array_values(array_filter(array_map(static fn($doc) => app_inventory_parse_id($doc['id'] ?? null), $documents)));
    if ($ids === []) {
        return $documents;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare(
        'SELECT * FROM inventory_document_lines WHERE document_id IN (' . $placeholders . ') ORDER BY id ASC'
    );
    $stmt->execute($ids);
    $rows = $stmt->fetchAll() ?: [];

    $byDoc = [];
    foreach ($rows as $row) {
        $key = (string)($row['document_id'] ?? '');
        if (!isset($byDoc[$key])) {
            $byDoc[$key] = [];
        }
        $byDoc[$key][] = app_inventory_document_line_from_row($row);
    }

    $enriched = [];
    foreach ($documents as $document) {
        $id = (string)($document['id'] ?? '');
        $document['lines'] = $byDoc[$id] ?? [];
        $enriched[] = $document;
    }
    return $enriched;
}

if ($method === 'GET') {
    $docType = app_inventory_normalize_text($_GET['docType'] ?? '');
    $status = app_inventory_normalize_text($_GET['status'] ?? '');
    $warehouseId = app_inventory_parse_id($_GET['warehouseId'] ?? null);
    $includeLines = app_inventory_bool($_GET['includeLines'] ?? false, false);

    $where = [];
    $params = [];
    if ($docType !== '') {
        $where[] = 'doc_type = :doc_type';
        $params['doc_type'] = $docType;
    }
    if ($status !== '') {
        $where[] = 'status = :status';
        $params['status'] = $status;
    }
    if ($warehouseId !== null) {
        $where[] = '(source_warehouse_id = :warehouse_id OR target_warehouse_id = :warehouse_id)';
        $params['warehouse_id'] = $warehouseId;
    }

    $sql = 'SELECT * FROM inventory_documents';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY id DESC LIMIT 300';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];
    $documents = array_map('app_inventory_document_from_row', $rows);

    if ($includeLines) {
        $documents = app_inventory_documents_attach_lines($pdo, $documents);
    }

    app_json([
        'success' => true,
        'documents' => $documents,
    ]);
}

$payload = app_read_json_body();

if ($method === 'POST') {
    $postImmediately = app_inventory_bool($payload['postImmediately'] ?? false, false);

    $pdo->beginTransaction();
    try {
        $document = app_inventory_insert_document_with_lines($pdo, $payload, $actor);
        $documentId = app_inventory_parse_id($document['id'] ?? null);
        if ($documentId === null) {
            throw new RuntimeException('Failed to create document.');
        }

        app_audit_log(
            $pdo,
            'inventory.document.created',
            'inventory_document',
            (string)$documentId,
            [
                'docType' => (string)($document['doc_type'] ?? ''),
                'docNo' => (string)($document['doc_no'] ?? ''),
            ],
            $actor
        );

        $pdo->commit();

        if ($postImmediately) {
            $document = app_inventory_post_document($pdo, $documentId, $actor);
        }

        $docResponse = app_inventory_document_from_row($document);
        $docResponse = app_inventory_documents_attach_lines($pdo, [$docResponse]);

        app_json([
            'success' => true,
            'document' => $docResponse[0] ?? null,
        ], 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        app_json([
            'success' => false,
            'error' => $e->getMessage(),
        ], 400);
    }
}

$action = app_inventory_normalize_text($payload['action'] ?? '');
$id = app_inventory_parse_id($payload['id'] ?? null);
if ($id === null) {
    app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
}

if ($action === 'post') {
    try {
        $document = app_inventory_post_document($pdo, $id, $actor);
    } catch (Throwable $e) {
        app_json(['success' => false, 'error' => $e->getMessage()], 409);
    }

    $doc = app_inventory_document_from_row($document);
    $doc = app_inventory_documents_attach_lines($pdo, [$doc]);
    app_json(['success' => true, 'document' => $doc[0] ?? null]);
}

if ($action === 'cancel') {
    $stmt = $pdo->prepare('SELECT * FROM inventory_documents WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        app_json(['success' => false, 'error' => 'Document not found.'], 404);
    }
    if ((string)($row['status'] ?? '') !== 'draft') {
        app_json(['success' => false, 'error' => 'Only draft documents can be cancelled.'], 409);
    }

    $cancel = $pdo->prepare(
        'UPDATE inventory_documents SET status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id'
    );
    $cancel->execute([
        'status' => 'cancelled',
        'id' => $id,
    ]);

    app_audit_log($pdo, 'inventory.document.cancelled', 'inventory_document', (string)$id, [], $actor);

    $refresh = $pdo->prepare('SELECT * FROM inventory_documents WHERE id = :id LIMIT 1');
    $refresh->execute(['id' => $id]);
    $doc = $refresh->fetch();

    $response = $doc ? app_inventory_document_from_row($doc) : null;
    $attached = app_inventory_documents_attach_lines($pdo, $response ? [$response] : []);
    app_json(['success' => true, 'document' => $attached[0] ?? null]);
}

app_json(['success' => false, 'error' => 'Unsupported action.'], 400);

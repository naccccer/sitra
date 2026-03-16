<?php
declare(strict_types=1);

function app_inventory_stock_snapshot(PDO $pdo, int $warehouseId, int $itemId, bool $forUpdate = false): array
{
    $suffix = $forUpdate ? ' FOR UPDATE' : '';
    $stmt = $pdo->prepare(
        'SELECT warehouse_id, item_id, quantity_base, quantity_secondary
         FROM inventory_stock
         WHERE warehouse_id = :warehouse_id AND item_id = :item_id' . $suffix
    );
    $stmt->execute([
        'warehouse_id' => $warehouseId,
        'item_id' => $itemId,
    ]);
    $row = $stmt->fetch();
    if (!$row) {
        return [
            'warehouse_id' => $warehouseId,
            'item_id' => $itemId,
            'quantity_base' => 0.0,
            'quantity_secondary' => 0.0,
            'exists' => false,
        ];
    }

    return [
        'warehouse_id' => $warehouseId,
        'item_id' => $itemId,
        'quantity_base' => (float)($row['quantity_base'] ?? 0),
        'quantity_secondary' => (float)($row['quantity_secondary'] ?? 0),
        'exists' => true,
    ];
}

function app_inventory_apply_stock_delta_locked(PDO $pdo, int $warehouseId, int $itemId, float $deltaBase, float $deltaSecondary): void
{
    $current = app_inventory_stock_snapshot($pdo, $warehouseId, $itemId, true);
    $nextBase = app_inventory_round_qty((float)$current['quantity_base'] + $deltaBase);
    $nextSecondary = app_inventory_round_qty((float)$current['quantity_secondary'] + $deltaSecondary);

    if ($nextBase < -0.0005 || $nextSecondary < -0.0005) {
        throw new RuntimeException('Insufficient stock for this operation.');
    }

    if (!(bool)$current['exists']) {
        $insert = $pdo->prepare(
            'INSERT INTO inventory_stock (warehouse_id, item_id, quantity_base, quantity_secondary)
             VALUES (:warehouse_id, :item_id, :quantity_base, :quantity_secondary)'
        );
        $insert->execute([
            'warehouse_id' => $warehouseId,
            'item_id' => $itemId,
            'quantity_base' => $nextBase,
            'quantity_secondary' => $nextSecondary,
        ]);
        return;
    }

    $update = $pdo->prepare(
        'UPDATE inventory_stock
         SET quantity_base = :quantity_base,
             quantity_secondary = :quantity_secondary,
             updated_at = CURRENT_TIMESTAMP
         WHERE warehouse_id = :warehouse_id AND item_id = :item_id'
    );
    $update->execute([
        'warehouse_id' => $warehouseId,
        'item_id' => $itemId,
        'quantity_base' => $nextBase,
        'quantity_secondary' => $nextSecondary,
    ]);
}

function app_inventory_assert_warehouse_unlocked_for_document(PDO $pdo, ?int $warehouseId, string $docType, string $referenceType = ''): void
{
    if ($warehouseId === null) {
        return;
    }

    $openSession = app_inventory_open_count_session($pdo, $warehouseId);
    if (!$openSession) {
        return;
    }

    $isAllowedCountAdjustment = ($docType === 'adjustment' && $referenceType === 'count_session');
    if ($isAllowedCountAdjustment) {
        return;
    }

    throw new RuntimeException('Warehouse is locked due to an active inventory count session.');
}

function app_inventory_validate_document_for_post(array $document, array $lines): void
{
    if ((string)($document['status'] ?? '') !== 'draft') {
        throw new RuntimeException('Only draft documents can be posted.');
    }
    if (!in_array((string)($document['doc_type'] ?? ''), app_inventory_document_types(), true)) {
        throw new RuntimeException('Invalid document type.');
    }
    if ($lines === []) {
        throw new RuntimeException('Document must include at least one line.');
    }

    $docType = (string)($document['doc_type'] ?? '');
    $sourceWarehouseId = app_inventory_parse_id($document['source_warehouse_id'] ?? null);
    $targetWarehouseId = app_inventory_parse_id($document['target_warehouse_id'] ?? null);

    if ($docType === 'receipt' && $targetWarehouseId === null) {
        throw new RuntimeException('Receipt document requires target warehouse.');
    }
    if ($docType === 'issue' && $sourceWarehouseId === null) {
        throw new RuntimeException('Issue document requires source warehouse.');
    }
    if ($docType === 'transfer') {
        if ($sourceWarehouseId === null || $targetWarehouseId === null) {
            throw new RuntimeException('Transfer document requires source and target warehouses.');
        }
        if ($sourceWarehouseId === $targetWarehouseId) {
            throw new RuntimeException('Transfer source and target warehouses must be different.');
        }
    }
    if ($docType === 'adjustment' && $targetWarehouseId === null) {
        throw new RuntimeException('Adjustment document requires target warehouse.');
    }
}

function app_inventory_apply_document_post_transaction(PDO $pdo, array $document, array $lines, ?array $actor = null): array
{
    app_inventory_validate_document_for_post($document, $lines);

    $docType = (string)$document['doc_type'];
    $referenceType = (string)($document['reference_type'] ?? '');
    $sourceWarehouseId = app_inventory_parse_id($document['source_warehouse_id'] ?? null);
    $targetWarehouseId = app_inventory_parse_id($document['target_warehouse_id'] ?? null);

    app_inventory_assert_warehouse_unlocked_for_document($pdo, $sourceWarehouseId, $docType, $referenceType);
    app_inventory_assert_warehouse_unlocked_for_document($pdo, $targetWarehouseId, $docType, $referenceType);

    foreach ($lines as $line) {
        $itemId = app_inventory_parse_id($line['item_id'] ?? null);
        if ($itemId === null) {
            throw new RuntimeException('Invalid item in document line.');
        }

        $qtyBase = (float)($line['quantity_base'] ?? 0);
        $qtySecondary = (float)($line['quantity_secondary'] ?? 0);

        if ($docType === 'receipt') {
            app_inventory_apply_stock_delta_locked($pdo, (int)$targetWarehouseId, $itemId, $qtyBase, $qtySecondary);
        } elseif ($docType === 'issue') {
            app_inventory_apply_stock_delta_locked($pdo, (int)$sourceWarehouseId, $itemId, -$qtyBase, -$qtySecondary);
        } elseif ($docType === 'transfer') {
            app_inventory_apply_stock_delta_locked($pdo, (int)$sourceWarehouseId, $itemId, -$qtyBase, -$qtySecondary);
            app_inventory_apply_stock_delta_locked($pdo, (int)$targetWarehouseId, $itemId, $qtyBase, $qtySecondary);
        } else {
            app_inventory_apply_stock_delta_locked($pdo, (int)$targetWarehouseId, $itemId, $qtyBase, $qtySecondary);
        }
    }

    $update = $pdo->prepare(
        'UPDATE inventory_documents
         SET status = :status,
             posted_at = CURRENT_TIMESTAMP,
             approved_by_user_id = :approved_by_user_id,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $update->execute([
        'id' => (int)$document['id'],
        'status' => 'posted',
        'approved_by_user_id' => app_inventory_user_id($actor),
    ]);

    app_audit_log(
        $pdo,
        'inventory.document.posted',
        'inventory_document',
        (string)$document['id'],
        [
            'docType' => $docType,
            'docNo' => (string)($document['doc_no'] ?? ''),
            'linesCount' => count($lines),
        ],
        $actor
    );

    $select = $pdo->prepare('SELECT * FROM inventory_documents WHERE id = :id LIMIT 1');
    $select->execute(['id' => (int)$document['id']]);
    $row = $select->fetch();
    return $row ?: $document;
}

function app_inventory_post_document(PDO $pdo, int $documentId, ?array $actor = null): array
{
    $pdo->beginTransaction();
    try {
        $docStmt = $pdo->prepare('SELECT * FROM inventory_documents WHERE id = :id LIMIT 1 FOR UPDATE');
        $docStmt->execute(['id' => $documentId]);
        $document = $docStmt->fetch();
        if (!$document) {
            throw new RuntimeException('Document not found.');
        }

        $linesStmt = $pdo->prepare('SELECT * FROM inventory_document_lines WHERE document_id = :document_id ORDER BY id ASC');
        $linesStmt->execute(['document_id' => $documentId]);
        $lines = $linesStmt->fetchAll() ?: [];

        $posted = app_inventory_apply_document_post_transaction($pdo, $document, $lines, $actor);

        $pdo->commit();
        return $posted;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function app_inventory_insert_document_with_lines(PDO $pdo, array $payload, ?array $actor = null): array
{
    $docType = app_inventory_normalize_text($payload['docType'] ?? '');
    if (!app_inventory_has_choice($docType, app_inventory_document_types())) {
        throw new RuntimeException('Invalid docType.');
    }

    $docNo = app_inventory_generate_doc_no();
    $sourceWarehouseId = app_inventory_parse_id($payload['sourceWarehouseId'] ?? null);
    $targetWarehouseId = app_inventory_parse_id($payload['targetWarehouseId'] ?? null);

    $insertDoc = $pdo->prepare(
        'INSERT INTO inventory_documents
         (doc_no, doc_type, status, source_warehouse_id, target_warehouse_id, reference_type, reference_id, reference_code, notes, created_by_user_id)
         VALUES
         (:doc_no, :doc_type, :status, :source_warehouse_id, :target_warehouse_id, :reference_type, :reference_id, :reference_code, :notes, :created_by_user_id)'
    );
    $insertDoc->execute([
        'doc_no' => $docNo,
        'doc_type' => $docType,
        'status' => 'draft',
        'source_warehouse_id' => $sourceWarehouseId,
        'target_warehouse_id' => $targetWarehouseId,
        'reference_type' => app_inventory_normalize_text($payload['referenceType'] ?? ''),
        'reference_id' => app_inventory_normalize_text($payload['referenceId'] ?? ''),
        'reference_code' => app_inventory_normalize_text($payload['referenceCode'] ?? ''),
        'notes' => app_inventory_normalize_text($payload['notes'] ?? ''),
        'created_by_user_id' => app_inventory_user_id($actor),
    ]);

    $documentId = (int)$pdo->lastInsertId();
    $insertLine = $pdo->prepare(
        'INSERT INTO inventory_document_lines (document_id, item_id, quantity_base, quantity_secondary, unit_price, notes)
         VALUES (:document_id, :item_id, :quantity_base, :quantity_secondary, :unit_price, :notes)'
    );

    $lines = is_array($payload['lines'] ?? null) ? $payload['lines'] : [];
    if ($lines === []) {
        throw new RuntimeException('At least one line is required.');
    }

    foreach ($lines as $line) {
        if (!is_array($line)) {
            continue;
        }
        $itemId = app_inventory_parse_id($line['itemId'] ?? null);
        if ($itemId === null) {
            throw new RuntimeException('Valid itemId is required for each line.');
        }

        $qtyBase = app_inventory_round_qty(app_inventory_parse_decimal($line['quantityBase'] ?? 0));
        $qtySecondary = app_inventory_round_qty(app_inventory_parse_decimal($line['quantitySecondary'] ?? 0));
        if (abs($qtyBase) < 0.0005 && abs($qtySecondary) < 0.0005) {
            throw new RuntimeException('Line quantity cannot be zero.');
        }
        if ($docType !== 'adjustment' && ($qtyBase < 0 || $qtySecondary < 0)) {
            throw new RuntimeException('Negative quantity is allowed only for adjustment documents.');
        }

        $insertLine->execute([
            'document_id' => $documentId,
            'item_id' => $itemId,
            'quantity_base' => $qtyBase,
            'quantity_secondary' => $qtySecondary,
            'unit_price' => isset($line['unitPrice']) ? (int)$line['unitPrice'] : null,
            'notes' => app_inventory_normalize_text($line['notes'] ?? ''),
        ]);
    }

    $select = $pdo->prepare('SELECT * FROM inventory_documents WHERE id = :id LIMIT 1');
    $select->execute(['id' => $documentId]);
    return $select->fetch() ?: [];
}

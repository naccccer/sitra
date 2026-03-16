<?php
declare(strict_types=1);

function app_inventory_upsert_count_line(PDO $pdo, int $sessionId, int $itemId, float $countedBase, float $countedSecondary, string $notes = ''): array
{
    $sessionStmt = $pdo->prepare('SELECT * FROM inventory_count_sessions WHERE id = :id LIMIT 1');
    $sessionStmt->execute(['id' => $sessionId]);
    $session = $sessionStmt->fetch();
    if (!$session) {
        throw new RuntimeException('Count session not found.');
    }
    if ((string)($session['status'] ?? '') !== 'open') {
        throw new RuntimeException('Count session is closed.');
    }

    $warehouseId = (int)$session['warehouse_id'];
    $stock = app_inventory_stock_snapshot($pdo, $warehouseId, $itemId, false);
    $systemBase = app_inventory_round_qty((float)$stock['quantity_base']);
    $systemSecondary = app_inventory_round_qty((float)$stock['quantity_secondary']);
    $diffBase = app_inventory_round_qty($countedBase - $systemBase);
    $diffSecondary = app_inventory_round_qty($countedSecondary - $systemSecondary);

    $stmt = $pdo->prepare(
        'INSERT INTO inventory_count_lines
         (session_id, item_id, system_quantity_base, system_quantity_secondary, counted_quantity_base, counted_quantity_secondary, diff_quantity_base, diff_quantity_secondary, notes)
         VALUES
         (:session_id, :item_id, :system_quantity_base, :system_quantity_secondary, :counted_quantity_base, :counted_quantity_secondary, :diff_quantity_base, :diff_quantity_secondary, :notes)
         ON DUPLICATE KEY UPDATE
            system_quantity_base = VALUES(system_quantity_base),
            system_quantity_secondary = VALUES(system_quantity_secondary),
            counted_quantity_base = VALUES(counted_quantity_base),
            counted_quantity_secondary = VALUES(counted_quantity_secondary),
            diff_quantity_base = VALUES(diff_quantity_base),
            diff_quantity_secondary = VALUES(diff_quantity_secondary),
            notes = VALUES(notes),
            updated_at = CURRENT_TIMESTAMP'
    );

    $stmt->execute([
        'session_id' => $sessionId,
        'item_id' => $itemId,
        'system_quantity_base' => $systemBase,
        'system_quantity_secondary' => $systemSecondary,
        'counted_quantity_base' => $countedBase,
        'counted_quantity_secondary' => $countedSecondary,
        'diff_quantity_base' => $diffBase,
        'diff_quantity_secondary' => $diffSecondary,
        'notes' => $notes,
    ]);

    $lineStmt = $pdo->prepare(
        'SELECT * FROM inventory_count_lines WHERE session_id = :session_id AND item_id = :item_id LIMIT 1'
    );
    $lineStmt->execute([
        'session_id' => $sessionId,
        'item_id' => $itemId,
    ]);
    $line = $lineStmt->fetch();
    if (!$line) {
        throw new RuntimeException('Unable to fetch count line.');
    }

    return $line;
}

function app_inventory_close_count_session(PDO $pdo, int $sessionId, ?array $actor = null, string $notes = ''): array
{
    $pdo->beginTransaction();
    try {
        $sessionStmt = $pdo->prepare('SELECT * FROM inventory_count_sessions WHERE id = :id LIMIT 1 FOR UPDATE');
        $sessionStmt->execute(['id' => $sessionId]);
        $session = $sessionStmt->fetch();
        if (!$session) {
            throw new RuntimeException('Count session not found.');
        }
        if ((string)($session['status'] ?? '') !== 'open') {
            throw new RuntimeException('Count session is already closed.');
        }

        $linesStmt = $pdo->prepare('SELECT * FROM inventory_count_lines WHERE session_id = :session_id ORDER BY id ASC');
        $linesStmt->execute(['session_id' => $sessionId]);
        $lines = $linesStmt->fetchAll() ?: [];
        if ($lines === []) {
            throw new RuntimeException('No count lines found for this session.');
        }

        $adjustmentDocumentId = null;
        $adjustmentLines = [];
        foreach ($lines as $line) {
            $diffBase = app_inventory_round_qty((float)($line['diff_quantity_base'] ?? 0));
            $diffSecondary = app_inventory_round_qty((float)($line['diff_quantity_secondary'] ?? 0));
            if (abs($diffBase) < 0.0005 && abs($diffSecondary) < 0.0005) {
                continue;
            }
            $adjustmentLines[] = [
                'item_id' => (int)$line['item_id'],
                'quantity_base' => $diffBase,
                'quantity_secondary' => $diffSecondary,
                'notes' => app_inventory_normalize_text($line['notes'] ?? ''),
            ];
        }

        if ($adjustmentLines !== []) {
            $insertDoc = $pdo->prepare(
                'INSERT INTO inventory_documents
                 (doc_no, doc_type, status, target_warehouse_id, reference_type, reference_id, notes, created_by_user_id)
                 VALUES
                 (:doc_no, :doc_type, :status, :target_warehouse_id, :reference_type, :reference_id, :notes, :created_by_user_id)'
            );
            $insertDoc->execute([
                'doc_no' => app_inventory_generate_doc_no(),
                'doc_type' => 'adjustment',
                'status' => 'draft',
                'target_warehouse_id' => (int)$session['warehouse_id'],
                'reference_type' => 'count_session',
                'reference_id' => (string)$sessionId,
                'notes' => $notes,
                'created_by_user_id' => app_inventory_user_id($actor),
            ]);

            $adjustmentDocumentId = (int)$pdo->lastInsertId();
            $lineInsert = $pdo->prepare(
                'INSERT INTO inventory_document_lines (document_id, item_id, quantity_base, quantity_secondary, notes)
                 VALUES (:document_id, :item_id, :quantity_base, :quantity_secondary, :notes)'
            );
            foreach ($adjustmentLines as $line) {
                $lineInsert->execute([
                    'document_id' => $adjustmentDocumentId,
                    'item_id' => $line['item_id'],
                    'quantity_base' => $line['quantity_base'],
                    'quantity_secondary' => $line['quantity_secondary'],
                    'notes' => $line['notes'],
                ]);
            }

            $docStmt = $pdo->prepare('SELECT * FROM inventory_documents WHERE id = :id LIMIT 1 FOR UPDATE');
            $docStmt->execute(['id' => $adjustmentDocumentId]);
            $document = $docStmt->fetch();
            if (!$document) {
                throw new RuntimeException('Adjustment document not found.');
            }

            $docLinesStmt = $pdo->prepare('SELECT * FROM inventory_document_lines WHERE document_id = :document_id ORDER BY id ASC');
            $docLinesStmt->execute(['document_id' => $adjustmentDocumentId]);
            $docLines = $docLinesStmt->fetchAll() ?: [];

            app_inventory_apply_document_post_transaction($pdo, $document, $docLines, $actor);
        }

        $lineUpdate = $pdo->prepare(
            'UPDATE inventory_count_lines
             SET adjustment_document_id = :adjustment_document_id,
                 updated_at = CURRENT_TIMESTAMP
             WHERE session_id = :session_id'
        );
        $lineUpdate->execute([
            'adjustment_document_id' => $adjustmentDocumentId,
            'session_id' => $sessionId,
        ]);

        $sessionUpdate = $pdo->prepare(
            'UPDATE inventory_count_sessions
             SET status = :status,
                 closed_by_user_id = :closed_by_user_id,
                 closed_at = CURRENT_TIMESTAMP,
                 notes = :notes,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $sessionUpdate->execute([
            'status' => 'closed',
            'closed_by_user_id' => app_inventory_user_id($actor),
            'notes' => $notes !== '' ? $notes : (string)($session['notes'] ?? ''),
            'id' => $sessionId,
        ]);

        app_audit_log(
            $pdo,
            'inventory.count.closed',
            'inventory_count_session',
            (string)$sessionId,
            [
                'adjustmentDocumentId' => $adjustmentDocumentId,
                'linesCount' => count($lines),
            ],
            $actor
        );

        $pdo->commit();

        $sessionRefresh = $pdo->prepare('SELECT * FROM inventory_count_sessions WHERE id = :id LIMIT 1');
        $sessionRefresh->execute(['id' => $sessionId]);
        $sessionRow = $sessionRefresh->fetch();

        return [
            'session' => $sessionRow ?: $session,
            'adjustmentDocumentId' => $adjustmentDocumentId,
        ];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

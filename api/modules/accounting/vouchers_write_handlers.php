<?php
declare(strict_types=1);

require_once __DIR__ . '/accounting_helpers.php';

function acc_accounting_handle_vouchers_write_request(PDO $pdo, array $actor, string $method, array $payload): void
{

// ─── POST ─────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $fiscalYearId = acc_parse_id($payload['fiscalYearId'] ?? null);
    $voucherDate  = acc_parse_date(acc_normalize_text($payload['voucherDate'] ?? ''));
    $description  = acc_normalize_text($payload['description'] ?? '');
    $sourceType   = acc_normalize_text($payload['sourceType'] ?? '') ?: 'manual';
    $sourceId     = acc_normalize_text($payload['sourceId'] ?? '') ?: null;
    $sourceCode   = acc_normalize_text($payload['sourceCode'] ?? '') ?: null;
    $lines        = $payload['lines'] ?? [];

    if ($fiscalYearId === null || $voucherDate === null) {
        app_json(['success' => false, 'error' => 'fiscalYearId and voucherDate are required.'], 400);
    }
    if (!is_array($lines) || count($lines) < 2) {
        app_json(['success' => false, 'error' => 'At least 2 lines are required.'], 400);
    }

    // Verify fiscal year exists and is open
    $fyStmt = $pdo->prepare('SELECT * FROM acc_fiscal_years WHERE id = :id LIMIT 1');
    $fyStmt->execute(['id' => $fiscalYearId]);
    $fy = $fyStmt->fetch();
    if (!$fy) {
        app_json(['success' => false, 'error' => 'Fiscal year not found.'], 404);
    }
    if ((string)$fy['status'] === 'closed') {
        app_json(['success' => false, 'error' => 'Fiscal year is closed.'], 400);
    }

    // Normalize and validate lines
    $normalizedLines = [];
    foreach ($lines as $idx => $line) {
        $accountId    = acc_parse_id($line['accountId'] ?? null);
        $debitAmount  = max(0, (int)($line['debitAmount'] ?? 0));
        $creditAmount = max(0, (int)($line['creditAmount'] ?? 0));
        $lineDesc     = acc_normalize_text($line['description'] ?? '');
        $partyType    = acc_normalize_text($line['partyType'] ?? '') ?: null;
        $partyId      = acc_parse_id($line['partyId'] ?? null);

        if ($accountId === null) {
            app_json(['success' => false, 'error' => "Line {$idx}: accountId is required."], 400);
        }
        if ($debitAmount === 0 && $creditAmount === 0) {
            app_json(['success' => false, 'error' => "Line {$idx}: debitAmount or creditAmount must be > 0."], 400);
        }
        if ($debitAmount > 0 && $creditAmount > 0) {
            app_json(['success' => false, 'error' => "Line {$idx}: a line cannot have both debit and credit."], 400);
        }

        // Verify account is postable
        $accStmt = $pdo->prepare('SELECT id, is_postable FROM acc_accounts WHERE id = :id AND is_active = 1 LIMIT 1');
        $accStmt->execute(['id' => $accountId]);
        $acc = $accStmt->fetch();
        if (!$acc || (int)$acc['is_postable'] !== 1) {
            app_json(['success' => false, 'error' => "Line {$idx}: account {$accountId} is not postable."], 400);
        }

        $normalizedLines[] = [
            'accountId'    => $accountId,
            'debitAmount'  => $debitAmount,
            'creditAmount' => $creditAmount,
            'description'  => $lineDesc,
            'partyType'    => $partyType,
            'partyId'      => $partyId,
        ];
    }

    if (!acc_validate_lines_balance($normalizedLines)) {
        app_json(['success' => false, 'error' => 'Voucher is unbalanced: total debit must equal total credit.'], 400);
    }

    $pdo->beginTransaction();
    try {
        $voucherNo = acc_next_voucher_no($pdo, $fiscalYearId);

        $insertVoucher = $pdo->prepare(
            'INSERT INTO acc_vouchers (fiscal_year_id, voucher_no, voucher_date, description, status, source_type, source_id, source_code, created_by_user_id)
             VALUES (:fy_id, :no, :date, :desc, :status, :src_type, :src_id, :src_code, :uid)'
        );
        $insertVoucher->execute([
            'fy_id'    => $fiscalYearId,
            'no'       => $voucherNo,
            'date'     => $voucherDate,
            'desc'     => $description,
            'status'   => 'draft',
            'src_type' => $sourceType,
            'src_id'   => $sourceId,
            'src_code' => $sourceCode,
            'uid'      => $actor['id'],
        ]);
        $voucherId = (int)$pdo->lastInsertId();

        $insertLine = $pdo->prepare(
            'INSERT INTO acc_voucher_lines (voucher_id, line_no, account_id, description, debit_amount, credit_amount, party_type, party_id)
             VALUES (:vid, :no, :account_id, :desc, :debit, :credit, :party_type, :party_id)'
        );
        foreach ($normalizedLines as $lineNo => $line) {
            $insertLine->execute([
                'vid'        => $voucherId,
                'no'         => $lineNo + 1,
                'account_id' => $line['accountId'],
                'desc'       => $line['description'],
                'debit'      => $line['debitAmount'],
                'credit'     => $line['creditAmount'],
                'party_type' => $line['partyType'],
                'party_id'   => $line['partyId'],
            ]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        app_json(['success' => false, 'error' => 'Failed to create voucher: ' . $e->getMessage()], 500);
    }

    $vStmt = $pdo->prepare('SELECT v.*, u.username AS created_by_username FROM acc_vouchers v LEFT JOIN users u ON u.id = v.created_by_user_id WHERE v.id = :id LIMIT 1');
    $vStmt->execute(['id' => $voucherId]);
    $vRow = $vStmt->fetch();
    $lines = acc_fetch_voucher_lines($pdo, $voucherId);

    app_audit_log($pdo, 'accounting.voucher.created', 'acc_vouchers', (string)$voucherId, ['voucherNo' => $voucherNo, 'sourceType' => $sourceType], $actor);
    app_json(['success' => true, 'voucher' => acc_voucher_from_row($vRow, $lines)], 201);
}

// ─── PUT (edit draft) ─────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $id = acc_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
    }
    $vStmt = $pdo->prepare('SELECT * FROM acc_vouchers WHERE id = :id LIMIT 1');
    $vStmt->execute(['id' => $id]);
    $current = $vStmt->fetch();
    if (!$current) {
        app_json(['success' => false, 'error' => 'Voucher not found.'], 404);
    }
    if ((string)$current['status'] !== 'draft') {
        app_json(['success' => false, 'error' => 'Only draft vouchers can be edited.'], 400);
    }

    $description = acc_normalize_text($payload['description'] ?? $current['description']);
    $voucherDate = acc_parse_date(acc_normalize_text($payload['voucherDate'] ?? '')) ?? (string)$current['voucher_date'];
    $lines       = $payload['lines'] ?? null;

    $pdo->prepare(
        'UPDATE acc_vouchers SET description = :desc, voucher_date = :date, updated_at = CURRENT_TIMESTAMP WHERE id = :id'
    )->execute(['desc' => $description, 'date' => $voucherDate, 'id' => $id]);

    if ($lines !== null && is_array($lines)) {
        // Replace all lines
        $normalizedLines = [];
        foreach ($lines as $idx => $line) {
            $accountId    = acc_parse_id($line['accountId'] ?? null);
            $debitAmount  = max(0, (int)($line['debitAmount'] ?? 0));
            $creditAmount = max(0, (int)($line['creditAmount'] ?? 0));
            $lineDesc     = acc_normalize_text($line['description'] ?? '');
            $partyType    = acc_normalize_text($line['partyType'] ?? '') ?: null;
            $partyId      = acc_parse_id($line['partyId'] ?? null);

            if ($accountId === null) {
                app_json(['success' => false, 'error' => "Line {$idx}: accountId is required."], 400);
            }
            if ($debitAmount === 0 && $creditAmount === 0) {
                app_json(['success' => false, 'error' => "Line {$idx}: amount must be > 0."], 400);
            }
            if ($debitAmount > 0 && $creditAmount > 0) {
                app_json(['success' => false, 'error' => "Line {$idx}: cannot have both debit and credit."], 400);
            }

            $accStmt = $pdo->prepare('SELECT is_postable FROM acc_accounts WHERE id = :id AND is_active = 1 LIMIT 1');
            $accStmt->execute(['id' => $accountId]);
            $acc = $accStmt->fetch();
            if (!$acc || (int)$acc['is_postable'] !== 1) {
                app_json(['success' => false, 'error' => "Line {$idx}: account {$accountId} is not postable."], 400);
            }

            $normalizedLines[] = [
                'accountId'    => $accountId,
                'debitAmount'  => $debitAmount,
                'creditAmount' => $creditAmount,
                'description'  => $lineDesc,
                'partyType'    => $partyType,
                'partyId'      => $partyId,
            ];
        }

        if (count($normalizedLines) >= 2 && !acc_validate_lines_balance($normalizedLines)) {
            app_json(['success' => false, 'error' => 'Voucher is unbalanced.'], 400);
        }

        $pdo->prepare('DELETE FROM acc_voucher_lines WHERE voucher_id = :vid')->execute(['vid' => $id]);
        $insertLine = $pdo->prepare(
            'INSERT INTO acc_voucher_lines (voucher_id, line_no, account_id, description, debit_amount, credit_amount, party_type, party_id)
             VALUES (:vid, :no, :account_id, :desc, :debit, :credit, :party_type, :party_id)'
        );
        foreach ($normalizedLines as $lineNo => $line) {
            $insertLine->execute([
                'vid'        => $id,
                'no'         => $lineNo + 1,
                'account_id' => $line['accountId'],
                'desc'       => $line['description'],
                'debit'      => $line['debitAmount'],
                'credit'     => $line['creditAmount'],
                'party_type' => $line['partyType'],
                'party_id'   => $line['partyId'],
            ]);
        }
    }

    $vStmt = $pdo->prepare('SELECT v.*, u.username AS created_by_username FROM acc_vouchers v LEFT JOIN users u ON u.id = v.created_by_user_id WHERE v.id = :id LIMIT 1');
    $vStmt->execute(['id' => $id]);
    $vRow = $vStmt->fetch();
    $updatedLines = acc_fetch_voucher_lines($pdo, $id);
    app_json(['success' => true, 'voucher' => acc_voucher_from_row($vRow, $updatedLines)]);
}

// ─── PATCH (post / cancel) ────────────────────────────────────────────────────
$id     = acc_parse_id($payload['id'] ?? null);
$action = acc_normalize_text($payload['action'] ?? '');

if ($id === null) {
    app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
}

$vStmt = $pdo->prepare('SELECT * FROM acc_vouchers WHERE id = :id LIMIT 1');
$vStmt->execute(['id' => $id]);
$current = $vStmt->fetch();
if (!$current) {
    app_json(['success' => false, 'error' => 'Voucher not found.'], 404);
}

if ($action === 'post') {
    acc_require_permission($actor, 'accounting.vouchers.post', $pdo);
    if ((string)$current['status'] !== 'draft') {
        app_json(['success' => false, 'error' => 'Only draft vouchers can be posted.'], 400);
    }

    // Re-validate balance before posting
    $lines = acc_fetch_voucher_lines($pdo, $id);
    if (!acc_validate_lines_balance($lines)) {
        app_json(['success' => false, 'error' => 'Cannot post unbalanced voucher.'], 400);
    }

    $pdo->prepare(
        'UPDATE acc_vouchers SET status = :s, posted_by_user_id = :uid, posted_at = CURRENT_TIMESTAMP WHERE id = :id'
    )->execute(['s' => 'posted', 'uid' => $actor['id'], 'id' => $id]);

    app_audit_log($pdo, 'accounting.voucher.posted', 'acc_vouchers', (string)$id, ['voucherNo' => (int)$current['voucher_no']], $actor);

} elseif ($action === 'cancel') {
    if ((string)$current['status'] === 'cancelled') {
        app_json(['success' => false, 'error' => 'Voucher is already cancelled.'], 400);
    }
    if ((string)$current['status'] === 'posted') {
        // Posted vouchers: set cancelled flag (reverse entry should be created separately in phase 2)
        $pdo->prepare('UPDATE acc_vouchers SET status = :s WHERE id = :id')->execute(['s' => 'cancelled', 'id' => $id]);
        app_audit_log($pdo, 'accounting.voucher.cancelled', 'acc_vouchers', (string)$id, ['voucherNo' => (int)$current['voucher_no']], $actor);
    } else {
        $pdo->prepare('UPDATE acc_vouchers SET status = :s WHERE id = :id')->execute(['s' => 'cancelled', 'id' => $id]);
    }
} else {
    app_json(['success' => false, 'error' => 'Unknown action. Use post or cancel.'], 400);
}

$vStmt = $pdo->prepare('SELECT v.*, u.username AS created_by_username FROM acc_vouchers v LEFT JOIN users u ON u.id = v.created_by_user_id WHERE v.id = :id LIMIT 1');
$vStmt->execute(['id' => $id]);
$vRow = $vStmt->fetch();
$lines = acc_fetch_voucher_lines($pdo, $id);
app_json(['success' => true, 'voucher' => acc_voucher_from_row($vRow, $lines)]);
}

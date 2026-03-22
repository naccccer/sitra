<?php
declare(strict_types=1);

require_once __DIR__ . '/../../_common.php';
require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/accounting_helpers.php';

app_handle_preflight(['GET', 'POST', 'PUT', 'PATCH']);
$method = app_require_method(['GET', 'POST', 'PUT', 'PATCH']);
app_require_module_enabled($pdo, 'accounting');
app_ensure_accounting_schema($pdo);

$actor = app_require_auth(['admin', 'manager']);
if ($method === 'GET') {
    acc_require_permission($actor, 'accounting.accounts.read', $pdo);
} else {
    acc_require_permission($actor, 'accounting.accounts.write', $pdo);
    app_require_csrf();
}

$validTypes    = ['asset', 'liability', 'equity', 'revenue', 'expense'];
$validNatures  = ['debit', 'credit'];
$validLevels   = [1, 2, 3, 4];

// ─── GET ─────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $q              = acc_normalize_text($_GET['q'] ?? '');
    $level          = isset($_GET['level']) ? (int)$_GET['level'] : null;
    $parentId       = acc_parse_id($_GET['parentId'] ?? null);
    $type           = acc_normalize_text($_GET['type'] ?? '');
    $postableOnly   = acc_parse_bool($_GET['postableOnly'] ?? false, false);
    $includeInactive = acc_parse_bool($_GET['includeInactive'] ?? false, false);
    $asTree         = acc_parse_bool($_GET['asTree'] ?? false, false);

    $where  = [];
    $params = [];

    if (!$includeInactive) {
        $where[] = 'is_active = 1';
    }
    if ($level !== null && in_array($level, $validLevels, true)) {
        $where[] = 'level = :level';
        $params['level'] = $level;
    }
    if ($parentId !== null) {
        $where[] = 'parent_id = :parent_id';
        $params['parent_id'] = $parentId;
    }
    if ($type !== '' && in_array($type, $validTypes, true)) {
        $where[] = 'account_type = :type';
        $params['type'] = $type;
    }
    if ($postableOnly) {
        $where[] = 'is_postable = 1';
    }
    if ($q !== '') {
        $where[] = '(code LIKE :q OR name LIKE :q)';
        $params['q'] = '%' . $q . '%';
    }

    $sql = 'SELECT * FROM acc_accounts';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY code ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];
    $accounts = array_map('acc_account_from_row', $rows);

    if ($asTree) {
        app_json(['success' => true, 'accounts' => acc_build_account_tree($accounts)]);
    }
    app_json(['success' => true, 'accounts' => $accounts, 'total' => count($accounts)]);
}

$payload = app_read_json_body();

// ─── POST ─────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $code    = acc_normalize_text($payload['code'] ?? '');
    $name    = acc_normalize_text($payload['name'] ?? '');
    $level   = (int)($payload['level'] ?? 0);
    $parentId = acc_parse_id($payload['parentId'] ?? null);
    $type    = acc_normalize_text($payload['accountType'] ?? '');
    $nature  = acc_normalize_text($payload['accountNature'] ?? '');
    $notes   = acc_normalize_text($payload['notes'] ?? '') ?: null;

    if ($code === '' || $name === '') {
        app_json(['success' => false, 'error' => 'code and name are required.'], 400);
    }
    if (!in_array($level, $validLevels, true)) {
        app_json(['success' => false, 'error' => 'level must be 1, 2, 3 or 4.'], 400);
    }
    if (!in_array($type, $validTypes, true)) {
        app_json(['success' => false, 'error' => 'Invalid accountType.'], 400);
    }
    if (!in_array($nature, $validNatures, true)) {
        app_json(['success' => false, 'error' => 'Invalid accountNature.'], 400);
    }
    if ($level > 1 && $parentId === null) {
        app_json(['success' => false, 'error' => 'parentId is required for level > 1.'], 400);
    }

    // Leaf accounts (level 3 or 4) are postable by default
    $isPostable = $level >= 3 ? 1 : 0;

    $insert = $pdo->prepare(
        'INSERT INTO acc_accounts (code, name, level, parent_id, account_type, account_nature, is_postable, is_system, notes)
         VALUES (:code, :name, :level, :parent_id, :type, :nature, :postable, 0, :notes)'
    );
    $insert->execute([
        'code'      => $code,
        'name'      => $name,
        'level'     => $level,
        'parent_id' => $parentId,
        'type'      => $type,
        'nature'    => $nature,
        'postable'  => $isPostable,
        'notes'     => $notes,
    ]);
    $id = (int)$pdo->lastInsertId();

    $fetch = $pdo->prepare('SELECT * FROM acc_accounts WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();

    app_audit_log($pdo, 'accounting.account.created', 'acc_accounts', (string)$id, ['code' => $code, 'name' => $name], $actor);
    app_json(['success' => true, 'account' => $row ? acc_account_from_row($row) : null], 201);
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $id = acc_parse_id($payload['id'] ?? null);
    if ($id === null) {
        app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
    }

    $fetch = $pdo->prepare('SELECT * FROM acc_accounts WHERE id = :id LIMIT 1');
    $fetch->execute(['id' => $id]);
    $current = $fetch->fetch();
    if (!$current) {
        app_json(['success' => false, 'error' => 'Account not found.'], 404);
    }

    $name  = acc_normalize_text($payload['name'] ?? $current['name']);
    $notes = acc_normalize_text($payload['notes'] ?? ($current['notes'] ?? '')) ?: null;
    if ($name === '') {
        app_json(['success' => false, 'error' => 'name is required.'], 400);
    }

    $update = $pdo->prepare(
        'UPDATE acc_accounts SET name = :name, notes = :notes, updated_at = CURRENT_TIMESTAMP WHERE id = :id'
    );
    $update->execute(['name' => $name, 'notes' => $notes, 'id' => $id]);

    $fetch->execute(['id' => $id]);
    $row = $fetch->fetch();
    app_audit_log($pdo, 'accounting.account.updated', 'acc_accounts', (string)$id, ['name' => $name], $actor);
    app_json(['success' => true, 'account' => $row ? acc_account_from_row($row) : null]);
}

// ─── PATCH (toggle active / toggle postable) ──────────────────────────────────
$id = acc_parse_id($payload['id'] ?? null);
if ($id === null) {
    app_json(['success' => false, 'error' => 'Valid id is required.'], 400);
}

$fetch = $pdo->prepare('SELECT * FROM acc_accounts WHERE id = :id LIMIT 1');
$fetch->execute(['id' => $id]);
$current = $fetch->fetch();
if (!$current) {
    app_json(['success' => false, 'error' => 'Account not found.'], 404);
}
if ((int)$current['is_system'] === 1) {
    app_json(['success' => false, 'error' => 'System accounts cannot be modified.'], 400);
}

$action = acc_normalize_text($payload['action'] ?? 'toggle_active');

if ($action === 'toggle_active') {
    $isActive = acc_parse_bool($payload['isActive'] ?? true, true);
    $pdo->prepare('UPDATE acc_accounts SET is_active = :v, updated_at = CURRENT_TIMESTAMP WHERE id = :id')
        ->execute(['v' => $isActive ? 1 : 0, 'id' => $id]);
} elseif ($action === 'toggle_postable') {
    $isPostable = acc_parse_bool($payload['isPostable'] ?? true, true);
    $pdo->prepare('UPDATE acc_accounts SET is_postable = :v, updated_at = CURRENT_TIMESTAMP WHERE id = :id')
        ->execute(['v' => $isPostable ? 1 : 0, 'id' => $id]);
} else {
    app_json(['success' => false, 'error' => 'Unknown action.'], 400);
}

$fetch->execute(['id' => $id]);
$row = $fetch->fetch();
app_json(['success' => true, 'account' => $row ? acc_account_from_row($row) : null]);

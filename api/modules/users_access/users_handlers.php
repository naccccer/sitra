<?php
declare(strict_types=1);

require_once __DIR__ . '/../../kernel/ModuleGuard.php';
require_once __DIR__ . '/users_write_handlers.php';
require_once __DIR__ . '/users_activation_handler.php';

function app_users_handle_get(PDO $pdo, bool $hasIsActive): void
{
    $view = app_users_parse_view($_GET);
    $identitySql = app_users_has_identity_columns($pdo)
        ? 'full_name, job_title, '
        : 'username AS full_name, NULL AS job_title, ';
    $activeSql = app_users_active_sql($hasIsActive) . ' AS is_active';
    $deletedSelect = app_users_has_deleted_at_column($pdo) ? 'deleted_at, ' : 'NULL AS deleted_at, ';
    $where = [];
    if (app_users_has_deleted_at_column($pdo)) {
        $where[] = 'deleted_at IS NULL';
    }
    if ($view === 'active') {
        $where[] = $activeSql . ' = 1';
    } elseif ($view === 'archived') {
        $where[] = $activeSql . ' = 0';
    }
    $sql = 'SELECT id, username, ' . $identitySql . 'role, ' . $activeSql . ', ' . $deletedSelect . 'created_at, updated_at FROM users';
    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY id DESC';
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll();
    $users = array_map('app_users_to_response', $rows);

    app_json([
        'success' => true,
        'users' => $users,
    ]);
}

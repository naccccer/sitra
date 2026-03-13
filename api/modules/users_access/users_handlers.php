<?php
declare(strict_types=1);

require_once __DIR__ . '/../../kernel/ModuleGuard.php';
require_once __DIR__ . '/users_write_handlers.php';
require_once __DIR__ . '/users_activation_handler.php';

function app_users_handle_get(PDO $pdo, bool $hasIsActive): void
{
    $identitySql = app_users_has_identity_columns($pdo)
        ? 'full_name, job_title, '
        : 'username AS full_name, NULL AS job_title, ';
    $activeSql = app_users_active_sql($hasIsActive) . ' AS is_active';
    $stmt = $pdo->query('SELECT id, username, ' . $identitySql . 'role, ' . $activeSql . ', created_at, updated_at FROM users ORDER BY id DESC');
    $rows = $stmt->fetchAll();
    $users = array_map('app_users_to_response', $rows);

    app_json([
        'success' => true,
        'users' => $users,
    ]);
}

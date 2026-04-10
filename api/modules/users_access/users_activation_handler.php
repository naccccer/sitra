<?php
declare(strict_types=1);

function app_users_handle_patch(PDO $pdo, bool $hasIsActive, array $currentUser): void
{
    $payload = app_read_json_body();
    $id = (int)($payload['id'] ?? 0);

    if ($id <= 0) {
        app_json(['success' => false, 'error' => 'Valid user id is required.'], 400);
    }

    $action = strtolower(trim((string)($payload['action'] ?? '')));
    if (!in_array($action, ['archive', 'restore', 'delete'], true)) {
        if (array_key_exists('isActive', $payload)) {
            $nextActive = app_users_parse_bool($payload['isActive']);
            if ($nextActive === null) {
                app_json(['success' => false, 'error' => 'isActive must be a boolean.'], 400);
            }
            $action = $nextActive ? 'restore' : 'archive';
        } else {
            app_json(['success' => false, 'error' => 'action is required.'], 400);
        }
    }

    if (!$hasIsActive) {
        app_json(['success' => false, 'error' => 'users.is_active column is unavailable.'], 500);
    }

    $target = app_users_fetch_one($pdo, $id, $hasIsActive, true);
    if ($target === null) {
        app_json(['success' => false, 'error' => 'User not found.'], 404);
    }

    $hasDeletedAt = app_users_has_deleted_at_column($pdo);
    $deletedAt = (string)($target['deleted_at'] ?? '');
    $targetIsDeleted = $deletedAt !== '';
    $targetIsActive = ((int)($target['is_active'] ?? 1)) === 1;

    if (($action === 'archive' || $action === 'restore') && $targetIsDeleted) {
        app_json(['success' => false, 'error' => 'User not found.'], 404);
    }
    if ($action === 'delete' && $targetIsDeleted) {
        app_json(['success' => false, 'error' => 'User is already deleted.', 'code' => 'already_deleted'], 409);
    }

    $isOwner = app_kernel_is_owner($currentUser) || ((string)($currentUser['role'] ?? '')) === 'admin';
    if ((string)($target['role'] ?? '') === 'admin' && !$isOwner) {
        app_json(['success' => false, 'error' => 'Access denied.', 'code' => 'owner_required_to_change_admin_activation'], 403);
    }

    if ($action === 'archive') {
        if ((string)$currentUser['id'] === (string)$id) {
            app_json(['success' => false, 'error' => 'You cannot archive your own account.'], 400);
        }
        if ($targetIsActive && (string)$target['role'] === 'admin' && app_users_count_active_admins($pdo, $hasIsActive) <= 1) {
            app_json(['success' => false, 'error' => 'The last active admin cannot be archived.'], 400);
        }
        $pdo->prepare('UPDATE users SET is_active = 0 WHERE id = :id')->execute(['id' => $id]);
        $event = 'users_access.user.archived';
    } elseif ($action === 'restore') {
        $pdo->prepare('UPDATE users SET is_active = 1 WHERE id = :id')->execute(['id' => $id]);
        $event = 'users_access.user.restored';
    } else {
        if (!$hasDeletedAt) {
            app_json(['success' => false, 'error' => 'users.deleted_at column is unavailable.'], 500);
        }
        if ($targetIsActive) {
            app_json(['success' => false, 'error' => 'Only archived users can be deleted.'], 409);
        }
        $pdo->prepare('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id')->execute(['id' => $id]);
        $event = 'users_access.user.deleted';
    }

    $updated = app_users_fetch_one($pdo, $id, $hasIsActive, true);
    $updatedResponse = $updated ? app_users_to_response($updated) : null;

    app_audit_log($pdo, $event, 'users', (string)$id, ['action' => $action, 'user' => $updatedResponse], $currentUser);

    if ($action === 'delete') {
        app_json([
            'success' => true,
            'deletedId' => (string)$id,
            'deletedAt' => (string)($updated['deleted_at'] ?? date('Y-m-d H:i:s')),
        ]);
    }

    app_json(['success' => true, 'user' => $updatedResponse]);
}

<?php
declare(strict_types=1);

function app_users_handle_patch(PDO $pdo, bool $hasIsActive, array $currentUser): void
{
    $payload = app_read_json_body();
    $id = (int)($payload['id'] ?? 0);
    $isActiveRaw = $payload['isActive'] ?? null;

    if ($id <= 0) {
        app_json([
            'success' => false,
            'error' => 'Valid user id is required.',
        ], 400);
    }

    if (!array_key_exists('isActive', $payload)) {
        app_json([
            'success' => false,
            'error' => 'isActive is required.',
        ], 400);
    }

    $nextActive = app_users_parse_bool($isActiveRaw);
    if ($nextActive === null) {
        app_json([
            'success' => false,
            'error' => 'isActive must be a boolean.',
        ], 400);
    }

    if (!$hasIsActive) {
        app_json([
            'success' => false,
            'error' => 'users.is_active column is unavailable.',
        ], 500);
    }

    $target = app_users_fetch_one($pdo, $id, $hasIsActive);
    if ($target === null) {
        app_json([
            'success' => false,
            'error' => 'User not found.',
        ], 404);
    }
    $targetResponse = app_users_to_response($target);

    $isOwner = app_kernel_is_owner($currentUser) || ((string)($currentUser['role'] ?? '')) === 'admin';
    if ((string)($target['role'] ?? '') === 'admin' && !$isOwner) {
        app_json([
            'success' => false,
            'error' => 'Access denied.',
            'code' => 'owner_required_to_change_admin_activation',
        ], 403);
    }

    $targetIsActive = ((int)($target['is_active'] ?? 1)) === 1;
    if (!$nextActive) {
        if ((string)$currentUser['id'] === (string)$id) {
            app_json([
                'success' => false,
                'error' => 'You cannot deactivate your own account.',
            ], 400);
        }

        if ($targetIsActive && (string)$target['role'] === 'admin' && app_users_count_active_admins($pdo, $hasIsActive) <= 1) {
            app_json([
                'success' => false,
                'error' => 'The last active admin cannot be deactivated.',
            ], 400);
        }
    }

    $stmt = $pdo->prepare('UPDATE users SET is_active = :is_active WHERE id = :id');
    $stmt->execute([
        'id' => $id,
        'is_active' => $nextActive ? 1 : 0,
    ]);

    $updated = app_users_fetch_one($pdo, $id, $hasIsActive);
    $updatedResponse = $updated ? app_users_to_response($updated) : null;

    app_audit_log(
        $pdo,
        'users_access.user.activation.changed',
        'users',
        (string)$id,
        [
            'before' => (bool)($targetResponse['isActive'] ?? false),
            'after' => (bool)($updatedResponse['isActive'] ?? $nextActive),
        ],
        $currentUser
    );

    app_json([
        'success' => true,
        'user' => $updatedResponse,
    ]);
}

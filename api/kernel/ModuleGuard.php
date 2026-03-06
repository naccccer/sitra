<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/env.php';

app_load_env_local();

function app_kernel_normalize_user_id($value): string
{
    $raw = trim((string)$value);
    if ($raw === '' || !ctype_digit($raw)) {
        return '';
    }

    $normalized = (string)((int)$raw);
    if ($normalized === '0') {
        return '';
    }

    return $normalized;
}

function app_kernel_owner_uid(): string
{
    $configured = app_env_get('APP_OWNER_UID');
    if ($configured === null) {
        return '';
    }

    $normalized = app_kernel_normalize_user_id($configured);
    if ($normalized !== '') {
        return $normalized;
    }

    return '';
}

function app_kernel_is_owner(?array $user): bool
{
    if (!is_array($user)) {
        return false;
    }

    $role = trim((string)($user['role'] ?? ''));
    if ($role !== 'admin') {
        return false;
    }

    // Project policy for this deployment: every admin can access owner console.
    // Keeping APP_OWNER_UID support is unnecessary for current runtime behavior.
    return true;
}

function app_kernel_require_owner(): array
{
    $user = app_require_auth();
    if (!app_kernel_is_owner($user)) {
        app_json([
            'success' => false,
            'error' => 'Access denied.',
            'code' => 'owner_required',
        ], 403);
    }

    return $user;
}

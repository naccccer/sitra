<?php
declare(strict_types=1);

function app_users_sync_session_after_self_update(int $id, ?array $currentUser, ?array $updatedResponse): void
{
    if ((string)($currentUser['id'] ?? '') !== (string)$id || $updatedResponse === null) {
        return;
    }

    app_start_session();
    $_SESSION['username'] = (string)($updatedResponse['username'] ?? '');
    $_SESSION['full_name'] = (string)($updatedResponse['fullName'] ?? '');
    $_SESSION['job_title'] = (string)($updatedResponse['jobTitle'] ?? '');
    $_SESSION['role'] = (string)($updatedResponse['role'] ?? '');
}

function app_users_build_changes_payload(array $before, ?array $updatedResponse, array $payload): array
{
    $changes = [];
    if ($updatedResponse !== null) {
        if ((string)($before['username'] ?? '') !== (string)($updatedResponse['username'] ?? '')) {
            $changes['username'] = [
                'before' => (string)($before['username'] ?? ''),
                'after' => (string)($updatedResponse['username'] ?? ''),
            ];
        }
        if ((string)($before['fullName'] ?? '') !== (string)($updatedResponse['fullName'] ?? '')) {
            $changes['fullName'] = [
                'before' => (string)($before['fullName'] ?? ''),
                'after' => (string)($updatedResponse['fullName'] ?? ''),
            ];
        }
        if ((string)($before['role'] ?? '') !== (string)($updatedResponse['role'] ?? '')) {
            $changes['role'] = [
                'before' => (string)($before['role'] ?? ''),
                'after' => (string)($updatedResponse['role'] ?? ''),
            ];
        }
        if ((string)($before['jobTitle'] ?? '') !== (string)($updatedResponse['jobTitle'] ?? '')) {
            $changes['jobTitle'] = [
                'before' => (string)($before['jobTitle'] ?? ''),
                'after' => (string)($updatedResponse['jobTitle'] ?? ''),
            ];
        }
    }
    if (array_key_exists('password', $payload)) {
        $changes['passwordChanged'] = true;
    }
    return $changes;
}

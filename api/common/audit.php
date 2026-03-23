<?php
declare(strict_types=1);

function app_ensure_audit_logs_table(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS audit_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            event_type VARCHAR(120) NOT NULL,
            entity_type VARCHAR(80) NOT NULL,
            entity_id VARCHAR(80) NULL,
            actor_user_id VARCHAR(64) NULL,
            actor_username VARCHAR(64) NULL,
            actor_role VARCHAR(32) NULL,
            payload_json LONGTEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_audit_event_created (event_type, created_at),
            KEY idx_audit_entity (entity_type, entity_id),
            KEY idx_audit_actor_created (actor_user_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "DELETE FROM audit_logs
         WHERE event_type IS NULL
            OR event_type = ''
            OR SUBSTRING_INDEX(event_type, '.', 1) NOT IN ('auth', 'users_access', 'master_data', 'sales', 'customers', 'inventory', 'kernel', 'accounting')"
    );
}

function app_audit_log(PDO $pdo, string $eventType, string $entityType, ?string $entityId = null, array $payload = [], ?array $actor = null): void
{
    try {
        app_ensure_audit_logs_table($pdo);

        $effectiveActor = $actor;
        if ($effectiveActor === null) {
            $effectiveActor = app_current_user();
        }

        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($payloadJson === false) {
            $payloadJson = json_encode(['encoding_error' => true], JSON_UNESCAPED_UNICODE);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO audit_logs (
                event_type, entity_type, entity_id,
                actor_user_id, actor_username, actor_role, payload_json
             ) VALUES (
                :event_type, :entity_type, :entity_id,
                :actor_user_id, :actor_username, :actor_role, :payload_json
             )'
        );

        $stmt->execute([
            'event_type' => $eventType,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'actor_user_id' => $effectiveActor['id'] ?? null,
            'actor_username' => $effectiveActor['username'] ?? null,
            'actor_role' => $effectiveActor['role'] ?? null,
            'payload_json' => $payloadJson,
        ]);
    } catch (Throwable $e) {
        // Audit logging must never block primary business flow.
    }
}

<?php
declare(strict_types=1);

function app_schema_column_exists(PDO $pdo, string $table, string $column): bool
{
    if (!app_schema_is_safe_identifier($table) || !app_schema_is_safe_identifier($column)) {
        return false;
    }
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
        return (bool)($stmt && $stmt->fetch());
    } catch (Throwable $e) {
        return false;
    }
}

function app_schema_index_exists(PDO $pdo, string $table, string $index): bool
{
    if (!app_schema_is_safe_identifier($table) || !app_schema_is_safe_identifier($index)) {
        return false;
    }
    try {
        $stmt = $pdo->query("SHOW INDEX FROM `{$table}` WHERE Key_name = '{$index}'");
        return (bool)($stmt && $stmt->fetch());
    } catch (Throwable $e) {
        return false;
    }
}

function app_schema_fk_exists(PDO $pdo, string $table, string $constraint): bool
{
    if (!app_schema_is_safe_identifier($table) || !app_schema_is_safe_identifier($constraint)) {
        return false;
    }
    try {
        $sql = "SELECT 1
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE CONSTRAINT_SCHEMA = DATABASE()
                  AND TABLE_NAME = :table_name
                  AND CONSTRAINT_NAME = :constraint_name
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'table_name' => $table,
            'constraint_name' => $constraint,
        ]);
        return (bool)$stmt->fetch();
    } catch (Throwable $e) {
        return false;
    }
}

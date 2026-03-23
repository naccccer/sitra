<?php
declare(strict_types=1);

function app_ensure_inventory_v2_schema_ext(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    app_ensure_inventory_v2_schema($pdo);

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_v2_replenishment_rules (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            product_id BIGINT UNSIGNED NOT NULL,
            warehouse_id INT UNSIGNED NOT NULL,
            min_qty DECIMAL(18,3) NOT NULL DEFAULT 0,
            max_qty DECIMAL(18,3) NOT NULL DEFAULT 0,
            notes TEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_v2_replenishment_pw (product_id, warehouse_id),
            KEY idx_inventory_v2_replenishment_warehouse (warehouse_id),
            CONSTRAINT fk_inventory_v2_replenishment_product
                FOREIGN KEY (product_id) REFERENCES inventory_v2_products (id)
                ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_inventory_v2_replenishment_warehouse
                FOREIGN KEY (warehouse_id) REFERENCES inventory_v2_warehouses (id)
                ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function app_inventory_v2_replenishment_rule_from_row(array $row): array
{
    return [
        'id' => (string)($row['id'] ?? ''),
        'productId' => (string)($row['product_id'] ?? ''),
        'warehouseId' => (string)($row['warehouse_id'] ?? ''),
        'minQty' => (string)($row['min_qty'] ?? '0'),
        'maxQty' => (string)($row['max_qty'] ?? '0'),
        'notes' => (string)($row['notes'] ?? ''),
        'isActive' => ((int)($row['is_active'] ?? 0)) === 1,
        'createdAt' => app_format_order_timestamp($row['created_at'] ?? null),
        'updatedAt' => app_format_order_timestamp($row['updated_at'] ?? null),
    ];
}

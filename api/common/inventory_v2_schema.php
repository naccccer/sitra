<?php
declare(strict_types=1);

function app_ensure_inventory_v2_schema(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    app_ensure_users_table($pdo);

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_v2_products (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            product_code VARCHAR(64) NULL,
            name VARCHAR(180) NOT NULL,
            product_type ENUM('stockable','consumable','service') NOT NULL DEFAULT 'stockable',
            uom VARCHAR(32) NOT NULL,
            notes TEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_v2_products_code (product_code),
            KEY idx_inventory_v2_products_name (name),
            KEY idx_inventory_v2_products_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_v2_variants (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            product_id BIGINT UNSIGNED NOT NULL,
            sku VARCHAR(80) NULL,
            variant_code VARCHAR(80) NULL,
            attributes_json LONGTEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_v2_variants_sku (sku),
            UNIQUE KEY uq_inventory_v2_variant_product_code (product_id, variant_code),
            KEY idx_inventory_v2_variants_product (product_id),
            CONSTRAINT fk_inventory_v2_variants_product FOREIGN KEY (product_id) REFERENCES inventory_v2_products (id) ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_v2_warehouses (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            warehouse_key VARCHAR(64) NOT NULL,
            name VARCHAR(140) NOT NULL,
            notes TEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_v2_warehouses_key (warehouse_key),
            KEY idx_inventory_v2_warehouses_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_v2_locations (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            warehouse_id INT UNSIGNED NOT NULL,
            parent_location_id BIGINT UNSIGNED NULL,
            location_key VARCHAR(80) NOT NULL,
            name VARCHAR(140) NOT NULL,
            usage_type ENUM('internal','supplier','customer','inventory','production') NOT NULL DEFAULT 'internal',
            notes TEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_v2_locations_key (warehouse_id, location_key),
            KEY idx_inventory_v2_locations_parent (parent_location_id),
            KEY idx_inventory_v2_locations_warehouse (warehouse_id),
            CONSTRAINT fk_inventory_v2_locations_warehouse FOREIGN KEY (warehouse_id) REFERENCES inventory_v2_warehouses (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_v2_locations_parent FOREIGN KEY (parent_location_id) REFERENCES inventory_v2_locations (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_v2_lots (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            lot_code VARCHAR(90) NOT NULL,
            product_id BIGINT UNSIGNED NOT NULL,
            variant_id BIGINT UNSIGNED NULL,
            expiry_date DATE NULL,
            notes TEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_v2_lots_code (lot_code),
            KEY idx_inventory_v2_lots_product (product_id),
            CONSTRAINT fk_inventory_v2_lots_product FOREIGN KEY (product_id) REFERENCES inventory_v2_products (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_v2_lots_variant FOREIGN KEY (variant_id) REFERENCES inventory_v2_variants (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_v2_quants (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            product_id BIGINT UNSIGNED NOT NULL,
            variant_id BIGINT UNSIGNED NULL,
            warehouse_id INT UNSIGNED NOT NULL,
            location_id BIGINT UNSIGNED NOT NULL,
            lot_id BIGINT UNSIGNED NULL,
            quantity_on_hand DECIMAL(18,3) NOT NULL DEFAULT 0,
            quantity_reserved DECIMAL(18,3) NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_v2_quants_dim (product_id, variant_id, warehouse_id, location_id, lot_id),
            KEY idx_inventory_v2_quants_warehouse_location (warehouse_id, location_id),
            CONSTRAINT fk_inventory_v2_quants_product FOREIGN KEY (product_id) REFERENCES inventory_v2_products (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_v2_quants_variant FOREIGN KEY (variant_id) REFERENCES inventory_v2_variants (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_v2_quants_warehouse FOREIGN KEY (warehouse_id) REFERENCES inventory_v2_warehouses (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_v2_quants_location FOREIGN KEY (location_id) REFERENCES inventory_v2_locations (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_v2_quants_lot FOREIGN KEY (lot_id) REFERENCES inventory_v2_lots (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_v2_operation_headers (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            operation_no VARCHAR(80) NOT NULL,
            operation_type ENUM('receipt','delivery','transfer','production_move','adjustment','count') NOT NULL,
            status ENUM('draft','submitted','approved','posted','cancelled') NOT NULL DEFAULT 'draft',
            source_warehouse_id INT UNSIGNED NULL,
            target_warehouse_id INT UNSIGNED NULL,
            reference_type VARCHAR(50) NULL,
            reference_id VARCHAR(80) NULL,
            reference_code VARCHAR(120) NULL,
            notes TEXT NULL,
            created_by_user_id INT UNSIGNED NULL,
            approved_by_user_id INT UNSIGNED NULL,
            posted_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_v2_operation_headers_no (operation_no),
            KEY idx_inventory_v2_operation_headers_type_status (operation_type, status),
            CONSTRAINT fk_inventory_v2_op_headers_source_wh FOREIGN KEY (source_warehouse_id) REFERENCES inventory_v2_warehouses (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_v2_op_headers_target_wh FOREIGN KEY (target_warehouse_id) REFERENCES inventory_v2_warehouses (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_v2_op_headers_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_v2_op_headers_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_v2_operation_lines (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            operation_id BIGINT UNSIGNED NOT NULL,
            product_id BIGINT UNSIGNED NOT NULL,
            variant_id BIGINT UNSIGNED NULL,
            lot_id BIGINT UNSIGNED NULL,
            source_location_id BIGINT UNSIGNED NULL,
            target_location_id BIGINT UNSIGNED NULL,
            quantity_requested DECIMAL(18,3) NOT NULL DEFAULT 0,
            quantity_done DECIMAL(18,3) NOT NULL DEFAULT 0,
            uom VARCHAR(32) NOT NULL,
            notes VARCHAR(255) NULL,
            PRIMARY KEY (id),
            KEY idx_inventory_v2_operation_lines_operation (operation_id),
            CONSTRAINT fk_inventory_v2_op_lines_operation FOREIGN KEY (operation_id) REFERENCES inventory_v2_operation_headers (id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_inventory_v2_op_lines_product FOREIGN KEY (product_id) REFERENCES inventory_v2_products (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_v2_op_lines_variant FOREIGN KEY (variant_id) REFERENCES inventory_v2_variants (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_v2_op_lines_lot FOREIGN KEY (lot_id) REFERENCES inventory_v2_lots (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_v2_op_lines_source_loc FOREIGN KEY (source_location_id) REFERENCES inventory_v2_locations (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_v2_op_lines_target_loc FOREIGN KEY (target_location_id) REFERENCES inventory_v2_locations (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_v2_stock_ledger (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            operation_id BIGINT UNSIGNED NULL,
            operation_line_id BIGINT UNSIGNED NULL,
            movement_type ENUM('in','out','reserve','release') NOT NULL,
            product_id BIGINT UNSIGNED NOT NULL,
            variant_id BIGINT UNSIGNED NULL,
            lot_id BIGINT UNSIGNED NULL,
            warehouse_id INT UNSIGNED NOT NULL,
            location_id BIGINT UNSIGNED NOT NULL,
            quantity_on_hand_delta DECIMAL(18,3) NOT NULL DEFAULT 0,
            quantity_reserved_delta DECIMAL(18,3) NOT NULL DEFAULT 0,
            reference_type VARCHAR(50) NULL,
            reference_id VARCHAR(80) NULL,
            reference_code VARCHAR(120) NULL,
            actor_user_id INT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_inventory_v2_stock_ledger_product_created (product_id, created_at),
            CONSTRAINT fk_inventory_v2_stock_ledger_operation FOREIGN KEY (operation_id) REFERENCES inventory_v2_operation_headers (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_v2_stock_ledger_operation_line FOREIGN KEY (operation_line_id) REFERENCES inventory_v2_operation_lines (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_v2_stock_ledger_product FOREIGN KEY (product_id) REFERENCES inventory_v2_products (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_v2_stock_ledger_variant FOREIGN KEY (variant_id) REFERENCES inventory_v2_variants (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_v2_stock_ledger_lot FOREIGN KEY (lot_id) REFERENCES inventory_v2_lots (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_v2_stock_ledger_warehouse FOREIGN KEY (warehouse_id) REFERENCES inventory_v2_warehouses (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_v2_stock_ledger_location FOREIGN KEY (location_id) REFERENCES inventory_v2_locations (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_v2_stock_ledger_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $seedWarehouse = $pdo->prepare(
        'INSERT INTO inventory_v2_warehouses (warehouse_key, name, notes, is_active)
         VALUES (:warehouse_key, :name, :notes, 1)
         ON DUPLICATE KEY UPDATE name = VALUES(name), notes = VALUES(notes), is_active = VALUES(is_active)'
    );

    $seedWarehouse->execute([
        'warehouse_key' => 'v2-raw-input',
        'name' => 'انبار ورودی مواد',
        'notes' => 'Seeded by Inventory V2 foundation',
    ]);
    $seedWarehouse->execute([
        'warehouse_key' => 'v2-finished-output',
        'name' => 'انبار خروجی محصول',
        'notes' => 'Seeded by Inventory V2 foundation',
    ]);

    $seedLocations = $pdo->prepare(
        'INSERT INTO inventory_v2_locations (warehouse_id, parent_location_id, location_key, name, usage_type, notes, is_active)
         SELECT w.id, NULL, :location_key, :name, :usage_type, :notes, 1
         FROM inventory_v2_warehouses w
         WHERE w.warehouse_key = :warehouse_key
         ON DUPLICATE KEY UPDATE name = VALUES(name), usage_type = VALUES(usage_type), notes = VALUES(notes), is_active = VALUES(is_active)'
    );

    $seedLocations->execute([
        'warehouse_key' => 'v2-raw-input',
        'location_key' => 'stock',
        'name' => 'قفسه اصلی مواد',
        'usage_type' => 'internal',
        'notes' => 'Default location',
    ]);
    $seedLocations->execute([
        'warehouse_key' => 'v2-finished-output',
        'location_key' => 'stock',
        'name' => 'قفسه اصلی محصول',
        'usage_type' => 'internal',
        'notes' => 'Default location',
    ]);
}

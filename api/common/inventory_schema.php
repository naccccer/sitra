<?php
declare(strict_types=1);

function app_ensure_inventory_schema(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    app_ensure_users_table($pdo);

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_warehouses (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            warehouse_key VARCHAR(64) NOT NULL,
            name VARCHAR(120) NOT NULL,
            flow_type ENUM('raw_input','finished_output') NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_warehouses_key (warehouse_key),
            KEY idx_inventory_warehouses_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_items (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            sku VARCHAR(80) NULL,
            title VARCHAR(200) NOT NULL,
            category ENUM('raw_glass','processed_glass','hardware','consumable') NOT NULL,
            glass_width_mm DECIMAL(10,2) NULL,
            glass_height_mm DECIMAL(10,2) NULL,
            glass_thickness_mm DECIMAL(10,2) NULL,
            glass_color VARCHAR(80) NULL,
            base_unit VARCHAR(32) NOT NULL,
            secondary_unit VARCHAR(32) NULL,
            secondary_per_base DECIMAL(18,6) NULL,
            notes TEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_items_sku (sku),
            KEY idx_inventory_items_category (category),
            KEY idx_inventory_items_title (title),
            KEY idx_inventory_items_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_stock (
            warehouse_id INT UNSIGNED NOT NULL,
            item_id BIGINT UNSIGNED NOT NULL,
            quantity_base DECIMAL(18,3) NOT NULL DEFAULT 0,
            quantity_secondary DECIMAL(18,3) NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (warehouse_id, item_id),
            CONSTRAINT fk_inventory_stock_warehouse FOREIGN KEY (warehouse_id) REFERENCES inventory_warehouses (id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_inventory_stock_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_documents (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            doc_no VARCHAR(64) NOT NULL,
            doc_type ENUM('receipt','issue','transfer','adjustment') NOT NULL,
            status ENUM('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
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
            UNIQUE KEY uq_inventory_documents_doc_no (doc_no),
            KEY idx_inventory_documents_type_status (doc_type, status),
            KEY idx_inventory_documents_created_at (created_at),
            KEY idx_inventory_documents_reference_type (reference_type),
            CONSTRAINT fk_inventory_documents_source_warehouse FOREIGN KEY (source_warehouse_id) REFERENCES inventory_warehouses (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_documents_target_warehouse FOREIGN KEY (target_warehouse_id) REFERENCES inventory_warehouses (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_documents_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_documents_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_document_lines (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            document_id BIGINT UNSIGNED NOT NULL,
            item_id BIGINT UNSIGNED NOT NULL,
            quantity_base DECIMAL(18,3) NOT NULL,
            quantity_secondary DECIMAL(18,3) NOT NULL DEFAULT 0,
            unit_price BIGINT NULL,
            notes VARCHAR(255) NULL,
            PRIMARY KEY (id),
            KEY idx_inventory_document_lines_document (document_id),
            KEY idx_inventory_document_lines_item (item_id),
            CONSTRAINT fk_inventory_document_lines_document FOREIGN KEY (document_id) REFERENCES inventory_documents (id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_inventory_document_lines_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON UPDATE CASCADE ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_requests (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
            warehouse_id INT UNSIGNED NOT NULL,
            item_id BIGINT UNSIGNED NOT NULL,
            quantity_base DECIMAL(18,3) NOT NULL,
            quantity_secondary DECIMAL(18,3) NOT NULL DEFAULT 0,
            request_notes TEXT NULL,
            resolution_notes TEXT NULL,
            requested_by_user_id INT UNSIGNED NULL,
            approved_by_user_id INT UNSIGNED NULL,
            document_id BIGINT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_inventory_requests_status (status),
            KEY idx_inventory_requests_warehouse (warehouse_id),
            KEY idx_inventory_requests_item (item_id),
            KEY idx_inventory_requests_requested_by (requested_by_user_id),
            CONSTRAINT fk_inventory_requests_warehouse FOREIGN KEY (warehouse_id) REFERENCES inventory_warehouses (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_requests_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_requests_requested_by FOREIGN KEY (requested_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_requests_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_requests_document FOREIGN KEY (document_id) REFERENCES inventory_documents (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_count_sessions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            warehouse_id INT UNSIGNED NOT NULL,
            count_type ENUM('cycle','annual') NOT NULL,
            status ENUM('open','closed') NOT NULL DEFAULT 'open',
            started_by_user_id INT UNSIGNED NULL,
            closed_by_user_id INT UNSIGNED NULL,
            notes TEXT NULL,
            started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            closed_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_inventory_count_sessions_status (warehouse_id, status),
            KEY idx_inventory_count_sessions_type (count_type),
            CONSTRAINT fk_inventory_count_sessions_warehouse FOREIGN KEY (warehouse_id) REFERENCES inventory_warehouses (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_count_sessions_started_by FOREIGN KEY (started_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_inventory_count_sessions_closed_by FOREIGN KEY (closed_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS inventory_count_lines (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            session_id BIGINT UNSIGNED NOT NULL,
            item_id BIGINT UNSIGNED NOT NULL,
            system_quantity_base DECIMAL(18,3) NOT NULL DEFAULT 0,
            system_quantity_secondary DECIMAL(18,3) NOT NULL DEFAULT 0,
            counted_quantity_base DECIMAL(18,3) NOT NULL DEFAULT 0,
            counted_quantity_secondary DECIMAL(18,3) NOT NULL DEFAULT 0,
            diff_quantity_base DECIMAL(18,3) NOT NULL DEFAULT 0,
            diff_quantity_secondary DECIMAL(18,3) NOT NULL DEFAULT 0,
            adjustment_document_id BIGINT UNSIGNED NULL,
            notes TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_inventory_count_lines_session_item (session_id, item_id),
            KEY idx_inventory_count_lines_item (item_id),
            CONSTRAINT fk_inventory_count_lines_session FOREIGN KEY (session_id) REFERENCES inventory_count_sessions (id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_inventory_count_lines_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON UPDATE CASCADE ON DELETE RESTRICT,
            CONSTRAINT fk_inventory_count_lines_adjustment_document FOREIGN KEY (adjustment_document_id) REFERENCES inventory_documents (id) ON UPDATE CASCADE ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $seed = $pdo->prepare(
        'INSERT INTO inventory_warehouses (warehouse_key, name, flow_type, is_active)
         VALUES (:warehouse_key, :name, :flow_type, 1)
         ON DUPLICATE KEY UPDATE name = VALUES(name), flow_type = VALUES(flow_type), is_active = VALUES(is_active)'
    );

    $seed->execute([
        'warehouse_key' => 'raw-input',
        'name' => 'انبار ورودی جام',
        'flow_type' => 'raw_input',
    ]);

    $seed->execute([
        'warehouse_key' => 'finished-output',
        'name' => 'انبار خروجی محصول',
        'flow_type' => 'finished_output',
    ]);
}

-- Sitra backend schema for XAMPP MySQL/MariaDB
-- Import this file in phpMyAdmin after creating the database.

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','manager','sales','production','inventory') NOT NULL DEFAULT 'manager',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) NOT NULL,
    setting_value LONGTEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_code VARCHAR(64) NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    order_date VARCHAR(40) NOT NULL,
    total BIGINT NOT NULL DEFAULT 0,
    status ENUM('pending','processing','delivered','archived') NOT NULL DEFAULT 'pending',
    items_json LONGTEXT NOT NULL,
    order_meta_json LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_orders_status (status),
    KEY idx_orders_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_lines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    line_no INT UNSIGNED NOT NULL,
    order_row_key VARCHAR(64) NOT NULL COMMENT 'Format {order_number}-{row}, example: 1025-3',
    barcode_value VARCHAR(128) GENERATED ALWAYS AS (order_row_key) STORED,
    requires_drilling TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Label alert trigger (black inverted)',
    template_public_slug VARCHAR(180) NULL,
    public_template_url VARCHAR(512) NULL COMMENT 'Absolute or relative public URL for QR code',
    qr_payload_url VARCHAR(512) GENERATED ALWAYS AS (
        COALESCE(NULLIF(public_template_url, ''), CONCAT('/templates/public/', template_public_slug))
    ) STORED,
    item_snapshot_json LONGTEXT NOT NULL,
    width_mm INT UNSIGNED NULL,
    height_mm INT UNSIGNED NULL,
    qty INT UNSIGNED NOT NULL DEFAULT 1,
    unit_price BIGINT NOT NULL DEFAULT 0,
    line_total BIGINT NOT NULL DEFAULT 0,
    production_release_status ENUM('not_released','released') NOT NULL DEFAULT 'not_released',
    label_print_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_label_printed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_order_lines_order_row_key (order_row_key),
    UNIQUE KEY uq_order_lines_order_line (order_id, line_no),
    KEY idx_order_lines_order_id (order_id),
    KEY idx_order_lines_release_status (production_release_status),
    KEY idx_order_lines_drilling (requires_drilling),
    KEY idx_order_lines_template_slug (template_public_slug),
    CONSTRAINT fk_order_lines_order FOREIGN KEY (order_id) REFERENCES orders (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS production_work_orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    work_order_code VARCHAR(64) NOT NULL,
    order_line_id BIGINT UNSIGNED NOT NULL,
    order_row_key VARCHAR(64) NOT NULL COMMENT 'Copied from order_lines.order_row_key for fast scan/reprint',
    requires_drilling TINYINT(1) NOT NULL DEFAULT 0,
    public_template_url VARCHAR(512) NULL,
    qr_payload_url VARCHAR(512) GENERATED ALWAYS AS (
        COALESCE(NULLIF(public_template_url, ''), CONCAT('/templates/public/', order_row_key))
    ) STORED,
    status ENUM('queued','cutting','drilling','tempering','packing','completed','blocked','cancelled') NOT NULL DEFAULT 'queued',
    priority TINYINT UNSIGNED NOT NULL DEFAULT 3,
    station_key VARCHAR(64) NULL,
    planned_start_at DATETIME NULL,
    planned_end_at DATETIME NULL,
    completed_at DATETIME NULL,
    label_print_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_label_printed_at DATETIME NULL,
    notes VARCHAR(500) NULL,
    created_by_user_id INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_production_work_order_code (work_order_code),
    UNIQUE KEY uq_production_work_orders_order_line (order_line_id),
    KEY idx_production_work_orders_status (status),
    KEY idx_production_work_orders_order_line (order_line_id),
    KEY idx_production_work_orders_order_row_key (order_row_key),
    KEY idx_production_work_orders_drilling (requires_drilling),
    KEY idx_production_work_orders_station (station_key),
    CONSTRAINT fk_production_work_orders_order_line FOREIGN KEY (order_line_id) REFERENCES order_lines (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_production_work_orders_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS production_work_order_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    work_order_id BIGINT UNSIGNED NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    from_status VARCHAR(40) NULL,
    to_status VARCHAR(40) NULL,
    payload_json LONGTEXT NULL,
    note VARCHAR(500) NULL,
    actor_user_id INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_production_events_work_order (work_order_id),
    KEY idx_production_events_type_created (event_type, created_at),
    KEY idx_production_events_actor_created (actor_user_id, created_at),
    CONSTRAINT fk_production_events_work_order FOREIGN KEY (work_order_id) REFERENCES production_work_orders (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_production_events_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sku VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    material_type VARCHAR(80) NOT NULL DEFAULT 'glass',
    thickness_mm DECIMAL(6,2) NULL,
    color VARCHAR(80) NULL,
    unit ENUM('sheet','sqm','piece','kg') NOT NULL DEFAULT 'piece',
    reorder_point DECIMAL(14,3) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_items_sku (sku),
    KEY idx_inventory_items_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_stock_reservations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reservation_code VARCHAR(64) NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    order_line_id BIGINT UNSIGNED NULL,
    order_row_key VARCHAR(64) NULL,
    work_order_id BIGINT UNSIGNED NULL,
    qty_reserved DECIMAL(14,3) NOT NULL,
    qty_released DECIMAL(14,3) NOT NULL DEFAULT 0,
    qty_consumed DECIMAL(14,3) NOT NULL DEFAULT 0,
    status ENUM('active','released','consumed','cancelled') NOT NULL DEFAULT 'active',
    note VARCHAR(500) NULL,
    created_by_user_id INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_reservation_code (reservation_code),
    KEY idx_inventory_reservations_item (item_id),
    KEY idx_inventory_reservations_status (status),
    KEY idx_inventory_reservations_order_line (order_line_id),
    KEY idx_inventory_reservations_order_row_key (order_row_key),
    KEY idx_inventory_reservations_work_order (work_order_id),
    CONSTRAINT fk_inventory_reservations_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_reservations_order_line FOREIGN KEY (order_line_id) REFERENCES order_lines (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_inventory_reservations_work_order FOREIGN KEY (work_order_id) REFERENCES production_work_orders (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_inventory_reservations_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_stock_ledger (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    item_id BIGINT UNSIGNED NOT NULL,
    movement_type ENUM('in','out','adjust_plus','adjust_minus','reserve','release','consume') NOT NULL,
    qty_delta DECIMAL(14,3) NOT NULL,
    balance_after DECIMAL(14,3) NULL,
    reference_type VARCHAR(40) NULL,
    reference_id VARCHAR(80) NULL,
    reservation_id BIGINT UNSIGNED NULL,
    order_line_id BIGINT UNSIGNED NULL,
    order_row_key VARCHAR(64) NULL,
    work_order_id BIGINT UNSIGNED NULL,
    note VARCHAR(500) NULL,
    actor_user_id INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_inventory_ledger_item_created (item_id, created_at),
    KEY idx_inventory_ledger_movement (movement_type),
    KEY idx_inventory_ledger_order_line (order_line_id),
    KEY idx_inventory_ledger_order_row_key (order_row_key),
    KEY idx_inventory_ledger_work_order (work_order_id),
    KEY idx_inventory_ledger_reservation (reservation_id),
    CONSTRAINT fk_inventory_ledger_item FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_ledger_reservation FOREIGN KEY (reservation_id) REFERENCES inventory_stock_reservations (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_inventory_ledger_order_line FOREIGN KEY (order_line_id) REFERENCES order_lines (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_inventory_ledger_work_order FOREIGN KEY (work_order_id) REFERENCES production_work_orders (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_inventory_ledger_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (username, password, role)
VALUES
    ('admin', '$2y$10$ril0ig/MBvoyVsmOaNYUNOucfIgRc/CwTWbFaTxNnjRad6AYzuD7C', 'admin')
ON DUPLICATE KEY UPDATE
    password = VALUES(password),
    role = VALUES(role);

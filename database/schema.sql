-- Sitra backend schema for XAMPP MySQL/MariaDB
-- Import this file in phpMyAdmin after creating the database.

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','manager','sales') NOT NULL DEFAULT 'manager',
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

CREATE TABLE IF NOT EXISTS module_registry (
    module_key VARCHAR(64) NOT NULL,
    label VARCHAR(120) NOT NULL,
    phase VARCHAR(40) NOT NULL DEFAULT 'active',
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    is_protected TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 100,
    updated_by_user_id INT UNSIGNED NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (module_key),
    KEY idx_module_registry_enabled (is_enabled),
    KEY idx_module_registry_sort (sort_order),
    CONSTRAINT fk_module_registry_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
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
    UNIQUE KEY uq_orders_order_code (order_code),
    KEY idx_orders_status (status),
    KEY idx_orders_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_request_idempotency (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    client_request_id VARCHAR(64) NOT NULL,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(120) NOT NULL,
    actor_user_id VARCHAR(64) NULL,
    order_id BIGINT UNSIGNED NULL,
    response_json LONGTEXT NOT NULL,
    status_code SMALLINT UNSIGNED NOT NULL DEFAULT 200,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_order_request_idempotency_client_request_id (client_request_id),
    KEY idx_order_request_idempotency_actor_created (actor_user_id, created_at),
    KEY idx_order_request_idempotency_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO module_registry (module_key, label, phase, is_enabled, is_protected, sort_order)
VALUES
    ('auth', 'Auth', 'active', 1, 1, 10),
    ('users-access', 'Users Access', 'active', 1, 1, 20),
    ('sales', 'Sales', 'active', 1, 0, 30),
    ('master-data', 'Master Data', 'active', 1, 0, 40)
ON DUPLICATE KEY UPDATE
    label = VALUES(label),
    phase = VALUES(phase),
    is_protected = VALUES(is_protected),
    sort_order = VALUES(sort_order);

INSERT INTO users (username, password, role)
VALUES
    ('admin', '$2y$10$ril0ig/MBvoyVsmOaNYUNOucfIgRc/CwTWbFaTxNnjRad6AYzuD7C', 'admin')
ON DUPLICATE KEY UPDATE
    password = VALUES(password),
    role = VALUES(role);

-- Sitra backend schema for XAMPP MySQL/MariaDB
-- Import this file in phpMyAdmin after creating the database.

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','manager') NOT NULL DEFAULT 'manager',
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

INSERT INTO users (username, password, role)
VALUES
    ('admin', '$2y$10$ril0ig/MBvoyVsmOaNYUNOucfIgRc/CwTWbFaTxNnjRad6AYzuD7C', 'admin')
ON DUPLICATE KEY UPDATE
    password = VALUES(password),
    role = VALUES(role);

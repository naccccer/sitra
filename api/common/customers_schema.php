<?php
declare(strict_types=1);

function app_ensure_customers_table(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS customers (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            full_name VARCHAR(200) NOT NULL,
            customer_code VARCHAR(40) NULL,
            customer_type ENUM('individual','company') NOT NULL DEFAULT 'individual',
            company_name VARCHAR(200) NULL,
            default_phone VARCHAR(40) NULL,
            national_id VARCHAR(40) NULL,
            economic_code VARCHAR(40) NULL,
            email VARCHAR(190) NULL,
            province VARCHAR(120) NULL,
            city VARCHAR(120) NULL,
            credit_limit BIGINT UNSIGNED NULL,
            payment_term_days INT UNSIGNED NULL,
            address TEXT NULL,
            notes TEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_customers_name (full_name),
            UNIQUE KEY uq_customers_customer_code (customer_code),
            KEY idx_customers_customer_type (customer_type),
            KEY idx_customers_province_city (province, city),
            KEY idx_customers_default_phone (default_phone),
            KEY idx_customers_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}
function app_ensure_customer_crm_columns(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    app_ensure_customers_table($pdo);

    $additions = [
        "customer_code VARCHAR(40) NULL AFTER full_name",
        "customer_type ENUM('individual','company') NOT NULL DEFAULT 'individual' AFTER customer_code",
        "company_name VARCHAR(200) NULL AFTER customer_type",
        "national_id VARCHAR(40) NULL AFTER company_name",
        "economic_code VARCHAR(40) NULL AFTER national_id",
        "email VARCHAR(190) NULL AFTER economic_code",
        "province VARCHAR(120) NULL AFTER email",
        "city VARCHAR(120) NULL AFTER province",
        "credit_limit BIGINT UNSIGNED NULL AFTER city",
        "payment_term_days INT UNSIGNED NULL AFTER credit_limit",
    ];

    foreach ($additions as $definition) {
        $column = explode(' ', $definition, 2)[0];
        if (!app_schema_column_exists($pdo, 'customers', $column)) {
            try {
                $pdo->exec("ALTER TABLE customers ADD COLUMN {$definition}");
            } catch (Throwable $e) {
                // Keep runtime compatibility if alter fails.
            }
        }
    }

    try {
        $pdo->exec(
            "UPDATE customers
             SET customer_code = CONCAT('C', LPAD(id, 6, '0'))
             WHERE customer_code IS NULL OR customer_code = ''"
        );
    } catch (Throwable $e) {
        // Keep runtime compatibility if backfill fails.
    }

    try {
        if (!app_schema_index_exists($pdo, 'customers', 'uq_customers_customer_code')) {
            $pdo->exec("ALTER TABLE customers ADD UNIQUE KEY uq_customers_customer_code (customer_code)");
        }
        if (!app_schema_index_exists($pdo, 'customers', 'idx_customers_customer_type')) {
            $pdo->exec("ALTER TABLE customers ADD KEY idx_customers_customer_type (customer_type)");
        }
        if (!app_schema_index_exists($pdo, 'customers', 'idx_customers_province_city')) {
            $pdo->exec("ALTER TABLE customers ADD KEY idx_customers_province_city (province, city)");
        }
    } catch (Throwable $e) {
    }
}

function app_ensure_customer_projects_table(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    app_ensure_customers_table($pdo);
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS customer_projects (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            customer_id BIGINT UNSIGNED NOT NULL,
            name VARCHAR(200) NOT NULL,
            notes TEXT NULL,
            is_default TINYINT(1) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_customer_projects_customer (customer_id),
            KEY idx_customer_projects_default (customer_id, is_default),
            KEY idx_customer_projects_active (is_active),
            CONSTRAINT fk_customer_projects_customer
                FOREIGN KEY (customer_id) REFERENCES customers (id)
                ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function app_ensure_customer_project_contacts_table(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    app_ensure_customer_projects_table($pdo);
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS customer_project_contacts (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            project_id BIGINT UNSIGNED NOT NULL,
            label VARCHAR(120) NOT NULL DEFAULT 'main',
            phone VARCHAR(40) NOT NULL,
            is_primary TINYINT(1) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 100,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_customer_project_contacts_project (project_id),
            KEY idx_customer_project_contacts_primary (project_id, is_primary),
            KEY idx_customer_project_contacts_phone (phone),
            CONSTRAINT fk_customer_project_contacts_project
                FOREIGN KEY (project_id) REFERENCES customer_projects (id)
                ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function app_ensure_orders_customer_columns(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    app_ensure_orders_table($pdo);
    app_ensure_customer_project_contacts_table($pdo);

    try {
        if (!app_schema_column_exists($pdo, 'orders', 'customer_id')) {
            $pdo->exec("ALTER TABLE orders ADD COLUMN customer_id BIGINT UNSIGNED NULL AFTER phone");
        }
        if (!app_schema_column_exists($pdo, 'orders', 'project_id')) {
            $pdo->exec("ALTER TABLE orders ADD COLUMN project_id BIGINT UNSIGNED NULL AFTER customer_id");
        }
        if (!app_schema_column_exists($pdo, 'orders', 'project_contact_id')) {
            $pdo->exec("ALTER TABLE orders ADD COLUMN project_contact_id BIGINT UNSIGNED NULL AFTER project_id");
        }
    } catch (Throwable $e) {
        // Keep runtime compatibility if alter fails.
    }

    try {
        if (!app_schema_index_exists($pdo, 'orders', 'idx_orders_customer_id')) {
            $pdo->exec("ALTER TABLE orders ADD KEY idx_orders_customer_id (customer_id)");
        }
        if (!app_schema_index_exists($pdo, 'orders', 'idx_orders_project_id')) {
            $pdo->exec("ALTER TABLE orders ADD KEY idx_orders_project_id (project_id)");
        }
        if (!app_schema_index_exists($pdo, 'orders', 'idx_orders_project_contact_id')) {
            $pdo->exec("ALTER TABLE orders ADD KEY idx_orders_project_contact_id (project_contact_id)");
        }
    } catch (Throwable $e) {
        // Keep runtime compatibility if alter fails.
    }

    try {
        if (!app_schema_fk_exists($pdo, 'orders', 'fk_orders_customer_id')) {
            $pdo->exec(
                "ALTER TABLE orders
                 ADD CONSTRAINT fk_orders_customer_id
                 FOREIGN KEY (customer_id) REFERENCES customers (id)
                 ON UPDATE CASCADE ON DELETE SET NULL"
            );
        }
    } catch (Throwable $e) {
        // Keep runtime compatibility if alter fails.
    }

    try {
        if (!app_schema_fk_exists($pdo, 'orders', 'fk_orders_project_id')) {
            $pdo->exec(
                "ALTER TABLE orders
                 ADD CONSTRAINT fk_orders_project_id
                 FOREIGN KEY (project_id) REFERENCES customer_projects (id)
                 ON UPDATE CASCADE ON DELETE SET NULL"
            );
        }
    } catch (Throwable $e) {
        // Keep runtime compatibility if alter fails.
    }

    try {
        if (!app_schema_fk_exists($pdo, 'orders', 'fk_orders_project_contact_id')) {
            $pdo->exec(
                "ALTER TABLE orders
                 ADD CONSTRAINT fk_orders_project_contact_id
                 FOREIGN KEY (project_contact_id) REFERENCES customer_project_contacts (id)
                 ON UPDATE CASCADE ON DELETE SET NULL"
            );
        }
    } catch (Throwable $e) {
        // Keep runtime compatibility if alter fails.
    }
}

function app_ensure_customers_domain_schema(PDO $pdo): void
{
    app_ensure_customer_crm_columns($pdo);
    app_ensure_customer_project_contacts_table($pdo);
    app_ensure_orders_customer_columns($pdo);
}

function app_orders_customer_id_column(PDO $pdo): ?string
{
    static $detected = false;
    if ($detected !== false) {
        return $detected === '' ? null : $detected;
    }
    $detected = app_find_orders_column($pdo, ['customer_id']) ?? '';
    return $detected === '' ? null : $detected;
}

function app_orders_project_id_column(PDO $pdo): ?string
{
    static $detected = false;
    if ($detected !== false) {
        return $detected === '' ? null : $detected;
    }
    $detected = app_find_orders_column($pdo, ['project_id']) ?? '';
    return $detected === '' ? null : $detected;
}

function app_orders_project_contact_id_column(PDO $pdo): ?string
{
    static $detected = false;
    if ($detected !== false) {
        return $detected === '' ? null : $detected;
    }
    $detected = app_find_orders_column($pdo, ['project_contact_id']) ?? '';
    return $detected === '' ? null : $detected;
}

<?php
declare(strict_types=1);

function app_ensure_users_table(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    $ensured = true;

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS users (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            username VARCHAR(64) NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin','manager','sales') NOT NULL DEFAULT 'manager',
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            deleted_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_users_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'is_active'");
        if (!$stmt || !$stmt->fetch()) {
            $pdo->exec("ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role");
        }
    } catch (Throwable $e) {
        // Preserve runtime compatibility even if alter is not permitted.
    }

    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'full_name'");
        if (!$stmt || !$stmt->fetch()) {
            $pdo->exec("ALTER TABLE users ADD COLUMN full_name VARCHAR(120) NULL AFTER username");
            $pdo->exec("UPDATE users SET full_name = username WHERE full_name IS NULL OR TRIM(full_name) = ''");
            $pdo->exec("ALTER TABLE users MODIFY COLUMN full_name VARCHAR(120) NOT NULL");
        } else {
            $pdo->exec("UPDATE users SET full_name = username WHERE full_name IS NULL OR TRIM(full_name) = ''");
            $pdo->exec("ALTER TABLE users MODIFY COLUMN full_name VARCHAR(120) NOT NULL");
        }
    } catch (Throwable $e) {
        // Preserve runtime compatibility even if alter is not permitted.
    }

    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'job_title'");
        if (!$stmt || !$stmt->fetch()) {
            $pdo->exec("ALTER TABLE users ADD COLUMN job_title VARCHAR(120) NULL AFTER role");
        }
        $pdo->exec(
            "UPDATE users
             SET job_title = CASE role
                WHEN 'admin' THEN 'مالک سیستم'
                WHEN 'manager' THEN 'مدیر تولید'
                WHEN 'sales' THEN 'کارشناس فروش'
                ELSE NULL
             END
             WHERE job_title IS NULL OR TRIM(job_title) = ''"
        );
    } catch (Throwable $e) {
        // Preserve runtime compatibility even if alter is not permitted.
    }



    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'deleted_at'");
        if (!$stmt || !$stmt->fetch()) {
            $pdo->exec("ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER is_active");
        }
    } catch (Throwable $e) {
        // Preserve runtime compatibility even if alter is not permitted.
    }

    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'");
        $row = $stmt ? $stmt->fetch() : null;
        $type = strtolower((string)($row['Type'] ?? ''));
        $targetType = "enum('admin','manager','sales')";
        if ($type !== '' && $type !== $targetType) {
            $pdo->exec("UPDATE users SET role = 'sales' WHERE role NOT IN ('admin', 'manager', 'sales')");
            $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('admin','manager','sales') NOT NULL DEFAULT 'manager'");
        }
    } catch (Throwable $e) {
        // Preserve runtime compatibility even if alter is not permitted.
    }
}

function app_users_is_active_column(PDO $pdo): bool
{
    static $detected = null;
    if ($detected !== null) {
        return $detected;
    }

    try {
        app_ensure_users_table($pdo);
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'is_active'");
        if ($stmt && $stmt->fetch()) {
            $detected = true;
            return $detected;
        }
    } catch (Throwable $e) {
        // Fall through to queryable check.
    }

    $detected = app_column_is_queryable($pdo, 'users', 'is_active');
    return $detected;
}

function app_users_has_identity_columns(PDO $pdo): bool
{
    static $detected = null;
    if ($detected !== null) {
        return $detected;
    }

    try {
        app_ensure_users_table($pdo);
    } catch (Throwable $e) {
        // Fall through to queryable checks.
    }

    $hasFullName = app_column_is_queryable($pdo, 'users', 'full_name');
    $hasJobTitle = app_column_is_queryable($pdo, 'users', 'job_title');
    $detected = $hasFullName && $hasJobTitle;

    return $detected;
}


function app_profile_defaults(): array
{
    return [
        'brandName' => 'Sitra',
        'panelSubtitle' => 'پنل مدیریت سفارش',
        'invoiceTitleCustomer' => 'پیش‌فاکتور رسمی سفارش',
        'invoiceTitleFactory' => 'برگه سفارش کارگاهی',
        'logoPath' => '',
        'logoOriginalName' => '',
        'address' => 'مشهد، خین‌عرب، بین طرح چی 11 و 13، پرهام',
        'phones' => '۰۹۰۴۷۰۷۹۸۶۹ - ۰۹۱۵۸۷۸۸۸۴۶',
    ];
}

function app_normalize_profile($profile): array
{
    $defaults = app_profile_defaults();
    $source = is_array($profile) ? $profile : [];

    $brandName = trim((string)($source['brandName'] ?? $defaults['brandName']));
    $panelSubtitle = trim((string)($source['panelSubtitle'] ?? $defaults['panelSubtitle']));
    $invoiceTitleCustomer = trim((string)($source['invoiceTitleCustomer'] ?? $defaults['invoiceTitleCustomer']));
    $invoiceTitleFactory = trim((string)($source['invoiceTitleFactory'] ?? $defaults['invoiceTitleFactory']));
    $logoPath = trim((string)($source['logoPath'] ?? ''));
    $logoOriginalName = trim((string)($source['logoOriginalName'] ?? ''));
    $address = trim((string)($source['address'] ?? $defaults['address']));
    $phones = trim((string)($source['phones'] ?? $defaults['phones']));

    return [
        'brandName' => $brandName !== '' ? $brandName : $defaults['brandName'],
        'panelSubtitle' => $panelSubtitle !== '' ? $panelSubtitle : $defaults['panelSubtitle'],
        'invoiceTitleCustomer' => $invoiceTitleCustomer !== '' ? $invoiceTitleCustomer : $defaults['invoiceTitleCustomer'],
        'invoiceTitleFactory' => $invoiceTitleFactory !== '' ? $invoiceTitleFactory : $defaults['invoiceTitleFactory'],
        'logoPath' => $logoPath,
        'logoOriginalName' => $logoOriginalName,
        'address' => $address !== '' ? $address : $defaults['address'],
        'phones' => $phones !== '' ? $phones : $defaults['phones'],
    ];
}

function app_read_profile(PDO $pdo): array
{
    try {
        app_ensure_system_settings_table($pdo);
        $stmt = $pdo->prepare('SELECT setting_value FROM system_settings WHERE setting_key = :k LIMIT 1');
        $stmt->execute(['k' => 'profile']);
        $row = $stmt->fetch();
    } catch (Throwable $e) {
        return app_profile_defaults();
    }

    if (!$row || !isset($row['setting_value'])) {
        return app_profile_defaults();
    }

    $decoded = json_decode((string)$row['setting_value'], true);
    return app_normalize_profile($decoded);
}

function app_save_profile(PDO $pdo, array $profile): array
{
    $normalized = app_normalize_profile($profile);
    $profileJson = json_encode($normalized, JSON_UNESCAPED_UNICODE);
    if ($profileJson === false) {
        throw new RuntimeException('Profile serialization failed.');
    }

    app_ensure_system_settings_table($pdo);
    $stmt = $pdo->prepare('INSERT INTO system_settings (setting_key, setting_value) VALUES (:key, :value) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP');
    $stmt->execute([
        'key' => 'profile',
        'value' => $profileJson,
    ]);

    return $normalized;
}


function app_users_has_deleted_at_column(PDO $pdo): bool
{
    static $detected = null;
    if ($detected !== null) {
        return $detected;
    }

    try {
        app_ensure_users_table($pdo);
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'deleted_at'");
        if ($stmt && $stmt->fetch()) {
            $detected = true;
            return $detected;
        }
    } catch (Throwable $e) {
        // Fall through to queryable check.
    }

    $detected = app_column_is_queryable($pdo, 'users', 'deleted_at');
    return $detected;
}

function app_users_is_session_user_active(PDO $pdo, string $userId): bool
{
    $hasDeletedAt = app_users_has_deleted_at_column($pdo);
    $deletedSelect = $hasDeletedAt ? 'deleted_at' : 'NULL AS deleted_at';
    $stmt = $pdo->prepare('SELECT id, is_active, ' . $deletedSelect . ' FROM users WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $userId]);
    $row = $stmt->fetch();

    if (!$row) {
        return false;
    }

    if (((int)($row['is_active'] ?? 1)) !== 1) {
        return false;
    }

    return empty($row['deleted_at']);
}

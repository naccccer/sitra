<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

$username = isset($argv[1]) ? trim((string)$argv[1]) : 'admin';
$password = isset($argv[2]) ? (string)$argv[2] : 'admin123';

if ($username === '') {
    fwrite(STDERR, "Username cannot be empty.\n");
    exit(1);
}

if (strlen($password) < 6) {
    fwrite(STDERR, "Password must be at least 6 characters.\n");
    exit(1);
}

$pdo->exec(
    "CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        username VARCHAR(64) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','manager','sales','production','inventory') NOT NULL DEFAULT 'manager',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
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
    // Keep reset flow resilient even when alter permissions are limited.
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare(
    'INSERT INTO users (username, password, role, is_active)
     VALUES (:username, :password, :role, 1)
     ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role), is_active = VALUES(is_active)'
);
$stmt->execute([
    'username' => $username,
    'password' => $hash,
    'role' => 'admin',
]);

fwrite(STDOUT, "Admin credentials reset for user '{$username}'.\n");

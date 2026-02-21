<?php
$host = 'localhost';
$db   = 'naserzaf_glassdesign_db';
$user = 'naserzaf_glassdesign_db_user';
$pass = 'glassdesign789';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false, // برای امنیت بیشتر
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // در محیط واقعی، ارور رو لاگ کن و به کاربر فقط پیام کلی بده
    die(json_encode(['error' => 'Database connection failed.']));
}
?>
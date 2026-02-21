<?php
session_start(); // استارت سشن باید اولین خط باشه

// تنظیمات هدر برای React (CORS)
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:3000"); // آدرس دقیق React رو بده، با * سشن کار نمی‌کنه!
header("Access-Control-Allow-Credentials: true"); // این برای کار کردن Session بین ریکت و پی‌اچ‌پی واجبه
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// هندل کردن درخواست‌های Preflight ریکت
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/db.php';

// دریافت دیتای JSON
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'نام کاربری و رمز عبور الزامی است.']);
    exit;
}

// پیدا کردن کاربر (فرض می‌کنم جدول users ستون‌های username و password و role داره)
$stmt = $pdo->prepare("SELECT id, username, password, role FROM users WHERE username = :user LIMIT 1");
$stmt->execute(['user' => $username]);
$user = $stmt->fetch();

// مقایسه پسورد (فعلاً به صورت متن ساده طبق درخواست خودت)
if ($user && $password === $user['password']) {
    // لاگین موفق: ذخیره اطلاعات در Session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role'] = $user['role'];
    
    echo json_encode(['success' => true, 'role' => $user['role'], 'message' => 'لاگین موفقیت‌آمیز بود.']);
} else {
    // لاگین ناموفق
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'نام کاربری یا رمز عبور اشتباه است.']);
}
?>